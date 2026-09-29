import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/tuning';
import { createWorldGame } from '../src/systems/game';
import { chunkContent } from '../src/world/chunks';
import { colliderBounds, resolveCapsule, type Collider } from '../src/world/colliders';
import { doorwayClear } from '../src/world/dungeonParts';
import { worldLayout } from '../src/world/placements';
import { ALL_STONES, SHRINE, shrineColliders, standingStones } from '../src/world/shrine';
import { chunkOf, DIRS, yawOfDir } from '../src/world/worldMap';

/** Whether a point (over the heights `y0`..`y1`) lies inside a collider. */
function within(c: Collider, x: number, z: number, y0: number, y1: number): boolean {
  if (c.kind === 'box') return x >= c.min.x && x <= c.max.x && z >= c.min.z && z <= c.max.z && y1 > c.min.y && y0 < c.max.y;
  if (c.kind === 'cylinder') return Math.hypot(x - c.x, z - c.z) <= c.radius && y1 > c.y0 && y0 < c.y1;
  const [s, k] = [Math.sin(c.yaw), Math.cos(c.yaw)];
  const [dx, dz] = [x - c.x, z - c.z];
  return Math.abs(dx * k - dz * s) <= c.hx && Math.abs(dx * s + dz * k) <= c.hz && y1 > c.y0 && y0 < c.y1;
}

/** Points over a shrine collider's footprint: its corners, edges and middle, or a cylinder's rim and centre. */
function footprint(c: Collider): { x: number; z: number; y0: number; y1: number }[] {
  if (c.kind === 'box') {
    const out = [];
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) out.push({ x: c.min.x + ((c.max.x - c.min.x) * a) / 4, z: c.min.z + ((c.max.z - c.min.z) * b) / 4, y0: c.min.y, y1: c.max.y });
    return out;
  }
  if (c.kind !== 'cylinder') return [];
  return [{ x: c.x, z: c.z, y0: c.y0, y1: c.y1 }, ...Array.from({ length: 8 }, (_, a) => ({ x: c.x + Math.cos((a * Math.PI) / 4) * c.radius, z: c.z + Math.sin((a * Math.PI) / 4) * c.radius, y0: c.y0, y1: c.y1 }))];
}

describe('playtest round 7: the Elder Sign’s shrine', () => {
  it('stands on its sign’s level ground, the lesser stones behind, the way in front open', () => {
    for (const face of ['n', 'e', 's', 'w'] as const) {
      const cs = shrineColliders(0, 0, 0, yawOfDir(face));
      expect(cs).toHaveLength(2 + SHRINE.lesser.length);
      for (const c of cs) {
        const b = colliderBounds(c);
        expect(Math.max(Math.abs(b.x0), Math.abs(b.x1), Math.abs(b.z0), Math.abs(b.z1))).toBeLessThan(3.6); // the sign's pad is level for 4 m
      }
      const f = DIRS[face];
      for (const c of cs.slice(2)) if (c.kind === 'cylinder') expect(c.x * f.x + c.z * f.z).toBeLessThan(0); // behind the carved face
    }
  });

  it('leaves room to rest: every sign can be reached, its rest point is clear and within reach', () => {
    const g = createWorldGame();
    for (const s of worldLayout().signs) {
      const f = DIRS[s.face];
      const p = { x: s.x + f.x * 2, y: s.y, z: s.z + f.z * 2 }; // walking up to it
      resolveCapsule(g.world, p, 0.4, 1.8);
      expect(Math.hypot(p.x - s.x, p.z - s.z), s.id).toBeLessThanOrEqual(WORLD.signReach);
      expect(Math.hypot(s.rest.x - s.x, s.rest.z - s.z), s.id).toBeLessThanOrEqual(WORLD.signReach); // rest at once after travel or death (round 12)
      const r = { ...s.rest, y: s.y };
      resolveCapsule(g.world, r, 0.4, 1.8);
      expect(Math.hypot(r.x - s.rest.x, r.z - s.rest.z), s.id).toBe(0);
    }
  });

  it('stands clear of every wall and prop about it: no stone half sunk in one (round 20: dungeon signs were)', () => {
    let [crowded, met] = [0, 0];
    const doorways = worldLayout().dungeons.flatMap((d) => d.layout.doors.map(doorwayClear)); // no collision, but nothing is set in one
    for (const s of worldLayout().signs) {
      const own = shrineColliders(s.x, s.y, s.z, yawOfDir(s.face), s.stones);
      const near = new Set<Collider>();
      for (let cx = chunkOf(s.x - 8); cx <= chunkOf(s.x + 8); cx++) {
        for (let cz = chunkOf(s.z - 8); cz <= chunkOf(s.z + 8); cz++) for (const c of chunkContent(cx, cz).colliders) near.add(c);
      }
      const others = [...near, ...doorways].filter((c) => !own.some((o) => JSON.stringify(o) === JSON.stringify(c)));
      met += others.length;
      own.forEach((o, i) => {
        for (const p of footprint(o)) for (const c of others) expect(within(c, p.x, p.z, p.y0, p.y1), `${s.id}: ${i < 2 ? ['the plinth', 'the standing stone'][i] : `lesser stone ${i - 2}`} in a wall`).toBe(false);
      });
      if (s.stones.length < ALL_STONES.length) crowded++;
    }
    expect(met).toBeGreaterThan(100); // there is much about them to stand in
    expect(crowded).toBeGreaterThan(5); // the rooms that cannot hold the whole ring break it
    expect(crowded).toBeLessThan(worldLayout().signs.length / 2); // the open world's signs keep all five
  }, 60000); // it builds every chunk about a sign

  it('raises a stone only where it stands well clear of the walls, and the whole ring in the open', () => {
    expect(standingStones(0, 0, 0, 0, [])).toEqual(ALL_STONES);
    const wall: Collider = { kind: 'box', min: { x: -20, y: -1, z: -4.5 }, max: { x: 20, y: 6, z: -3.5 } }; // 3.5 m behind the carved face
    const stones = standingStones(0, 0, 0, 0, [wall]);
    expect(stones.length).toBeGreaterThan(0);
    expect(stones.length).toBeLessThan(ALL_STONES.length);
    for (const c of shrineColliders(0, 0, 0, 0, stones).slice(2)) if (c.kind === 'cylinder') expect(c.z - c.radius).toBeGreaterThanOrEqual(-3.5 + 0.4 - 1e-9); // 40 cm off the wall's face
    const low: Collider = { kind: 'box', min: { x: -20, y: -40, z: -4.5 }, max: { x: 20, y: -30, z: -3.5 } }; // a wall far below the stones is none of theirs
    expect(standingStones(0, 0, 0, 0, [low])).toEqual(ALL_STONES);
  });
});
