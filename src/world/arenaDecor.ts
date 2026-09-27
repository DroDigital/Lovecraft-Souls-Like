/**
 * The dressing of a boss's ground (playtest round 13; data/arenaStyles.ts) as props: the ring of an
 * open arena's pieces (when not standing stones), its heart, and braziers about its edge; in a
 * dungeon's boss room, the heart and the braziers only. Deterministic from where it stands. Drawn
 * with the world's props (render/propMeshes.ts), which light the fires. Pure: no Three.js.
 */

import { createRng, hash2 } from '../core/rng';
import type { ArenaStyle } from '../data/arenaStyles';
import type { PropKind } from '../data/regions';
import { WORLD } from '../data/tuning';
import { colliderBounds } from './colliders';
import { propAt, propCollider, type Prop } from './props';

/** Metres between ring pieces by kind, at their usual size. */
const SPACING: Partial<Record<PropKind, number>> = { tree: 4.5, monolith: 6, pillar: 6, obelisk: 6, rock: 5, ruin: 9, spire: 14, tower: 16, cone: 11, globe: 8, block: 10 };

const scaled = (p: Prop, k: number): Prop => ({ ...p, w: p.w * k, d: p.d * k, h: p.h * k });

const GAP = 2.5; // metres the least way through a ring, between two pieces' colliders

/** How far a prop's collider reaches from its centre (0 when it has none). */
function reach(p: Prop): number {
  const c = propCollider(p);
  if (!c) return 0;
  const b = colliderBounds(c);
  return Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2;
}

/** The ring's pieces less any that would close a way through: each keeps GAP from the last kept, and the last from the first. */
function passable(ring: Prop[]): Prop[] {
  const out: Prop[] = [];
  const apart = (a: Prop, b: Prop): boolean => Math.hypot(a.x - b.x, a.z - b.z) - reach(a) - reach(b) >= GAP;
  for (const p of ring) if (!out.length || (apart(out[out.length - 1], p) && (out.length < 2 || apart(p, out[0])))) out.push(p);
  return out;
}

/** A prop of `kind` at (x, z), standing at height `y` (a pad's, or a dungeon floor's). */
function at(kind: PropKind, x: number, z: number, y: number, rng: () => number, k = 1, yaw?: number): Prop {
  return scaled(propAt(kind, x, y, z, rng, yaw), k);
}

/** Braziers about a circle: fire pits, their flames lighting the ground. */
function fires(n: number, x: number, z: number, y: number, r: number, rng: () => number): Prop[] {
  return Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2 + Math.PI / n;
    return at('firepit', x + Math.cos(t) * r, z + Math.sin(t) * r, y, rng);
  });
}

/**
 * An open arena's dressing about (x, z) at height `y`: its ring just outside `radius` (none when
 * standing stones: placements.ts raises those), its heart (toward the far side from the boss, who
 * stands at the centre, unless a well is there), and its braziers inside the ring.
 */
export function arenaProps(style: ArenaStyle, x: number, z: number, y: number, radius: number, well: boolean): Prop[] {
  const rng = createRng((hash2(Math.round(x), Math.round(z), WORLD.seed + 13) * 4294967296) >>> 0);
  const out: Prop[] = [];
  const kind = style.ring;
  if (kind !== 'stones') {
    const k = style.ringScale ?? 1;
    const ring = radius + 1.5 + (kind === 'tower' || kind === 'spire' || kind === 'cone' ? 3 * k : 0);
    const n = Math.max(6, Math.round((2 * Math.PI * ring) / ((style.spacing ?? SPACING[kind] ?? 6) * (style.spacing ? 1 : k))));
    const pieces = Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.1;
      const p = at(kind, x + Math.cos(t) * ring, z + Math.sin(t) * ring, y, rng, k * (0.85 + 0.3 * rng()));
      return kind === 'ruin' ? { ...p, yaw: -t } : p;
    });
    out.push(...passable(pieces));
  }
  if (style.centre) out.push(at(style.centre.kind, x, well ? z : z - radius * 0.55, y, rng, style.centre.scale, 0));
  out.push(...fires(style.fires, x, z, y, radius - 2, rng));
  return out;
}

/** A dungeon boss room's dressing about its centre (x, z): the heart at its far side, the braziers in its corners. */
export function roomProps(style: ArenaStyle, x: number, z: number, y: number, half: number, away: { x: number; z: number }): Prop[] {
  const rng = createRng((hash2(Math.round(x), Math.round(z), WORLD.seed + 31) * 4294967296) >>> 0);
  const out: Prop[] = [];
  if (style.centre) out.push(at(style.centre.kind, x + away.x * half * 0.6, z + away.z * half * 0.6, y, rng, Math.min(style.centre.scale, half / 6), 0));
  const f = Math.min(style.fires, 4);
  const c = half - 2.5;
  const corners = [[1, 1], [-1, -1], [1, -1], [-1, 1]].slice(0, f);
  for (const [a, b] of corners) out.push(at('firepit', x + a * c, z + b * c, y, rng));
  return out;
}
