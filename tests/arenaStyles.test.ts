import { describe, expect, it } from 'vitest';
import { ARENA_STYLES, MIN_ARENA } from '../src/data/arenaStyles';
import { ENTITIES } from '../src/data/registry';
import { propCollider, type Prop } from '../src/world/props';
import { worldLayout } from '../src/world/placements';
import { colliderBounds } from '../src/world/colliders';

// Round 13: every arena was the one ring of stones, some too small to fight in.
describe('boss grounds', () => {
  const w = worldLayout();

  it('style only bosses that exist', () => {
    const ids = new Set(ENTITIES.map((e) => e.id));
    expect(Object.keys(ARENA_STYLES).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('give every open arena room to fight, and dress it', () => {
    for (const a of w.arenas) {
      expect(a.radius, a.bosses[0]).toBeGreaterThanOrEqual(MIN_ARENA);
      expect(a.stones.length + a.decor.length, a.bosses[0]).toBeGreaterThan(0);
    }
  });

  it('leave walkable gaps in every ring', () => {
    const reach = (p: Prop): number => { const c = propCollider(p); if (!c) return 0; const b = colliderBounds(c); return Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2; };
    const bad: string[] = [];
    for (const a of w.arenas) {
      const ring = a.decor.filter((p) => Math.hypot(p.x - a.x, p.z - a.z) > a.radius && reach(p) > 0).sort((p, q) => Math.atan2(p.z - a.z, p.x - a.x) - Math.atan2(q.z - a.z, q.x - a.x));
      ring.forEach((p, k) => {
        const q = ring[(k + 1) % ring.length];
        const gap = Math.hypot(p.x - q.x, p.z - q.z) - reach(p) - reach(q);
        if (ring.length > 1 && gap < 2.4) bad.push(`${a.bosses[0]}: a gap of ${gap.toFixed(1)} m`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('make every dungeon boss room a great hall, its dressing clear of the bosses', () => {
    const bad: string[] = [];
    for (const d of w.dungeons) {
      for (const r of d.layout.rooms.filter((x) => x.def.boss && x.def.kind === 'hall')) if (r.size !== 3) bad.push(`${r.def.id} is not wide`);
    }
    for (const s of w.spawns.filter((x) => x.id.startsWith('boss:'))) {
      const props = [...w.dungeons.flatMap((d) => d.decor), ...w.arenas.flatMap((a) => a.decor)];
      for (const p of props) {
        const c = propCollider(p);
        if (!c) continue;
        const b = colliderBounds(c);
        if (s.at.x > b.x0 - 1.5 && s.at.x < b.x1 + 1.5 && s.at.z > b.z0 - 1.5 && s.at.z < b.z1 + 1.5) bad.push(`${s.id} stands in its ${p.kind}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
