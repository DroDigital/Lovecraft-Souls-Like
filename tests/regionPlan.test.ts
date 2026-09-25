import { describe, expect, it } from 'vitest';
import { LAIRS } from '../src/data/lairs';
import { REGION_LAYOUTS } from '../src/data/regionFeatures';
import { REGIONS } from '../src/data/regions';
import { resolveCapsule } from '../src/world/colliders';
import { worldLayout } from '../src/world/placements';
import { regionPlan } from '../src/world/regionPlan';
import { segmentDistance, type Road } from '../src/world/roads';
import { createWorldCollision } from '../src/world/worldCollision';
import { rectDistance, regionAt } from '../src/world/worldMap';

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

  it('roads reach every Elder Sign and legacy dungeon; the lesser dungeons and lairs lie off the road', () => {
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
        if (!lesser.has(d.layout.def.id) && near > 12) bad.push(`dungeon ${d.layout.def.id} has no road to its door`);
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
});
