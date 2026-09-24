import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { distXZ, wrapAngle, yawOf } from '../src/core/geom';
import { emptyInput, noButtons, type InputFrame } from '../src/core/input';
import { compileAttack } from '../src/data/attacks';
import { st } from '../src/data/entities/kit';
import { ATTACK_IDS, type AttackId } from '../src/data/schema';
import { BOSS } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import type { Game } from '../src/systems/components';
import { creatureModel } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { place, scriptedGame, steps } from './helpers';
import { record } from './worldHelpers';

const STATS = st(500, 50, 20, 3, 1, 5);

/** The scripted Deep One 7 m north of the investigator, facing them, armed with the whole attack library. */
function armed(gap = 7): { g: Game; player: Entity; foe: Entity } {
  const { g, player, deepOne } = scriptedGame();
  place(g, deepOne, 0, 5, 0);
  place(g, player, 0, 5 + gap, Math.PI);
  const a = g.ecs.c.actor.get(deepOne)!;
  a.moves = { ...a.moves, ...Object.fromEntries(ATTACK_IDS.map((id) => [id, compileAttack(id, STATS, 1.9)])) };
  return { g, player, foe: deepOne };
}

const attack = (g: Game, foe: Entity, id: AttackId): void => startMove(g.ecs.c.actor.get(foe)!, id);

/** Steps until `done` holds (at most `max` steps); true if it did. */
function until(g: Game, done: () => boolean, max = 200, input: InputFrame = emptyInput()): boolean {
  for (let i = 0; i < max; i++) {
    if (done()) return true;
    steps(g, 1, input);
  }
  return done();
}

const guard: InputFrame = { ...emptyInput(), held: { ...noButtons(), block: true } };

describe('the attack library (spec §3E)', () => {
  it('a bolt flies from its wind-up to the investigator, then strikes', () => {
    const { g, player, foe } = armed();
    const hits = record(g, 'Hit');
    attack(g, foe, 'projectile');
    expect(until(g, () => g.ecs.c.bolt.size === 1)).toBe(true);
    expect(hits).toEqual([]);
    expect(until(g, () => hits.length > 0)).toBe(true);
    expect(hits[0]).toMatchObject({ attacker: foe, target: player, outcome: 'hit' });
    expect(g.ecs.c.bolt.size).toBe(0);
  });

  it('a roll lets a bolt fly on through; a guard blocks one', () => {
    const { g, player, foe } = armed();
    const hits = record(g, 'Hit');
    attack(g, foe, 'projectile');
    until(g, () => [...g.ecs.c.bolt.keys()].some((b) => distXZ(g.ecs.c.transform.get(b)!.pos, g.ecs.c.transform.get(player)!.pos) < 1.4));
    const a = g.ecs.c.actor.get(player)!;
    startMove(a, 'roll');
    a.dir = { x: 0, z: 0 }; // roll on the spot
    steps(g, 6);
    expect(hits.map((h) => h.outcome)).toEqual(['dodged']);
    expect(g.ecs.c.bolt.size).toBe(1); // still flying, beyond the investigator
    const b = armed();
    const blocked = record(b.g, 'Hit');
    attack(b.g, b.foe, 'projectile');
    until(b.g, () => blocked.length > 0, 200, guard);
    expect(blocked[0].outcome).toBe('blocked');
    expect(b.g.ecs.c.health.get(b.player)!.hp).toBe(b.g.ecs.c.health.get(b.player)!.max);
  });

  it('a fan looses five bolts across its spread', () => {
    const { g, foe } = armed();
    attack(g, foe, 'projectile_fan');
    until(g, () => g.ecs.c.bolt.size > 0);
    const yaws = [...g.ecs.c.bolt.values()].map((b) => yawOf(b.vel.x, b.vel.z)).sort((p, q) => p - q);
    expect(yaws).toHaveLength(5);
    expect(yaws[4] - yaws[0]).toBeCloseTo((56 * Math.PI) / 180, 2);
  });

  it('spit arcs down and leaves a pool that hurts whoever stands in it, tick by tick', () => {
    const { g, player, foe } = armed(5);
    attack(g, foe, 'spit');
    until(g, () => g.ecs.c.bolt.size > 0);
    expect([...g.ecs.c.bolt.values()][0].vel.y).toBeGreaterThan(0); // lobbed
    expect(until(g, () => g.ecs.c.hazard.size === 1)).toBe(true);
    const h = g.ecs.c.health.get(player)!;
    const pool = [...g.ecs.c.transform.entries()].find(([e]) => g.ecs.c.hazard.has(e))![1].pos;
    place(g, player, pool.x, pool.z, Math.PI);
    const before = h.hp;
    steps(g, 65);
    expect(before - h.hp).toBeGreaterThan(0);
  });

  it('the pool attack spreads a pool under its target', () => {
    const { g, player, foe } = armed(6);
    attack(g, foe, 'pool');
    expect(until(g, () => g.ecs.c.hazard.size === 1)).toBe(true);
    const at = [...g.ecs.c.transform.entries()].find(([e]) => g.ecs.c.hazard.has(e))![1].pos;
    expect(distXZ(at, g.ecs.c.transform.get(player)!.pos)).toBeLessThan(0.5);
  });

  it('wind shoves the investigator back even through a guard; a grab goes through a guard', () => {
    const { g, player, foe } = armed(2.4);
    const z0 = g.ecs.c.transform.get(player)!.pos.z;
    attack(g, foe, 'wind_push');
    steps(g, 60, guard);
    expect(g.ecs.c.transform.get(player)!.pos.z - z0).toBeGreaterThan(2.5);
    const b = armed(1.4);
    const hits = record(b.g, 'Hit');
    attack(b.g, b.foe, 'grab');
    until(b.g, () => hits.length > 0, 60, guard);
    expect(hits[0].outcome).not.toBe('blocked');
    expect(b.g.ecs.c.health.get(b.player)!.hp).toBeLessThan(b.g.ecs.c.health.get(b.player)!.max);
  });

  it('a teleport lands near the target, facing it', () => {
    const { g, player, foe } = armed(14);
    const jumps = record(g, 'Teleported');
    attack(g, foe, 'teleport');
    until(g, () => jumps.length > 0, 60);
    const [fp, pp] = [g.ecs.c.transform.get(foe)!, g.ecs.c.transform.get(player)!.pos];
    const d = distXZ(fp.pos, pp);
    expect(d).toBeGreaterThanOrEqual(BOSS.teleport[0] - 1);
    expect(d).toBeLessThanOrEqual(BOSS.teleport[1] + 1);
    expect(Math.abs(wrapAngle(fp.yaw - yawOf(pp.x - fp.pos.x, pp.z - fp.pos.z)))).toBeLessThan(0.01);
  });

  it('a summon calls up the summoner’s servants, on the hunt, and never more than the cap', () => {
    const g = createGame({ creature: 'dagon_priest' });
    const priest = [...g.ecs.c.model].find(([, m]) => m === creatureModel('dagon_priest'))![0];
    g.ecs.c.brain.delete(priest);
    const calls = record(g, 'Summoned');
    for (let i = 0; i < BOSS.minions + 2; i++) {
      attack(g, priest, 'summon');
      steps(g, 95);
    }
    expect(calls).toHaveLength(BOSS.minions);
    for (const { entity } of calls) {
      expect(g.ecs.c.model.get(entity)).toBe(creatureModel('deep_one'));
      expect(g.ecs.c.minion.get(entity)).toBe(priest);
      expect(g.ecs.c.combatant.get(entity)!.bounty).toBe(0);
    }
  });

  it('gazes in sight build up; full, the mind reels and the investigator staggers', () => {
    const { g, player, foe } = armed();
    const bursts = record(g, 'GazeBurst');
    let staggered = false;
    for (let i = 0; i < 3; i++) {
      attack(g, foe, 'gaze');
      for (let k = 0; k < 80; k++) {
        steps(g, 1);
        staggered ||= g.ecs.c.actor.get(player)!.move === 'stagger';
      }
    }
    expect(bursts).toHaveLength(1);
    expect(staggered).toBe(true);
    expect(g.mind.sanity).toBeLessThan(100 - BOSS.gazeSanity);
  });

  it('darkness darkens the arena for a while', () => {
    const { g, foe } = armed();
    attack(g, foe, 'darkness');
    steps(g, 40 + 90);
    expect(g.reality.darkness).toBe(1);
    steps(g, BOSS.darkFrames + 90);
    expect(g.reality.darkness).toBe(0);
  });
});
