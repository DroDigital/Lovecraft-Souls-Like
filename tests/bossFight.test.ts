import { describe, expect, it } from 'vitest';
import { distXZ } from '../src/core/geom';
import { compileAttack } from '../src/data/attacks';
import { ph, phases } from '../src/data/entities/kit';
import { getEntity } from '../src/data/registry';
import { setSanity } from '../src/systems/sanity';
import { worldLayout } from '../src/world/placements';
import { bossGame, calm, engage } from './bossHelpers';
import { steps } from './helpers';
import { deathblow, kill, record } from './worldHelpers';
import { strike } from '../src/systems/combat';

/** The Outsider fighting by a three-phase script: summons rise with the second, which also lights lamps. */
function scripted() {
  const b = bossGame('the_outsider');
  const { g, boss, fight } = b;
  const a = g.ecs.c.actor.get(boss)!;
  const stats = getEntity('the_outsider')!.stats;
  a.moves = { ...a.moves, slam: compileAttack('slam', stats, 1.8), summon: compileAttack('summon', stats, 1.8) };
  fight.script = phases(ph(1, { sweep: 1 }), ph(0.6, { slam: 1 }, { summons: ['rat_swarm', 'ghoul'], arena: 'lamps' }), ph(0.3, { summon: 1, grab: 1 }, { summons: ['ghoul'] }));
  return b;
}

describe('boss fights (spec §3E)', () => {
  it('begins when the boss turns on the investigator', () => {
    const b = bossGame('keziah_mason');
    const begun = record(b.g, 'BossEngaged');
    expect(b.fight.engaged).toBe(false);
    engage(b);
    expect(b.fight.engaged).toBe(true);
    expect(begun).toEqual([{ entity: b.boss, name: 'Keziah Mason' }]);
  });

  it('each phase brings its attacks, its summons and its arena change as health falls', () => {
    const b = scripted();
    const { g, boss, fight } = b;
    const moved = record(g, 'BossPhase');
    engage(b);
    calm(b);
    const h = g.ecs.c.health.get(boss)!;
    const po = g.ecs.c.poise.get(boss)!;
    const attacks = (): string[] => g.ecs.c.brain.get(boss)!.def.attacks.map((x) => x.move);
    expect(attacks()).toEqual(['sweep']);
    h.hp = h.max * 0.59;
    po.value = 1;
    steps(g, 1);
    expect(fight.phase).toBe(1);
    expect(attacks()).toEqual(['slam']);
    expect(po.value).toBe(po.max);
    expect(fight.minions.map((m) => g.ecs.c.model.get(m))).toEqual(['creature:rat_swarm', 'creature:ghoul']);
    expect(fight.props).toHaveLength(4);
    h.hp = h.max * 0.29;
    steps(g, 1);
    expect(fight.phase).toBe(2);
    expect(fight.minions).toHaveLength(2); // it calls its own summons now, with its summon attack
    expect(moved.map((e) => e.phase)).toEqual([0, 1, 2]);
  });

  it('skips straight through phases passed in one blow', () => {
    const b = scripted();
    engage(b);
    calm(b);
    b.g.ecs.c.health.get(b.boss)!.hp = 10;
    steps(b.g, 1);
    expect(b.fight.phase).toBe(2);
    expect(b.fight.changes.has('lamps')).toBe(true);
  });

  it("resets when the investigator dies: its first phase, whole again, its summons and props gone", () => {
    const b = scripted();
    const { g, boss, fight } = b;
    engage(b);
    calm(b);
    g.ecs.c.health.get(boss)!.hp *= 0.5;
    steps(g, 1);
    const minions = [...fight.minions];
    strike(g, boss, g.player.id, deathblow);
    const back = record(g, 'Respawned');
    for (let i = 0; i < 400 && back.length === 0; i++) steps(g, 1); // (the arena's investigator rises inside its ring, where it wakes again)
    expect(fight.engaged).toBe(false);
    expect(fight.phase).toBe(0);
    expect(fight.props).toEqual([]);
    for (const m of minions) expect(g.ecs.c.transform.has(m)).toBe(false);
    expect(g.ecs.c.health.get(boss)!.hp).toBe(g.ecs.c.health.get(boss)!.max);
    expect(g.ecs.c.brain.get(boss)!.def.attacks.map((x) => x.move)).toEqual(['sweep']);
  });

  it('ends when the boss dies, and its summons and props go with it', () => {
    const b = scripted();
    const { g, boss, fight } = b;
    engage(b);
    calm(b);
    g.ecs.c.health.get(boss)!.hp *= 0.5;
    steps(g, 1);
    const [minion] = fight.minions;
    kill(g, boss);
    expect(fight.engaged).toBe(false);
    expect(g.ecs.c.transform.has(minion)).toBe(false);
    expect(g.ecs.c.prop.size).toBe(0);
  });

  it('resets when the boss gives up the chase', () => {
    const b = scripted();
    engage(b);
    b.g.ecs.c.health.get(b.boss)!.hp *= 0.5;
    steps(b.g, 1);
    b.g.ecs.c.brain.get(b.boss)!.state = 'return';
    steps(b.g, 1);
    expect(b.fight.engaged).toBe(false);
    expect(b.fight.minions).toEqual([]);
  });

  it('keeps its phase through a variant swap', () => {
    const b = bossGame('whisperer');
    const { g, boss, fight } = b;
    engage(b);
    g.ecs.c.health.get(boss)!.hp *= 0.45;
    steps(g, 1);
    setSanity(g, 20);
    steps(g, 1);
    expect(g.ecs.c.model.get(boss)).toBe('creature:whisperer#eldritch');
    expect(fight.phase).toBe(1);
    expect(g.ecs.c.brain.get(boss)!.def.attacks.map((x) => x.move)).toContain('projectile_fan');
  });

  it('world bosses hold the arena they stand in: a ring of stones or their room', () => {
    const bosses = worldLayout().spawns.filter((s) => s.id.startsWith('boss:'));
    expect(bosses.length).toBeGreaterThan(40);
    for (const s of bosses) {
      expect(s.arena, s.id).toBeDefined();
      expect(distXZ(s.at, s.arena!), s.id).toBeLessThan(s.arena!.radius);
      expect(s.arena!.radius, s.id).toBeGreaterThan(5);
    }
  });
});
