import { describe, expect, it } from 'vitest';
import { REGION_LAYOUTS } from '../src/data/regionFeatures';
import { getRegion } from '../src/data/regions';
import { SKYLINES } from '../src/data/skylines';
import { regionPlan } from '../src/world/regionPlan';
import { worldLayout } from '../src/world/placements';
import { regionRect } from '../src/world/worldMap';

const propsOf = (id: string) => [...regionPlan(getRegion(id)!).props.values()].flat();

describe("the realms' landmarks (round 12)", () => {
  it('each realm beyond the waking world stands its own landmarks, a great one at each and lesser about it', () => {
    for (const [id, layout] of Object.entries(REGION_LAYOUTS)) {
      if (!layout.landmark) continue;
      const own = propsOf(id).filter((p) => p.kind === layout.landmark);
      expect(own.length, id).toBeGreaterThanOrEqual(layout.landmarks * 2);
      expect(Math.max(...own.map((p) => p.h)), id).toBeGreaterThan(6);
    }
    expect(Object.values(REGION_LAYOUTS).filter((l) => l.landmark).map((l) => l.landmark).sort()).toEqual(['block', 'cone', 'globe', 'pyramid', 'spire', 'tower']);
  });

  it("K'n-yan, under the earth, has no New England houses and no street lamps", () => {
    const kinds = new Set(propsOf('kn_yan').map((p) => p.kind));
    expect(kinds.has('house')).toBe(false);
    expect(kinds.has('lamp')).toBe(false);
  });

  it("the far silhouettes stand beyond walking reach, Kadath's in the Dreamlands among them", () => {
    expect(SKYLINES.dreamlands.some((f) => f.kind === 'peak')).toBe(true);
    for (const [id, list] of Object.entries(SKYLINES)) {
      const rc = regionRect(getRegion(id)!);
      for (const f of list) {
        const [x, z] = [rc.x0 + f.at[0], rc.z0 + f.at[1]];
        for (const sign of worldLayout().signs.filter((s) => s.region === id)) expect(Math.hypot(sign.x - x, sign.z - z), `${id} by ${sign.id}`).toBeGreaterThan(300);
      }
    }
  });
});
