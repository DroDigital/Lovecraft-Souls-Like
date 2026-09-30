/**
 * Every boss in its own place in the open world (playtest round 24): put where the world puts it, it
 * is still inside its arena a second later, and the bot can reach it and wound it. Father Dagon and
 * Mother Hydra, fifteen metres tall in a hall whose roof is six metres up, were pushed out through
 * the wall at their first step: the room stood empty and they stood outside it, out of reach.
 */
import { describe, expect, it } from 'vitest';
import { getEntity } from '../src/data/registry';
import { teleport } from '../src/systems/checkpoints';
import { createGame, createWorldGame } from '../src/systems/game';
import { priorOf } from '../src/systems/sealCount';
import { bodyOf, creatureModel } from '../src/systems/creatures';
import { resolveCapsule } from '../src/world/colliders';
import { worldLayout, type SpawnPoint } from '../src/world/placements';
import { createWorldCollision } from '../src/world/worldCollision';
import { driveBot } from './botHelpers';
import { run } from './worldHelpers';

const BOSSES = worldLayout().spawns.filter((s): s is SpawnPoint & { arena: NonNullable<SpawnPoint['arena']> } => s.id.startsWith('boss:') && !!s.arena);
/** The wide ones are met by a bot for twenty seconds (the small ones are in bossBot.test.ts): all but Azathoth, warded whole, and Ghatanothoa, whose gaze turns the bot to stone on its way in. */
const NOT_MET = ['boss:azathoth', 'boss:ghatanothoa'];

/** A fresh world with the investigator `dx, dz` metres from the boss's spawn point (the Beyond's order kept, Hastur called), and the boss, a second on. */
function meet(s: (typeof BOSSES)[number], dx: number, dz: number) {
  const g = createWorldGame();
  const prior = priorOf(s.entity);
  if (prior) g.overworld!.slain.add(`boss:${prior}`);
  if (s.entity === 'hastur') Object.assign(g.overworld!, { named: 3 }), g.overworld!.called.add('hastur');
  teleport(g, { x: s.at.x + dx, z: s.at.z + dz, yaw: Math.atan2(-dx, -dz) });
  run(g, 60);
  return { g, e: g.overworld!.alive.get(s.id) };
}

describe('every boss stands in its arena and can be reached (playtest round 24)', () => {
  it('has bosses to visit', () => expect(BOSSES.length).toBeGreaterThan(40));

  it('every attack in a boss\'s script can be chosen somewhere in its arena (Yog-Sothoth\'s beam and teleport began 53 and 63 m off, in an arena 34 wide)', () => {
    const never: string[] = [];
    for (const s of BOSSES) {
      const g = createGame({ creature: s.entity, variant: s.variant });
      const boss = [...g.ecs.c.model].find(([, m]) => m === creatureModel(s.entity, s.variant))![0];
      for (const a of g.ecs.c.brain.get(boss)!.def.attacks) if (a.range[0] > s.arena.radius) never.push(`${s.entity} ${a.move} from ${a.range[0].toFixed(0)} m, in an arena ${s.arena.radius} m across its heart`);
    }
    expect(never).toEqual([]);
  });

  it('no creature of any spawn point is put where the world would push it out (Father Dagon and Mother Hydra were, by 24 m)', () => {
    const world = createWorldCollision();
    const pushed: string[] = [];
    for (const s of worldLayout().spawns) {
      const { radius, height } = bodyOf(getEntity(s.entity)!);
      const p = { x: s.at.x, y: world.ground(s.at.x, s.at.z), z: s.at.z };
      resolveCapsule(world, p, radius, height);
      const d = Math.hypot(p.x - s.at.x, p.z - s.at.z);
      if (d > 0.2) pushed.push(`${s.id} ${d.toFixed(1)} m`);
    }
    expect(pushed).toEqual([]);
  });

  it.each(BOSSES.map((s) => [s.id, s] as const))('%s', (_id, s) => {
    const name = getEntity(s.entity)?.name;
    const { g, e } = meet(s, 0, Math.min(s.arena.radius - 2, 14));
    expect(e, `${name} is not in the world`).toBeDefined();
    const at = g.ecs.c.transform.get(e!)!.pos;
    const out = Math.hypot(at.x - s.arena.x, at.z - s.arena.z) - s.arena.radius;
    expect(out, `${name} stands ${out.toFixed(1)} m outside its arena`).toBeLessThanOrEqual(0);
    if (g.ecs.c.body.get(e!)!.radius < 2 || NOT_MET.includes(s.id)) return;
    // From the side it is first met; failing that from the others (a room's dressing may stand in a straight walk).
    const reach = Math.min(s.arena.radius - 2, 14);
    let best = { dealt: 0, nearest: Infinity };
    for (const [dx, dz] of [[0, reach], [0, -reach], [reach, 0], [-reach, 0]]) {
      const w = meet(s, dx, dz);
      const r = driveBot(w.g, w.e!, 60 * 20, true);
      expect(r.bad).toEqual([]);
      best = { dealt: Math.max(best.dealt, r.dealt), nearest: Math.min(best.nearest, r.nearest) };
      if (best.dealt > 0) break;
    }
    expect(best.dealt > 0 || best.nearest < 3, `${name} was never within reach (nearest ${best.nearest.toFixed(1)} m) from any side, and took no blow`).toBe(true); // (some teleport away as the bot arrives)
  });
});
