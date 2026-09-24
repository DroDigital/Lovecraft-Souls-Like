import { describe, expect, it } from 'vitest';
import { getEntity } from '../src/data/registry';
import { COLOUR, DUNWICH, REALITY } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { strike } from '../src/systems/combat';
import { fightAction } from '../src/systems/fightActions';
import { inSight } from '../src/systems/insight';
import { candidates } from '../src/systems/lockOn';
import { lampsOf } from '../src/systems/reality';
import { bossGame, calm, engage } from './bossHelpers';
import { press, steps } from './helpers';
import { deathblow, kill, record, run } from './worldHelpers';

const lockable = (g: Parameters<typeof candidates>[0], id: number): boolean => candidates(g).some((c) => c.id === id);

describe('signature mechanics (spec §3E)', () => {
  it('the Colour Out of Space heals by draining the world of colour, until the world has none left', () => {
    expect(getEntity('colour_out_of_space')!.sprite!.outside).toBe(true); // drawn in a hue outside the palette
    const b = bossGame('colour_out_of_space');
    const { g, boss } = b;
    engage(b);
    calm(b);
    const h = g.ecs.c.health.get(boss)!;
    h.hp = h.max * 0.6;
    const hp = h.hp;
    steps(g, 60);
    expect(h.hp - hp).toBeCloseTo(COLOUR.heal, 0);
    expect(g.reality.saturation).toBeCloseTo(1 - COLOUR.drain, 3);
    g.reality.saturation = 0;
    const drained = h.hp;
    steps(g, 60);
    expect(h.hp).toBe(drained);
    kill(g, boss);
    expect(g.reality.saturation).toBe(1);
  });

  it('the Colour’s drain is undone when the fight begins anew', () => {
    const b = bossGame('colour_out_of_space');
    engage(b);
    calm(b);
    b.g.ecs.c.health.get(b.boss)!.hp *= 0.5;
    steps(b.g, 120);
    expect(b.g.reality.saturation).toBeLessThan(1);
    strike(b.g, b.boss, b.g.player.id, deathblow);
    run(b.g, 200);
    expect(b.g.reality.saturation).toBe(1);
  });

  it('the Dunwich Horror is unseen until the Powder of Ibn Ghazi shows it, three doses', () => {
    const b = bossGame('dunwich_horror', undefined, 12);
    const { g, boss } = b;
    expect(lockable(g, boss)).toBe(false);
    expect(inSight(g, boss)).toBe(false);
    engage(b);
    calm(b);
    const shown = record(g, 'Revealed');
    expect(fightAction(g)?.label).toBe(`scatter the Powder of Ibn Ghazi (${DUNWICH.powder})`);
    steps(g, 1, press('interact'));
    expect(shown).toEqual([{ entity: boss, doses: DUNWICH.powder - 1 }]);
    expect(g.ecs.c.actor.get(g.player.id)!.move).toBe('scatter');
    expect(lockable(g, boss)).toBe(true);
    steps(g, DUNWICH.reveal);
    expect(lockable(g, boss)).toBe(false);
    for (let i = 1; i < DUNWICH.powder; i++) {
      steps(g, 40);
      steps(g, 1, press('interact'));
    }
    steps(g, 40);
    expect(shown).toHaveLength(DUNWICH.powder);
    expect(fightAction(g)).toBeNull(); // the sprayer is empty
  });

  it('no blade finishes the Dunwich Horror: only the incantation, chanted to its end', () => {
    const b = bossGame('dunwich_horror', undefined, 12);
    const { g, boss, fight } = b;
    engage(b);
    calm(b);
    const h = g.ecs.c.health.get(boss)!;
    h.hp = h.max * 0.1;
    steps(g, 1);
    expect(fight.phase).toBe(fight.script.phases.length - 1);
    strike(g, g.player.id, boss, deathblow);
    expect(h.hp).toBe(1);
    expect(fightAction(g)?.label).toBe('chant the incantation');
    steps(g, 1, press('interact'));
    steps(g, 60);
    startMove(g.ecs.c.actor.get(g.player.id)!, 'stagger'); // broken off
    steps(g, 200);
    expect(h.hp).toBe(1);
    const deaths = record(g, 'Died');
    steps(g, 1, press('interact'));
    steps(g, g.ecs.c.actor.get(g.player.id)!.moves.chant.frames);
    expect(deaths).toEqual([expect.objectContaining({ entity: boss, killer: g.player.id })]);
    expect(g.ecs.c.unseen.has(boss)).toBe(false); // seen as it dies
  });

  it('the Haunter of the Dark fights among lamps it must snuff, which the investigator defends', () => {
    const b = bossGame('haunter_of_the_dark');
    const { g, fight } = b;
    engage(b);
    const lamps = lampsOf(g, fight);
    expect(lamps).toHaveLength(REALITY.lamps);
    expect(lamps.every((l) => g.ecs.c.prop.get(l)!.lit)).toBe(true);
    expect(g.reality.hooks.has('light_dependency')).toBe(true);
    const changes = record(g, 'LampChanged');
    for (let i = 0; i < 1800 && !changes.length; i++) steps(g, 1); // it dives, grabs, and snuffs the light
    expect(changes[0]?.lit).toBe(false);
  });
});
