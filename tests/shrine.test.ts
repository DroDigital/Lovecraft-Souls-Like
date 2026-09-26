import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/tuning';
import { createWorldGame } from '../src/systems/game';
import { colliderBounds, resolveCapsule } from '../src/world/colliders';
import { worldLayout } from '../src/world/placements';
import { SHRINE, shrineColliders } from '../src/world/shrine';
import { DIRS, yawOfDir } from '../src/world/worldMap';

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

  it('leaves room to rest: every sign can be reached, and its rest point is clear', () => {
    const g = createWorldGame();
    for (const s of worldLayout().signs) {
      const f = DIRS[s.face];
      const p = { x: s.x + f.x * 2, y: s.y, z: s.z + f.z * 2 }; // walking up to it
      resolveCapsule(g.world, p, 0.4, 1.8);
      expect(Math.hypot(p.x - s.x, p.z - s.z), s.id).toBeLessThanOrEqual(WORLD.reach);
      const r = { ...s.rest, y: s.y };
      resolveCapsule(g.world, r, 0.4, 1.8);
      expect(Math.hypot(r.x - s.rest.x, r.z - s.rest.z), s.id).toBe(0);
    }
  });
});
