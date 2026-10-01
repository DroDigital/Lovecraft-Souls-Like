/**
 * What the named wear (round 34): the story's people were drawn on three bodies (the upright, the hunched, the robed) and
 * told apart by a colour. A recipe's `gear` gives each what the story gives them: the witch her pointed hat, the tall man his
 * hat, coat and the key on its chain, the doctor his cooling pipes, the old man his cane and beard. Drawn in three passes about
 * the body plan's own anchors: `before` (what lies behind: a halo, a hood, pipes), `torso` (what hangs from the hips: a coat,
 * tatters, a chain) and `after` (hats, beards, masks, horns, canes and staves). Nothing is taller than six pixels above a head,
 * so nothing is lost off the top of its cell.
 */

import type { Gear } from '../../data/schema';
import { GROUND, type Sketch } from './parts';
import { capsule, ellipse, poly, type Ink } from './raster';

/** Where a body plan carries things: the head's centre and radii, its face (radii and how far below the head's centre), the shoulders, the hips and the right hand. */
export interface Anchors {
  x: number;
  head: number;
  rx: number;
  ry: number;
  face: readonly [rx: number, ry: number, dy: number];
  sh: number;
  hip: number;
  hand: readonly [number, number];
}

export type Pass = 'before' | 'torso' | 'after';

const GOLD: Ink = { rgb: [0.78, 0.68, 0.42] };
const BONE: Ink = { rgb: [0.84, 0.83, 0.78] };
const METAL: Ink = { rgb: [0.5, 0.55, 0.58] };

type Draw = (s: Sketch, a: Anchors) => void;

const top = (a: Anchors): number => a.head - a.ry; // the crown of the head

const HATS: Record<'brim' | 'tall' | 'tricorn' | 'witch', Draw> = {
  brim: (s, a) => {
    capsule(s.c, a.x, top(a) - 2.2, a.x, top(a) + 1.5, 3.6, 3.9, s.dark);
    ellipse(s.c, a.x, top(a) + 1.8, a.rx + 3, 1.5, s.dark);
    capsule(s.c, a.x - 3.5, top(a) + 0.2, a.x + 3.5, top(a) + 0.2, 0.5, 0.5, s.light);
  },
  tall: (s, a) => {
    capsule(s.c, a.x, top(a) - 5, a.x, top(a) + 1.6, 3.3, 3.5, s.dark);
    ellipse(s.c, a.x, top(a) + 1.8, a.rx + 1.6, 1, s.dark);
    capsule(s.c, a.x - 3.4, top(a) + 0.5, a.x + 3.4, top(a) + 0.5, 0.6, 0.6, GOLD);
  },
  tricorn: (s, a) => {
    poly(s.c, [[a.x - 8, top(a) + 2.6], [a.x - 3.5, top(a) - 3.4], [a.x + 3.5, top(a) - 3.4], [a.x + 8, top(a) + 2.6], [a.x, top(a) + 0.8]], s.dark);
    capsule(s.c, a.x - 3.5, top(a) - 3.2, a.x + 3.5, top(a) - 3.2, 0.4, 0.4, GOLD);
  },
  witch: (s, a) => {
    poly(s.c, [[a.x - 5.2, top(a) + 1.4], [a.x + 1, top(a) - 5.6], [a.x + 5.2, top(a) + 1.4]], s.dark);
    ellipse(s.c, a.x, top(a) + 1.8, a.rx + 3.4, 1.4, s.dark);
  },
};

const BEFORE: Partial<Record<Gear, Draw>> = {
  cowl: (s, a) => {
    ellipse(s.c, a.x, a.head + 0.6, a.rx + 2.4, a.ry + 2.2, s.dark);
    poly(s.c, [[a.x - 9, a.sh + 4], [a.x - 5, a.head + 3], [a.x + 5, a.head + 3], [a.x + 9, a.sh + 4], [a.x + 7, a.sh + 9], [a.x - 7, a.sh + 9]], s.dark);
  },
  halo: (s, a) => {
    const [cy, rx, ry] = [top(a) - 1.4, a.rx + 2, 1.7];
    for (let k = 0; k < 14; k++) {
      const [t0, t1] = [(k / 14) * Math.PI * 2, ((k + 1) / 14) * Math.PI * 2];
      capsule(s.c, a.x + Math.cos(t0) * rx, cy + Math.sin(t0) * ry, a.x + Math.cos(t1) * rx, cy + Math.sin(t1) * ry, 0.55, 0.55, s.eye);
    }
  },
  pipes: (s, a) => {
    for (const [k, dy] of [[0, 0], [1, 3]] as const) {
      capsule(s.c, a.x - 5, a.sh + 3 + dy, a.x - 12 - k * 1.5, a.sh - 1 + dy, 0.9, 0.9, METAL);
      capsule(s.c, a.x - 12 - k * 1.5, a.sh - 1 + dy, a.x - 12 - k * 1.5, a.hip + 2 + dy, 0.9, 0.9, METAL);
    }
    capsule(s.c, a.x - 14.5, a.hip - 3, a.x - 14.5, a.hip + 5, 2.1, 2.1, METAL); // the canister
  },
};

const TORSO: Partial<Record<Gear, Draw>> = {
  coat: (s, a) => {
    poly(s.c, [[a.x - 5.6, a.hip - 3], [a.x + 5.6, a.hip - 3], [a.x + 7.8, a.hip + 15], [a.x - 7.8, a.hip + 15]], s.body);
    capsule(s.c, a.x, a.sh + 2, a.x, a.hip + 15, 0.45, 0.45, s.dark); // the lapel's seam
    poly(s.c, [[a.x - 3.4, a.sh + 0.5], [a.x, a.sh + 5], [a.x + 3.4, a.sh + 0.5]], s.dark); // and its collar
  },
  tatters: (s, a) => {
    for (let k = -3; k <= 3; k++) capsule(s.c, a.x + k * 1.8, a.hip, a.x + k * 2.1 + (s.rng() - 0.5) * 3, a.hip + 8 + s.rng() * 9, 0.7, 0.2, s.dark);
  },
  chain: (s, a) => {
    capsule(s.c, a.x - 3.2, a.sh + 6, a.x + 3, a.sh + 9.5, 0.35, 0.35, GOLD);
    capsule(s.c, a.x + 3, a.sh + 9.5, a.x + 3, a.sh + 12, 0.3, 0.3, GOLD); // the key
    ellipse(s.c, a.x + 3, a.sh + 12.6, 0.8, 1, GOLD);
  },
};

const AFTER: Partial<Record<Gear, Draw>> = {
  ...HATS,
  horns: (s, a) => {
    for (const side of [-1, 1] as const) {
      capsule(s.c, a.x + side * 3, top(a) + 1, a.x + side * 4.6, top(a) - 2.4, 1.1, 0.7, BONE);
      capsule(s.c, a.x + side * 4.6, top(a) - 2.4, a.x + side * 3.6, top(a) - 5, 0.7, 0.3, BONE);
    }
  },
  beard: (s, a) => {
    const [fx, fy, dy] = a.face;
    poly(s.c, [[a.x - fx * 0.85, a.head + dy + fy * 0.3], [a.x + fx * 0.85, a.head + dy + fy * 0.3], [a.x + 1.5, a.head + dy + fy + 4], [a.x - 1.5, a.head + dy + fy + 4]], BONE);
  },
  mask: (s, a) => {
    const [fx, fy, dy] = a.face;
    ellipse(s.c, a.x, a.head + dy, fx + 0.3, fy + 0.3, GOLD);
    for (const side of [-1, 1] as const) capsule(s.c, a.x + side * fx * 0.4 - 0.8, a.head + dy - 0.8, a.x + side * fx * 0.4 + 0.8, a.head + dy - 0.8, 0.4, 0.4, s.dark);
  },
  cane: (s, a) => {
    capsule(s.c, a.hand[0], a.hand[1] - 1, a.hand[0] + 1.2, GROUND - 1, 0.6, 0.6, s.dark);
    ellipse(s.c, a.hand[0], a.hand[1] - 1.6, 1.3, 1.3, GOLD);
  },
  staff: (s, a) => {
    capsule(s.c, a.hand[0], a.hand[1] - 24, a.hand[0] + 0.6, GROUND - 1, 0.6, 0.6, s.dark);
    ellipse(s.c, a.hand[0], a.hand[1] - 25, 1.9, 1.9, s.eye);
  },
};

const PASSES: Record<Pass, Partial<Record<Gear, Draw>>> = { before: BEFORE, torso: TORSO, after: AFTER };

/** Draws what the recipe's gear puts in this pass. */
export function dress(s: Sketch, pass: Pass, a: Anchors): void {
  for (const g of s.r.gear ?? []) PASSES[pass][g]?.(s, a);
}
