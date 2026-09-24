import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { emptyInput, type InputFrame } from '../src/core/input';
import { AZATHOTH, SHUB, YOG } from '../src/data/tuning';
import { strike } from '../src/systems/combat';
import { fightAction } from '../src/systems/fightActions';
import { createWorldGame } from '../src/systems/game';
import { setSanity } from '../src/systems/sanity';
import { rootsOf } from '../src/systems/signatures/shub';
import { borrowed } from '../src/systems/signatures/nyarlathotep';
import { spheresOf } from '../src/systems/signatures/yogSothoth';
import { worldLayout } from '../src/world/placements';
import { bossGame, calm, engage } from './bossHelpers';
import { place, press, steps } from './helpers';
import { creatureOf, deathblow, goTo, kill, record, run } from './worldHelpers';

const blow = (damage: number) => ({ damage, poise: 0, guard: 0, hitstop: 2, parryable: false, interrupts: false });

describe('the outer gods (spec §3E)', () => {
  it('Shub-Niggurath bears the Thousand Young from its roots, shielded while any stands, until they are cut down', () => {
    const b = bossGame('shub_niggurath', undefined, 14);
    const { g, boss, fight } = b;
    g.ecs.c.health.get(g.player.id)!.immortal = true; // the Young hunt the investigator all the while
    engage(b);
    calm(b);
    const roots = rootsOf(g, fight);
    expect(roots).toHaveLength(SHUB.roots);
    const h = g.ecs.c.health.get(boss)!;
    let hp = h.hp;
    strike(g, g.player.id, boss, blow(100));
    expect(hp - h.hp).toBeCloseTo(100 * SHUB.shielded, 0);
    steps(g, SHUB.every);
    const young = fight.minions.filter((m) => g.ecs.c.model.get(m) === 'creature:thousand_young');
    expect(young.length).toBe(SHUB.roots);
    for (const r of roots) kill(g, r);
    expect(rootsOf(g, fight)).toEqual([]);
    const born = fight.minions.length;
    steps(g, SHUB.every * 2);
    expect(fight.minions.length).toBeLessThanOrEqual(born);
    setSanity(g, 100); // the Young's auras have worn at the mind, which would sharpen the blow
    hp = h.hp;
    strike(g, g.player.id, boss, blow(100));
    expect(hp - h.hp).toBe(100);
  });

  it("Yog-Sothoth's spheres are gates, and its arena leaps between them", () => {
    const b = bossGame('yog_sothoth', undefined, 14);
    const { g, fight } = b;
    engage(b);
    calm(b);
    const spheres = spheresOf(g, fight);
    expect(spheres).toHaveLength(YOG.spheres);
    const through = record(g, 'Rewired');
    const at = (s: number) => g.ecs.c.transform.get(s)!.pos;
    place(g, g.player.id, at(spheres[0]).x, at(spheres[0]).z, 0);
    steps(g, 1);
    expect(through).toHaveLength(1);
    expect(distXZ(g.ecs.c.transform.get(g.player.id)!.pos, at(spheres[1]))).toBeLessThan(YOG.touch + 1.5);
    place(g, g.player.id, fight.arena.x + 3, fight.arena.z + 3, 0);
    steps(g, YOG.leap[1] + 1);
    expect(through.length).toBeGreaterThanOrEqual(2);
  });

  it("Nyarlathotep's final form keeps its true shape and borrows its avatars' attacks; Nodens, once beheld, answers its call", () => {
    const b = bossGame('nyarlathotep', undefined, 8);
    const { g, boss, fight } = b;
    engage(b);
    calm(b);
    expect(fightAction(g)).toBeNull(); // Nodens not yet beheld
    g.ecs.c.health.get(boss)!.hp *= 0.25;
    steps(g, 3);
    expect(g.ecs.c.model.get(boss)).toBe('creature:nyarlathotep#eldritch');
    setSanity(g, 30);
    setSanity(g, 100);
    steps(g, 2);
    expect(g.ecs.c.model.get(boss)).toBe('creature:nyarlathotep#eldritch'); // it no longer swaps back
    const copied = borrowed(g);
    expect(copied.length).toBeGreaterThan(0);
    const choices = g.ecs.c.brain.get(boss)!.def.attacks.map((a) => a.move);
    for (const id of copied) expect(choices).toContain(id);
    for (const id of copied) expect(g.ecs.c.actor.get(boss)!.moves[id]).toBeDefined();
    g.mind.seen.add('nodens');
    expect(fightAction(g)?.label).toBe('call upon Nodens, Lord of the Great Abyss');
    steps(g, 1, press('interact'));
    const nodens = fight.minions.find((m) => g.ecs.c.model.get(m) === 'creature:nodens')!;
    expect(g.ecs.c.combatant.get(nodens)!.faction).toBe('player');
    expect(fightAction(g)).toBeNull(); // once a fight
  });

  it('in the world Nyarlathotep borrows from the bosses slain, and watches when a region boss falls', () => {
    const g = createWorldGame();
    g.overworld!.slain = new Set(['boss:cthulhu', 'boss:ghatanothoa']);
    expect(borrowed(g)).toEqual(expect.arrayContaining(['tentacle_burst', 'slam', 'gaze']));
    const s = worldLayout().spawns.find((x) => x.id === 'boss:colour_out_of_space')!;
    goTo(g, s.at.x, s.at.z + 12);
    run(g, 5);
    const colour = creatureOf(g, 'boss:colour_out_of_space')!;
    const watching = record(g, 'Notice');
    kill(g, colour);
    expect(watching.map((n) => n.text)).toContain('THE CRAWLING CHAOS WATCHES');
    const apparition = [...g.ecs.c.model].find(([, m]) => m === 'creature:nyarlathotep')?.[0];
    expect(apparition).toBeDefined();
    expect(g.ecs.c.brain.has(apparition!)).toBe(false);
    run(g, 300);
    expect(g.ecs.c.transform.has(apparition!)).toBe(false); // gone
  });

  it('Azathoth takes no harm; it hears the investigator and the court erupts where it heard them; outlasting it, it slumbers', () => {
    const b = bossGame('azathoth', undefined, 20); // 5 m from its bulk: footsteps carry that far
    const { g, boss, fight } = b;
    engage(b);
    calm(b);
    const h = g.ecs.c.health.get(boss)!;
    strike(g, g.player.id, boss, deathblow);
    expect(h.hp).toBeGreaterThan(1);
    const heard = record(g, 'Notice');
    steps(g, 90); // standing still: silence
    expect(heard).toEqual([]);
    const walk: InputFrame = { ...emptyInput(), moveX: 1 };
    const pp = { ...g.ecs.c.transform.get(g.player.id)!.pos };
    steps(g, 5, walk);
    expect(heard.map((n) => n.text)).toEqual(['IT HEARS YOU']);
    steps(g, AZATHOTH.windup);
    expect([...g.ecs.c.hazard.keys()].map((z) => distXZ(g.ecs.c.transform.get(z)!.pos, pp)).some((d) => d < 1)).toBe(true);
    const deaths = record(g, 'Died');
    const titles = record(g, 'Title');
    fight.sig.left = 2;
    steps(g, 3);
    expect(deaths).toEqual([expect.objectContaining({ entity: boss, killer: g.player.id })]);
    expect(titles.map((t) => t.text)).toEqual(['THE PIPING FADES · AZATHOTH SLUMBERS']);
  });

  it("Azathoth's health bar is the song, draining as the piping goes on", () => {
    const b = bossGame('azathoth', undefined, 40);
    engage(b);
    calm(b);
    const h = b.g.ecs.c.health.get(b.boss)!;
    steps(b.g, AZATHOTH.survive / 2);
    expect(h.hp / h.max).toBeCloseTo(0.5, 1);
    expect(b.fight.phase).toBe(1);
  });

  it("'Umr at-Tawil yields in its last phase and offers passage through the Gate", () => {
    const b = bossGame('umr_at_tawil', undefined, 5);
    const { g, boss } = b;
    engage(b);
    g.ecs.c.health.get(boss)!.hp *= 0.2;
    steps(g, 2);
    expect(g.ecs.c.brain.get(boss)!.cooldown).toBe(Infinity);
    place(g, g.player.id, g.ecs.c.transform.get(boss)!.pos.x, g.ecs.c.transform.get(boss)!.pos.z + 4, Math.PI);
    const endings = record(g, 'Ending');
    expect(fightAction(g)?.label).toBe("pass through the Gate with 'Umr at-Tawil");
    steps(g, 1, press('interact'));
    expect(endings).toEqual([{ id: 'silver_key' }]);
  });
});
