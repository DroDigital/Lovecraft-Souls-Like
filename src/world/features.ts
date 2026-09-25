/**
 * Features (spec §3D): the ordered places a region plan puts between its sites, each a cluster of
 * props with a shape and a purpose: a grove of trees with undergrowth, a graveyard walled in stone
 * with a gate and its graves in rows, a ring of standing stones about an altar, a ruined house's
 * broken walls and rubble, a rock outcrop, and a camp of foes around a fire pit. Pure.
 */

import type { XZ } from '../core/geom';
import { createRng, type Rng } from '../core/rng';
import type { PropKind } from '../data/regions';
import { makeProp, type Prop } from './props';

export const FEATURE_KINDS = ['grove', 'graveyard', 'circle', 'ruin', 'outcrop', 'camp'] as const;
export type FeatureKind = (typeof FEATURE_KINDS)[number];

export interface Feature {
  kind: FeatureKind;
  x: number;
  z: number;
  r: number; // metres: its footprint
  yaw: number; // its front faces this way (the nearest road)
  seed: number;
}

/** Footprint radius range of each kind. */
export const FEATURE_RADIUS: Readonly<Record<FeatureKind, readonly [number, number]>> = {
  grove: [18, 34],
  graveyard: [14, 18],
  circle: [9, 13],
  ruin: [7, 9],
  outcrop: [7, 11],
  camp: [6, 7],
};

export interface FeatureContext {
  pines: boolean; // conifers rather than dead hardwood
  free: (x: number, z: number) => boolean; // open ground: no road, site or other feature
}

/** A point of the feature's own frame: +z is its front, +x its left. */
export const local = (f: Pick<Feature, 'x' | 'z' | 'yaw'>, lx: number, lz: number): XZ => {
  const [s, c] = [Math.sin(f.yaw), Math.cos(f.yaw)];
  return { x: f.x + lx * c + lz * s, z: f.z - lx * s + lz * c };
};

function scatter(f: Feature, rng: Rng, n: number, spacing: number, ctx: FeatureContext, kinds: () => PropKind): Prop[] {
  const out: Prop[] = [];
  for (let tries = 0; out.length < n && tries < n * 6; tries++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * f.r;
    const [x, z] = [f.x + Math.sin(a) * d, f.z + Math.cos(a) * d];
    if (!ctx.free(x, z) || out.some((p) => Math.hypot(p.x - x, p.z - z) < spacing)) continue;
    out.push(makeProp(kinds(), x, z, rng));
  }
  return out;
}

function grove(f: Feature, rng: Rng, ctx: FeatureContext): Prop[] {
  const trees = Math.round((Math.PI * f.r * f.r) / 55);
  const tree = (): PropKind => (ctx.pines && rng() < 0.75 ? 'pine' : 'tree');
  return [
    ...scatter(f, rng, trees, 3.4, ctx, tree),
    ...scatter(f, rng, Math.round(trees / 3), 2, ctx, () => (rng() < 0.7 ? 'bush' : 'stump')),
    ...scatter(f, rng, Math.round(trees / 10), 3, ctx, () => 'rock'),
  ];
}

/** A stone wall run from local a to b, in segments of about six metres. */
function wallRun(f: Feature, rng: Rng, a: XZ, b: XZ, kind: PropKind = 'wall'): Prop[] {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.round(len / 6));
  const out: Prop[] = [];
  const along = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2; // the prop's own x runs a → b
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const p = local(f, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    out.push(makeProp(kind, p.x, p.z, rng, f.yaw + along, [len / n / 2, kind === 'wall' ? 0.3 : 0.35, kind === 'wall' ? 0.9 + 0.2 * rng() : 1 + 2 * rng()]));
  }
  return out;
}

function graveyard(f: Feature, rng: Rng): Prop[] {
  const [hw, hd] = [f.r * 0.8, f.r * 0.55];
  const gate = 2.2; // the gap in the front wall
  const out: Prop[] = [
    ...wallRun(f, rng, { x: -hw, z: -hd }, { x: hw, z: -hd }),
    ...wallRun(f, rng, { x: -hw, z: -hd }, { x: -hw, z: hd }),
    ...wallRun(f, rng, { x: hw, z: -hd }, { x: hw, z: hd }),
    ...wallRun(f, rng, { x: -hw, z: hd }, { x: -gate, z: hd }),
    ...wallRun(f, rng, { x: gate, z: hd }, { x: hw, z: hd }),
  ];
  for (let lz = -hd + 2.4; lz < hd - 2.4; lz += 3.2) {
    for (let lx = -hw + 2; lx < hw - 1.5; lx += 2.4) {
      if (rng() < 0.15 || (Math.abs(lx) < gate && lz > hd - 5)) continue;
      const p = local(f, lx + (rng() - 0.5) * 0.4, lz + (rng() - 0.5) * 0.3);
      const roll = rng();
      const kind: PropKind = roll < 0.68 ? 'grave' : roll < 0.9 ? 'cross' : 'obelisk';
      out.push(makeProp(kind, p.x, p.z, rng, f.yaw + (rng() - 0.5) * 0.25));
    }
  }
  const corner = local(f, -hw + 2, -hd + 2);
  out.push(makeProp('tree', corner.x, corner.z, rng));
  return out;
}

function circle(f: Feature, rng: Rng): Prop[] {
  const n = 7 + Math.floor(rng() * 5);
  const ring = f.r * 0.7;
  const out: Prop[] = [];
  for (let k = 0; k < n; k++) {
    if (rng() < 0.12) continue; // a fallen gap
    const a = (k / n) * Math.PI * 2;
    const p = { x: f.x + Math.sin(a) * ring, z: f.z + Math.cos(a) * ring };
    out.push(makeProp('monolith', p.x, p.z, rng, a + Math.PI / 2));
  }
  out.push(makeProp('altar', f.x, f.z, rng, f.yaw));
  return out;
}

function ruin(f: Feature, rng: Rng, ctx: FeatureContext): Prop[] {
  const [hw, hd] = [f.r * (0.55 + 0.15 * rng()), f.r * (0.45 + 0.15 * rng())];
  const sides: [XZ, XZ][] = [
    [{ x: -hw, z: -hd }, { x: hw, z: -hd }],
    [{ x: -hw, z: hd }, { x: hw, z: hd }],
    [{ x: -hw, z: -hd }, { x: -hw, z: hd }],
    [{ x: hw, z: -hd }, { x: hw, z: hd }],
  ];
  const out: Prop[] = [];
  for (const [a, b] of sides) if (rng() < 0.85) out.push(...wallRun(f, rng, a, b, 'ruin').filter(() => rng() < 0.8));
  out.push(...scatter({ ...f, r: Math.min(hw, hd) }, rng, 3 + Math.floor(rng() * 3), 1.6, ctx, () => 'rock').map((p) => ({ ...p, w: p.w * 0.5, h: p.h * 0.5 })));
  if (rng() < 0.5) out.push(makeProp('pillar', local(f, hw, hd).x, local(f, hw, hd).z, rng));
  return out;
}

function camp(f: Feature, rng: Rng): Prop[] {
  const out = [makeProp('firepit', f.x, f.z, rng, 0)];
  const logs = 2 + Math.floor(rng() * 2);
  for (let k = 0; k < logs; k++) {
    const a = rng() * Math.PI * 2;
    out.push(makeProp('log', f.x + Math.sin(a) * 2.6, f.z + Math.cos(a) * 2.6, rng, a + Math.PI / 2));
  }
  const back = local(f, 0, -f.r * 0.7);
  out.push(makeProp('ruin', back.x, back.z, rng, f.yaw));
  return out;
}

/** The feature's props. */
export function featureProps(f: Feature, ctx: FeatureContext): Prop[] {
  const rng = createRng(f.seed);
  switch (f.kind) {
    case 'grove':
      return grove(f, rng, ctx);
    case 'graveyard':
      return graveyard(f, rng);
    case 'circle':
      return circle(f, rng);
    case 'ruin':
      return ruin(f, rng, ctx);
    case 'outcrop':
      return scatter(f, rng, 5 + Math.floor(rng() * 5), 2.2, ctx, () => 'rock').map((p) => ({ ...p, w: p.w * 1.4, h: p.h * 1.5 }));
    case 'camp':
      return camp(f, rng);
  }
}
