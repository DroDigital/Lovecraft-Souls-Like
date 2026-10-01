/**
 * A realm's grade and its 64-colour palette (playtest round 32; data/looks.ts). The grade is a
 * gradient map: the picture's brightness picks a colour along four stops (ink, shade, mid, high), each
 * normalised to its own brightness, so a pixel keeps its light and takes the realm's colour; the post
 * shader mirrors `gradeTint`. The palette the picture is quantised to is built from the same grade,
 * the realm's two accent hues (each as it comes out of the grade), the lantern's warm steps, the
 * anomaly colours and five steps of its mist. Pure.
 */

import type { Look } from '../data/looks';
import { ANOMALY, luma, mixRgb, scaleRgb, type Rgb } from './palette';

/** Brightness at which each of the grade's four stops is whole (the post shader's smoothsteps run between them). */
export const GRADE_AT = [0, 0.08, 0.35, 0.8] as const;
export const GRADE_EDGES = [0.08, 0.35, 0.8] as const;

const unit = (c: Rgb): Rgb => scaleRgb(c, 1 / Math.max(luma(c), 0.02));
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The four stops, each at brightness 1 (multiplied by a pixel's own brightness). */
export const gradeTints = (look: Look): readonly [Rgb, Rgb, Rgb, Rgb] => [unit(look.grade[0]), unit(look.grade[1]), unit(look.grade[2]), unit(look.grade[3])];

/** The grade's tint at brightness `l` (the shader's `gradeTint`): `l * gradeTint` is the graded colour. */
export function gradeTint(tints: readonly Rgb[], l: number): Rgb {
  let t = mixRgb(tints[0], tints[1], smooth(0, GRADE_EDGES[0], l));
  t = mixRgb(t, tints[2], smooth(GRADE_EDGES[0], GRADE_EDGES[1], l));
  return mixRgb(t, tints[3], smooth(GRADE_EDGES[1], GRADE_EDGES[2], l));
}

const ACCENT_STEPS = [0.08, 0.15, 0.24, 0.35, 0.5, 0.68, 0.9] as const;
const LANTERN_STEPS = [0.25, 0.4, 0.55, 0.7, 0.85, 1] as const;
const MIST_STEPS = [0.22, 0.36, 0.54, 0.76, 1] as const;
const WHITE: Rgb = [1, 1, 1];
/** The lantern's own warm light (the investigator carries it into every realm): its steps keep lantern-lit ground warm where a cold grade has no warm colour to snap to. */
const LANTERN: Rgb = [1, 0.82, 0.58];

/** Where the anomaly colours lie in a palette: from, and to (not including); the post shader makes them dearer to match (shaders/post.ts), so an ordinary pixel never snaps to one. */
export const ANOMALY_FROM = 24 + 2 * ACCENT_STEPS.length + LANTERN_STEPS.length;
export const ANOMALY_TO = ANOMALY_FROM + 3 * 5;

const clamp = (c: Rgb): Rgb => [Math.min(c[0], 1), Math.min(c[1], 1), Math.min(c[2], 1)];

/** At most 64 colours: the graded ramp, each accent as it comes out of the grade, the lantern's warm steps, the anomalies' ramps, the mist's steps. */
export function buildRealmPalette(look: Look): Rgb[] {
  const tints = gradeTints(look);
  const share = 1 - look.native; // how much of a pixel the grade takes
  const out: Rgb[] = [];
  for (let i = 0; i < 24; i++) {
    const l = Math.pow(i / 23, 1.5);
    out.push(clamp(scaleRgb(gradeTint(tints, l), l)));
  }
  for (const colour of [...look.accents, null]) {
    for (const l of colour ? ACCENT_STEPS : LANTERN_STEPS) {
      const own = scaleRgb(colour ?? LANTERN, l / Math.max(luma(colour ?? LANTERN), 0.05));
      out.push(clamp(mixRgb(own, scaleRgb(gradeTint(tints, l), l), share)));
    }
  }
  for (const a of Object.values(ANOMALY)) out.push(scaleRgb(a, 0.5), scaleRgb(a, 0.75), a, mixRgb(a, WHITE, 0.35), mixRgb(a, WHITE, 0.65));
  for (const k of MIST_STEPS) out.push(clamp(scaleRgb(look.mist, k)));
  return out;
}
