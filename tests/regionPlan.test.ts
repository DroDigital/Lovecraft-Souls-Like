import { describe, expect, it } from 'vitest';
import { LAIRS } from '../src/data/lairs';
import { REGION_LAYOUTS } from '../src/data/regionFeatures';
import { REGIONS } from '../src/data/regions';
import { resolveCapsule } from '../src/world/colliders';
import { worldLayout } from '../src/world/placements';
import { regionPlan } from '../src/world/regionPlan';
import { segmentDistance, type Road } from '../src/world/roads';
import { createWorldCollision } from '../src/world/worldCollision';
import { DIRS, rectDistance, regionAt } from '../src/world/worldMap';

const roadDistance = (roads: readonly Road[], x: number, z: number): number =>
  Math.min(...roads.flatMap((r) => r.pts.slice(1).map((p, i) => segmentDistance(x, z, r.pts[i], p) - r.width / 2)));

describe('region plans', () => {
  const w = worldLayout();
  const world = createWorldCollision();

  it('post every foe on open ground in its own region, well away from Elder Signs and gates', () => {
    const bad: string[] = [];
    for (const r of REGIONS) {
      for (const s of [...regionPlan(r).spawns.values()].flat()) {
        const pos = { x: s.at.x, y: world.ground(s.at.x, s.at.z), z: s.at.z };
        resolveCapsule(world, pos, 0.45, 1.8);
        if (Math.hypot(pos.x - s.at.x, pos.z - s.at.z) > 0.01) bad.push(`${s.id} (${s.entity}) stands in something`);
        if (regionAt(s.at.x, s.at.z)?.id !== r.id) bad.push(`${s.id} strays out of ${r.id}`);
        for (const p of [...w.signs.map((x) => x.rest), ...w.gates.map((g) => g.arrive)]) if (Math.hypot(p.x - s.at.x, p.z - s.at.z) < 25) bad.push(`${s.id} is posted by a sign or gate`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('roads reach every Elder Sign; no dungeon has a road run up to its door (round 13), and the lairs lie off the road', () => {
    const lesser = new Set(LAIRS.map((d) => d.id));
    const bad: string[] = [];
    for (const r of REGIONS) {
      const roads = regionPlan(r).roads;
      for (const s of w.signs.filter((x) => x.region === r.id && !w.dungeons.some((d) => rectDistance(d.layout.rect, x.x, x.z) === 0))) {
        if (roadDistance(roads, s.rest.x, s.rest.z) > 4) bad.push(`sign ${s.id} has no road`);
      }
      for (const d of w.dungeons.filter((x) => x.layout.region === r.id && !x.layout.def.sealed)) {
        const door = d.layout.doors.find((x) => x.b === null)!;
        const near = roadDistance(roads, door.x, door.z);
        if (lesser.has(d.layout.def.id) && near < 10) bad.push(`lesser dungeon ${d.layout.def.id} lies on a road`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps props off the sites, and builds towns where the layout asks', () => {
    const bad: string[] = [];
    for (const r of REGIONS) {
      const props = [...regionPlan(r).props.values()].flat();
      for (const p of props) {
        for (const pad of w.pads) {
          const d = pad.kind === 'circle' ? Math.hypot(p.x - pad.x, p.z - pad.z) - pad.radius : rectDistance(pad.rect, p.x, p.z);
          if (d < 0) bad.push(`${r.id}: a ${p.kind} stands on a site at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
        }
      }
      if (REGION_LAYOUTS[r.id]?.towns.length) expect(props.filter((p) => p.kind === 'house').length, r.id).toBeGreaterThan(5);
    }
    expect(bad).toEqual([]);
  });

  it('lights its towns from the kerb, never with a lamp before a door (playtest round 10)', () => {
    const bad: string[] = [];
    let lit = 0;
    for (const r of REGIONS) {
      const props = [...regionPlan(r).props.values()].flat();
      const houses = props.filter((p) => p.kind === 'house');
      for (const l of props.filter((p) => p.kind === 'lamp')) {
        lit++;
        for (const h of houses) {
          const [dx, dz, c, s] = [l.x - h.x, l.z - h.z, Math.cos(h.yaw), Math.sin(h.yaw)];
          const [lx, lz] = [dx * c - dz * s, dx * s + dz * c]; // in the house's frame, its front facing +z
          if (Math.abs(lx) < h.w + 0.5 && lz > h.d - 0.2 && lz < h.d + 3.5) bad.push(`${r.id}: a lamp at ${l.x.toFixed(0)},${l.z.toFixed(0)} stands before a door`);
        }
        if (roadDistance(regionPlan(r).roads, l.x, l.z) < 0.3) bad.push(`${r.id}: a lamp stands in the road`);
      }
    }
    expect(bad).toEqual([]);
    expect(lit).toBeGreaterThan(50); // the towns are still lit
  });
  it('leave a way from every dungeon door out past its thicket (round 13: thickets ring them)', () => {
    const bad: string[] = [];
    const free = (x: number, z: number): boolean => {
      const pos = { x, y: world.ground(x, z), z };
      resolveCapsule(world, pos, 0.45, 1.8);
      return Math.hypot(pos.x - x, pos.z - z) < 0.01;
    };
    for (const d of w.dungeons.filter((x) => !x.layout.def.sealed)) {
      const door = d.layout.doors.find((x) => x.b === null)!;
      const n = DIRS[door.side];
      const R = d.layout.rect;
      const [x0, z0, x1, z1] = [R.x0 - 18, R.z0 - 18, R.x1 + 18, R.z1 + 18]; // past the thicket's outer ring (11 m)
      const start = { x: door.x + n.x * 3, z: door.z + n.z * 3 };
      const key = (x: number, z: number): string => `${Math.round(x)},${Math.round(z)}`;
      const seen = new Set([key(start.x, start.z)]);
      const queue = [start];
      let out = false;
      while (queue.length && !out) {
        const p = queue.shift()!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const [x, z] = [Math.round(p.x) + dx, Math.round(p.z) + dz];
          if (seen.has(key(x, z))) continue;
          seen.add(key(x, z));
          if (!free(x, z)) continue; // (the walls are colliders: the way may lead through the rooms, as a player may)
          if (x <= x0 || x >= x1 || z <= z0 || z >= z1) { out = true; break; }
          queue.push({ x, z });
        }
      }
      if (!out) bad.push(`${d.layout.def.id}: shut in`);
    }
    expect(bad).toEqual([]);
  });
});
