/**
 * Art palette (spec §2): charcoal, bone, rust, sea-grey, plus the only three saturated
 * colours in the game. Colours are sRGB triples in 0..1 and shaders use them as-is.
 */

import type { CreaturePalette } from '../data/schema';
import { GRADE } from '../data/tuning';

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const BASE = {
  charcoal: hexToRgb('#1d1c1f'),
  bone: hexToRgb('#d9d0b8'),
  rust: hexToRgb('#74493a'),
  seaGrey: hexToRgb('#5d6c70'),
};

export const ANOMALY = {
  magenta: hexToRgb('#D80073'), // Eldritch Magenta
  purple: hexToRgb('#6A0DAD'), // Cosmic Purple
  green: hexToRgb('#2BFFA0'), // Void Green
};

const WHITE: Rgb = [1, 1, 1];

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const scaleRgb = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

export const luma = (c: Rgb): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Hue, saturation, value, each in 0..1. */
export function rgbToHsv(c: Rgb): Rgb {
  const max = Math.max(c[0], c[1], c[2]);
  const d = max - Math.min(c[0], c[1], c[2]);
  let h = 0;
  if (d > 0) {
    if (max === c[0]) h = (c[1] - c[2]) / d;
    else if (max === c[1]) h = 2 + (c[2] - c[0]) / d;
    else h = 4 + (c[0] - c[1]) / d;
    h = (((h / 6) % 1) + 1) % 1;
  }
  return [h, max > 0 ? d / max : 0, max];
}

const unitLuma = (c: Rgb): Rgb => scaleRgb(c, 1 / luma(c));

/** Split-tone grade tints, normalised to luma 1: fog and shadows lean cold grey-green, lit areas warm bone/sepia. */
export const COLD_TINT: Rgb = unitLuma(hexToRgb('#4e5b56'));
export const WARM_TINT: Rgb = unitLuma(hexToRgb('#d6c4a0'));


/** The grade's tint at luma `l` (the post shader mirrors this), so `l * gradeTint(l)` is the graded colour. */
export function gradeTint(l: number): Rgb {
  const [lo, hi] = GRADE.split;
  const t = Math.min(1, Math.max(0, (l - lo) / (hi - lo)));
  return mixRgb(COLD_TINT, WARM_TINT, t * t * (3 - 2 * t));
}

/** Hues of the three anomaly colours, for colour isolation. */
export const ANOMALY_HUES: Rgb = [
  rgbToHsv(ANOMALY.magenta)[0],
  rgbToHsv(ANOMALY.purple)[0],
  rgbToHsv(ANOMALY.green)[0],
];

/** Quantisation palette (at most 64 colours): the graded ramp (cold darks to warm lights), sea-grey, rust, anomaly ramps. */
export function buildPalette(): Rgb[] {
  const out: Rgb[] = [];
  for (let i = 0; i < 24; i++) {
    const l = Math.pow(i / 23, 1.5);
    const t = scaleRgb(gradeTint(l), l);
    out.push([Math.min(t[0], 1), Math.min(t[1], 1), Math.min(t[2], 1)]);
  }
  for (const base of [BASE.seaGrey, BASE.rust]) {
    for (let i = 0; i < 8; i++) {
      out.push(mixRgb(scaleRgb(base, 0.3), mixRgb(base, BASE.bone, 0.35), i / 7));
    }
  }
  for (const a of Object.values(ANOMALY)) {
    out.push(scaleRgb(a, 0.25), scaleRgb(a, 0.5), scaleRgb(a, 0.75), a);
    out.push(mixRgb(a, WHITE, 0.35), mixRgb(a, WHITE, 0.65));
  }
  return out;
}

/** Muted creature palettes (dark, mid, light), all low-saturation: only `glow` markings carry colour. */
export const CREATURE_COLORS: Readonly<Record<CreaturePalette, { dark: Rgb; mid: Rgb; light: Rgb }>> = {
  sea: { dark: hexToRgb('#26312f'), mid: hexToRgb('#52625d'), light: hexToRgb('#8c9a90') },
  bone: { dark: hexToRgb('#4a4538'), mid: hexToRgb('#9a927c'), light: hexToRgb('#d9d0b8') },
  charcoal: { dark: hexToRgb('#121114'), mid: hexToRgb('#2e2c32'), light: hexToRgb('#4e4b54') },
  rust: { dark: hexToRgb('#2e1e18'), mid: hexToRgb('#5e3a2c'), light: hexToRgb('#8f6a58') },
  flesh: { dark: hexToRgb('#4a3530'), mid: hexToRgb('#8a6a60'), light: hexToRgb('#c4a393') },
  fungus: { dark: hexToRgb('#4a3a3e'), mid: hexToRgb('#8a6d72'), light: hexToRgb('#bfa3a6') },
  rubber: { dark: hexToRgb('#0d0d10'), mid: hexToRgb('#24242c'), light: hexToRgb('#40404c') },
  pallid: { dark: hexToRgb('#5a5a58'), mid: hexToRgb('#a8a8a2'), light: hexToRgb('#e2e0d8') },
  mold: { dark: hexToRgb('#232a20'), mid: hexToRgb('#45503c'), light: hexToRgb('#717c62') },
  sand: { dark: hexToRgb('#3e3526'), mid: hexToRgb('#7a6a4c'), light: hexToRgb('#b3a27c') },
  ichor: { dark: hexToRgb('#0b0b0e'), mid: hexToRgb('#1e1c24'), light: hexToRgb('#383442') },
  stone: { dark: hexToRgb('#34343a'), mid: hexToRgb('#66666a'), light: hexToRgb('#9a9894') },
};
