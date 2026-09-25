import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { distXZ, wrapAngle, yawOf } from '../src/core/geom';
import { emptyInput, noButtons, type InputFrame } from '../src/core/input';
import { compileAttack } from '../src/data/attacks';
import { st } from '../src/data/entities/kit';
import { ATTACK_IDS, type AttackId } from '../src/data/schema';
import { startMove } from '../src/systems/actions';
import type { Game } from '../src/systems/components';
import { place, scriptedGame, steps } from './helpers';
import { record } from './worldHelpers';

const STATS = st(500, 50, 20, 3, 1, 5);

/** The hand-driven Deep One at the origin facing +z, armed with the whole library; the investigator `gap` metres ahead of it. */
function armed(gap: number): { g: Game; player: Entity; foe: Entity } {
  const { g, player, deepOne } = scriptedGame();
  place(g, deepOne, 0, 5, 0);
  place(g, player, 0, 5 + gap, Math.PI);
  const a = g.ecs.c.actor.get(deepOne)!;
  a.moves = { ...a.moves, ...Object.fromEntries(ATTACK_IDS.map((id) => [id, compileAttack(id, STATS, 1.9)])) };
  return { g, player, foe: deepOne };
}

const attack = (g: Game, foe: Entity, id: AttackId): void => startMove(g.ecs.c.actor.get(foe)!, id);

function until(g: Game, done: () => boolean, max = 300, input: InputFrame = emptyInput()): boolean {
  for (let i = 0; i < max; i++) {
    if (done()) return true;
    steps(g, 1, input);
  }
  return done();
}

const rollOnTheSpot = (g: Game, id: Entity): void => {
  const a = g.ecs.c.actor.get(id)!;
  startMove(a, 'roll');
  a.dir = { x: 0, z: 0 };
};

const guard: InputFrame = { ...emptyInput(), held: { ...noButtons(), block: true } };
const LANDED = ['hit', 'stagger'];
const foeHits = <T extends { attacker: Entity }>(hits: T[], foe: Entity): T[] => hits.filter((h) => h.attacker === foe);

describe('the dodging game (spec §3E)', () => {
  it('an eruption marks the ground under the investigator and about them, then bursts spot by spot', () => {
    const { g, player, foe } = armed(6);
    const hits = record(g, 'Hit');
    const bursts = record(g, 'Erupted');
    attack(g, foe, 'eruption');
    expect(until(g, () => g.ecs.c.mark.size > 0)).toBe(true);
    expect(g.ecs.c.mark.size).toBe(5);
    const [first] = [...g.ecs.c.mark].sort(([, a], [, b]) => a.delay - b.delay)[0];
    expect(distXZ(g.ecs.c.transform.get(first)!.pos, g.ecs.c.transform.get(player)!.pos)).toBeLessThan(0.5);
    expect(hits).toEqual([]);
    until(g, () => bursts.length > 0);
    expect(foeHits(hits, foe)[0].target).toBe(player);
    expect(LANDED).toContain(foeHits(hits, foe)[0].outcome);
    until(g, () => g.ecs.c.mark.size === 0);
    expect(bursts).toHaveLength(5);
  });

  it('a roll as the mark bursts slips it, and a guard does not hold it', () => {
    const { g, player, foe } = armed(6);
    const hits = record(g, 'Hit');
    attack(g, foe, 'eruption');
    until(g, () => [...g.ecs.c.mark.values()].some((m) => m.delay <= 4));
    rollOnTheSpot(g, player);
    steps(g, 8);
    expect(foeHits(hits, foe).map((h) => h.outcome)).toEqual(['dodged']);
    const b = armed(6);
    const held = record(b.g, 'Hit');
    attack(b.g, b.foe, 'eruption');
    until(b.g, () => held.length > 0, 300, guard);
    expect(LANDED).toContain(held[0].outcome);
  });

  it("a quake's ring strikes once as it passes; a roll slips it, a guard holds it", () => {
    const { g, player, foe } = armed(5);
    const hits = record(g, 'Hit');
    attack(g, foe, 'quake');
    expect(until(g, () => g.ecs.c.wave.size === 1)).toBe(true);
    until(g, () => g.ecs.c.wave.size === 0);
    expect(foeHits(hits, foe).map((h) => [h.target, h.outcome])).toEqual([[player, 'hit']]);
    const r = armed(5);
    const rolled = record(r.g, 'Hit');
    attack(r.g, r.foe, 'quake');
    until(r.g, () => [...r.g.ecs.c.wave.values()].some((w) => w.r > 3.4));
    rollOnTheSpot(r.g, r.player);
    until(r.g, () => r.g.ecs.c.wave.size === 0);
    expect(rolled.map((h) => h.outcome)).toEqual(['dodged']);
    const b = armed(5);
    const held = record(b.g, 'Hit');
    attack(b.g, b.foe, 'quake');
    until(b.g, () => held.length > 0, 300, guard);
    expect(held[0].outcome).toBe('blocked');
  });

  it('a sweeping beam crosses the investigator ahead of it once, and never reaches behind it', () => {
    const { g, player, foe } = armed(6);
    const hits = record(g, 'Hit');
    attack(g, foe, 'sweep_beam');
    until(g, () => g.ecs.c.actor.get(foe)!.move === null);
    expect(foeHits(hits, foe).map((h) => [h.target, h.outcome])).toEqual([[player, 'hit']]);
    const b = armed(6);
    place(b.g, b.player, 0, -1, 0);
    const none = record(b.g, 'Hit');
    attack(b.g, b.foe, 'sweep_beam');
    until(b.g, () => b.g.ecs.c.actor.get(b.foe)!.move === null);
    expect(none).toEqual([]);
  });

  it('a barrage pours bolts out along turning arms', () => {
    const { g, foe } = armed(9);
    attack(g, foe, 'barrage');
    until(g, () => g.ecs.c.bolt.size > 0);
    const yaws = (): number[] => [...g.ecs.c.bolt.values()].map((b) => yawOf(b.vel.x, b.vel.z));
    expect(yaws()).toHaveLength(4);
    expect(Math.min(...yaws().map((y) => Math.abs(wrapAngle(y))))).toBeCloseTo(0, 5); // one straight at them
    const first = new Set(yaws().map((y) => y.toFixed(4)));
    steps(g, 9);
    const turned = yaws().filter((y) => !first.has(y.toFixed(4)));
    expect(turned).toHaveLength(4);
    expect(Math.min(...turned.map((y) => Math.abs(wrapAngle(y))))).toBeCloseTo((13 * Math.PI) / 180, 3);
  });

  it('the vortex draws the investigator in, then bursts', () => {
    const { g, player, foe } = armed(6);
    const hits = record(g, 'Hit');
    attack(g, foe, 'vortex');
    let closest = Infinity;
    until(g, () => {
      closest = Math.min(closest, distXZ(g.ecs.c.transform.get(player)!.pos, g.ecs.c.transform.get(foe)!.pos));
      return foeHits(hits, foe).length > 0;
    });
    expect(closest).toBeLessThan(4.5);
    expect(g.ecs.c.actor.get(foe)!.move).toBe('vortex_burst');
    expect(foeHits(hits, foe)[0].outcome).not.toBe('dodged');
  });

  it('a chain runs on from one blow into the next, and a stagger breaks it', () => {
    const { g, foe } = armed(1.6);
    const seen = new Set<string>();
    attack(g, foe, 'combo');
    until(g, () => {
      const m = g.ecs.c.actor.get(foe)!.move;
      if (m) seen.add(m);
      return m === null;
    });
    expect([...seen]).toEqual(['combo', 'combo_2', 'combo_3']);
    const b = armed(1.6);
    attack(b.g, b.foe, 'combo');
    steps(b.g, 5);
    startMove(b.g.ecs.c.actor.get(b.foe)!, 'stagger');
    until(b.g, () => b.g.ecs.c.actor.get(b.foe)!.move === null);
    expect(b.g.ecs.c.actor.get(b.foe)!.last).toBe('stagger');
  });
});
