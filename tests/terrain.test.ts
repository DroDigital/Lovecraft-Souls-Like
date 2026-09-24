import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { WORLD } from '../src/data/tuning';
import { landHeight } from '../src/world/land';
import { worldLayout } from '../src/world/placements';
import { ground, surface } from '../src/world/terrain';
import { regionRect, TILE } from '../src/world/worldMap';

describe('terrain', () => {
  it('is continuous across region borders', () => {
    // hub | arkham at x = 0, hub | vermont at z = TILE, vermont | innsmouth at x = TILE
    for (let t = 8; t < TILE; t += 8) {
      expect(Math.abs(landHeight(-0.5, t) - landHeight(0.5, t))).toBeLessThan(0.4);
      expect(Math.abs(landHeight(t, TILE - 0.5) - landHeight(t, TILE + 0.5))).toBeLessThan(0.4);
      expect(Math.abs(landHeight(TILE - 0.5, TILE + t) - landHeight(TILE + 0.5, TILE + t))).toBeLessThan(0.4);
    }
  });

  it('stays above the sea on land, and sinks to the sea floor off the coast', () => {
    for (const r of REGIONS) {
      const rc = regionRect(r);
      for (let x = rc.x0 + 2; x < rc.x1; x += 16) for (let z = rc.z0 + 2; z < rc.z1; z += 16) expect(surface(x, z), `${r.id} ${x},${z}`).toBeGreaterThan(WORLD.seaLevel + 0.5);
    }
    expect(landHeight(128, -WORLD.coast - 1)).toBeCloseTo(WORLD.seaFloor); // south of the hub
    expect(landHeight(5000, 5000)).toBe(WORLD.seaFloor);
  });

  it('lies flat under Elder Signs and arenas', () => {
    const w = worldLayout();
    for (const s of w.signs.filter((x) => x.region === 'arkham' && x.id !== 'arkham_witch')) {
      for (const [dx, dz] of [[0, 0], [2, 1], [-3, 2]]) expect(ground(s.x + dx, s.z + dz)).toBeCloseTo(s.y, 5);
    }
    const a = w.arenas.find((x) => x.bosses.includes('cthulhu'))!;
    for (const [dx, dz] of [[0, 0], [30, 10], [-20, -35]]) expect(ground(a.x + dx, a.z + dz)).toBeCloseTo(a.y, 5);
  });
});
