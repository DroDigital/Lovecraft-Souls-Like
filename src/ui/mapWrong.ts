/**
 * A failing mind draws the map wrong (round 26): from the Fractured on, the marks of places and people
 * slide a little off where they are, the investigator's own arrow with them, and now and then a star
 * is drawn where there is no Elder Sign. They settle and slide again every few seconds, so a map
 * looked at twice is not the same. Pure: no DOM.
 */

import { hash2 } from '../core/rng';
import { madnessOf } from '../systems/sanity';

/** How wrong the map is at `sanity`: 0 from the Uneasy's floor up, 1 at none. */
export const madness = madnessOf;

/** The seconds a slide lasts before the marks settle somewhere else. */
export const SLIDE = 7;

const hashOf = (s: string): number => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** The pixels a mark named `id` is off by, in the slide beginning `bucket` (time divided by SLIDE): up to 7 at the most of madness. */
export function slip(id: string, sanity: number, bucket: number): { dx: number; dy: number } {
  const m = madness(sanity);
  if (m <= 0) return { dx: 0, dy: 0 };
  const h = hashOf(id);
  return { dx: (hash2(h, bucket, 1) - 0.5) * 14 * m, dy: (hash2(h, bucket, 2) - 0.5) * 14 * m };
}

/** Where a star that is not there is drawn, in pixels from the view's centre, or null while the mind holds (one per slide, past a third of madness). */
export function falseStar(sanity: number, bucket: number, reach: number): { dx: number; dy: number } | null {
  if (madness(sanity) < 0.33) return null;
  const a = hash2(bucket, 3, 4) * Math.PI * 2;
  const r = reach * (0.3 + 0.6 * hash2(bucket, 5, 6));
  return { dx: Math.sin(a) * r, dy: Math.cos(a) * r };
}
