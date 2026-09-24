import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { emptyInput, type InputFrame } from '../src/core/input';
import { ph, phases } from '../src/data/entities/kit';
import { REALITY } from '../src/data/tuning';
import { strike } from '../src/systems/combat';
import { fightAction } from '../src/systems/fightActions';
import { lampsOf } from '../src/systems/reality';
import { hookFight } from './bossHelpers';
import { place, press, steps } from './helpers';
import { record } from './worldHelpers';

const walk = (moveY: number): InputFrame => ({ ...emptyInput(), moveY });

describe('reality hooks (spec §3E)', () => {
  it('arena_reconnect: walking out of one side brings the investigator in at the other', () => {
    const { g } = hookFight(['arena_reconnect']);
    const rewired = record(g, 'Rewired');
    place(g, g.player.id, 0, -21.5, Math.PI);
    steps(g, 1);
    expect(g.ecs.c.transform.get(g.player.id)!.pos.z).toBeCloseTo(22 - REALITY.reconnectIn, 1);
    expect(rewired).toHaveLength(1);
  });

  it('darkness: the light fails while it holds, and comes back after', () => {
    const b = hookFight(['darkness']);
    steps(b.g, 100);
    expect(b.g.reality.darkness).toBe(1);
    b.fight.script = phases(ph(1, { sweep: 1 }));
    steps(b.g, 100);
    expect(b.g.reality.darkness).toBe(0);
  });

  it('flood: water rises over the arena and drags at the investigator', () => {
    const stride = (hooks: 'flood'[]): number => {
      const { g } = hookFight(hooks);
      steps(g, 100);
      place(g, g.player.id, -14, -2, 0);
      g.camera.yaw = 0;
      steps(g, 30, walk(1));
      return distXZ(g.ecs.c.transform.get(g.player.id)!.pos, { x: -14, z: -2 });
    };
    const b = hookFight(['flood']);
    steps(b.g, 100);
    expect(b.g.reality.flood).toBe(1);
    expect(b.g.reality.floodAt).toMatchObject({ x: 0, z: 0, radius: 22 });
    expect(stride(['flood']) / stride([])).toBeCloseTo(1 - REALITY.floodSlow, 1);
  });

  it('camera_warp: the view drifts on its own', () => {
    const drift = (warp: boolean): number => {
      const { g } = hookFight(warp ? ['camera_warp'] : []);
      const yaw = g.camera.yaw;
      steps(g, 240);
      return Math.abs(g.camera.yaw - yaw);
    };
    expect(drift(false)).toBe(0);
    expect(drift(true)).toBeGreaterThan(0.05);
  });

  it('decoys: false copies hunt beside the boss, two at most, and vanish when struck', () => {
    const { g, boss, fight } = hookFight(['decoys']);
    steps(g, 1);
    const decoys = (): number[] => fight.minions.filter((m) => g.ecs.c.phantom.get(m)?.decoy);
    const [d] = decoys();
    expect(g.ecs.c.model.get(d)).toBe(g.ecs.c.model.get(boss));
    for (const store of [g.ecs.c.fight, g.ecs.c.dread, g.ecs.c.home]) expect(store.has(d)).toBe(false);
    expect(g.ecs.c.combatant.get(d)!.bounty).toBe(0);
    let most = 0;
    for (let i = 0; i < 1500; i++) {
      steps(g, 1);
      most = Math.max(most, decoys().length);
    }
    expect(most).toBe(REALITY.decoys);
    const [e] = decoys();
    strike(g, g.player.id, e, { damage: 1, poise: 0, guard: 0, hitstop: 2, parryable: false, interrupts: false });
    expect(g.ecs.c.transform.has(e)).toBe(false);
  });

  it('time_skip: the boss is suddenly elsewhere, its blow already falling', () => {
    const { g, boss } = hookFight(['time_skip']);
    const skips = record(g, 'TimeSkipped');
    steps(g, REALITY.skipEvery[0]);
    expect(skips).toEqual([{ entity: boss }]);
    const a = g.ecs.c.actor.get(boss)!;
    expect(a.move).toBe('sweep');
    expect(a.moves.sweep.hit!.window[0] - a.frame).toBeLessThanOrEqual(REALITY.skipLead);
    expect(distXZ(g.ecs.c.transform.get(boss)!.pos, g.ecs.c.transform.get(g.player.id)!.pos)).toBeLessThan(3);
  });

  it('control_swap: the body is stolen for a while and walks to the boss, whatever the investigator wants', () => {
    const { g, boss } = hookFight(['control_swap']);
    const thefts = record(g, 'BodyStolen');
    const gap = (): number => distXZ(g.ecs.c.transform.get(boss)!.pos, g.ecs.c.transform.get(g.player.id)!.pos);
    steps(g, REALITY.swapFirst, walk(0));
    expect(thefts).toHaveLength(1);
    const before = gap();
    steps(g, 60, walk(-1)); // the investigator tries to back away
    expect(gap()).toBeLessThan(before);
    steps(g, REALITY.swapFrames, walk(0));
    expect(g.reality.stolen).toBe(0);
    const after = gap();
    steps(g, 30, walk(-1));
    expect(gap()).toBeGreaterThan(after);
  });

  it('light_dependency: the boss burns in a lamp’s light and shrugs off blows in the dark; darkness snuffs a lamp, E relights it', () => {
    const { g, boss, fight } = hookFight(['light_dependency'], 'lamps');
    const lamps = lampsOf(g, fight);
    expect(lamps).toHaveLength(REALITY.lamps);
    const h = g.ecs.c.health.get(boss)!;
    place(g, boss, 0, -12, 0);
    const hp = h.hp;
    steps(g, 2);
    expect(h.ward).toBe(REALITY.inLight);
    expect(h.hp).toBeLessThan(hp);
    place(g, boss, 0, 0, 0);
    steps(g, 1);
    expect(h.ward).toBe(REALITY.inDark);
    const before = h.hp;
    strike(g, g.player.id, boss, { damage: 100, poise: 0, guard: 0, hitstop: 2, parryable: false, interrupts: false });
    expect(before - h.hp).toBeCloseTo(100 * REALITY.inDark, 0);
    const changes = record(g, 'LampChanged');
    place(g, boss, 0, -12, 0);
    g.events.emit('Darkened', { by: boss });
    const snuffed = changes[0].lamp;
    expect(g.ecs.c.prop.get(snuffed)!.lit).toBe(false);
    const at = g.ecs.c.transform.get(snuffed)!.pos;
    place(g, g.player.id, at.x + 1.5, at.z, 0);
    expect(fightAction(g)?.label).toBe('relight the lamp');
    steps(g, 1, press('interact'));
    expect(g.ecs.c.prop.get(snuffed)!.lit).toBe(true);
    for (const l of lamps) g.ecs.c.prop.get(l)!.lit = false;
    steps(g, 100);
    expect(g.reality.darkness).toBe(1);
  });

  it('hidden_platforms: the void hurts body and mind, except on a platform the enlightened can see', () => {
    const hurt = (x: number, z: number, insight: number): number => {
      const { g } = hookFight(['hidden_platforms']);
      g.mind.insight = insight;
      place(g, g.player.id, x, z, 0);
      const h = g.ecs.c.health.get(g.player.id)!;
      steps(g, 61);
      return h.max - h.hp;
    };
    expect(hurt(4, -3, 1)).toBeGreaterThanOrEqual(2 * REALITY.voidDamage);
    expect(hurt(0.5, 0.5, 1)).toBe(0);
    expect(hurt(0.5, 0.5, 0)).toBeGreaterThan(0);
  });

  it('petrify_buildup: its sight turns the investigator to stone, unless they break line of sight', () => {
    const b = hookFight(['petrify_buildup']);
    const stone = record(b.g, 'Petrified');
    steps(b.g, 120);
    expect(b.g.reality.petrify).toBeCloseTo(120 * REALITY.petrifyRate, 1);
    steps(b.g, 130);
    expect(stone).toHaveLength(1);
    expect(b.g.ecs.c.actor.get(b.g.player.id)!.move).toBe('death');
    const hidden = hookFight(['petrify_buildup']);
    place(hidden.g, hidden.boss, -8, -4, 0);
    place(hidden.g, hidden.g.player.id, -8, 6, Math.PI);
    steps(hidden.g, 60);
    expect(hidden.g.reality.petrify).toBe(0);
  });
});
