import { describe, expect, it } from 'vitest';
import { getEntity } from '../src/data/registry';
import { REGIONS } from '../src/data/regions';
import { ROSTER } from '../src/data/roster';
import { TIERS } from '../src/data/schema';
import { worldLayout } from '../src/world/placements';
import { placements, reachableRegions, validateWorld } from '../src/world/validateWorld';

describe('the world', () => {
  it('validates: dungeons lay out, sites fit, gates pair, every spot is walkable', () => {
    expect(validateWorld()).toEqual([]);
  });

  it('every roster entity is reachable: in a spawn table, a boss arena or an ally location', () => {
    const where = placements();
    const missing = TIERS.flatMap((t) => ROSTER[t]).filter((id) => !where.has(id));
    expect(missing).toEqual([]);
    for (const id of ROSTER.ally) expect(where.get(id)!.some((w) => w.startsWith('ally:')), id).toBe(true);
  });

  it('every region can be reached from the hub, and every region boss waits in its region', () => {
    expect([...reachableRegions()].sort()).toEqual(REGIONS.map((r) => r.id).sort());
    const spawns = worldLayout().spawns;
    for (const r of REGIONS) {
      for (const b of r.bosses) expect(spawns.find((s) => s.id === `boss:${b}`)?.region, b).toBe(r.id);
    }
  });

  it('bosses, lairs and allies are placed once; only bosses and lairs stay slain', () => {
    const spawns = worldLayout().spawns;
    for (const s of spawns) {
      expect(getEntity(s.entity), s.id).toBeDefined();
      expect(s.unique, s.id).toBe(s.id.startsWith('boss:'));
    }
  });
});
