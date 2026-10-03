import { describe, expect, it } from 'vitest';
import { ENTITIES } from '../src/data/registry';
import { REGIONS } from '../src/data/regions';
import { regionPlan } from '../src/world/regionPlan';
import { worldLayout } from '../src/world/placements';

/** Every creature the world can place (round 38: a creature never met is art, sound and a bestiary page nobody sees, and a bestiary that cannot be completed). */
function placed(): Map<string, number> {
  const seen = new Map<string, number>();
  const add = (id: string): void => void seen.set(id, (seen.get(id) ?? 0) + 1);
  const w = worldLayout();
  for (const s of w.spawns) add(s.entity);
  for (const a of w.arenas) a.bosses.forEach(add);
  for (const d of w.dungeons) for (const r of d.layout.rooms) (r.def.boss ?? []).forEach(add);
  for (const r of REGIONS) for (const list of regionPlan(r).spawns.values()) for (const s of list) add(s.entity);
  return seen;
}

describe('every creature is somewhere in the world (round 38)', () => {
  const seen = placed();

  it('places every creature of the roster at least once', () => {
    expect(ENTITIES.filter((e) => !seen.has(e.id)).map((e) => e.id)).toEqual([]);
  });

  it('places every entry of every region’s spawn table in that region: none is a weight that never comes up', () => {
    for (const r of REGIONS) {
      const here = new Set<string>();
      for (const list of regionPlan(r).spawns.values()) for (const s of list) here.add(s.entity);
      expect(Object.keys(r.spawns.table).filter((id) => !here.has(id)), r.id).toEqual([]);
    }
  });
});
