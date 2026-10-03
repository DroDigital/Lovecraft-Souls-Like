/**
 * What the menu's skin is drawn with (round 38): a seeded random, the easings, and the one way a panel's
 * words are set at a moment of the opening. Pure numbers and styles.
 */

/** A small seeded random (mulberry32): the same box gets the same mist each time. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number): number => 1 - (1 - clamp01(x)) ** 3;

/** Sets how a panel's words stand at one moment of an opening; every field left out is the resting state. */
export function say(panel: HTMLElement, base: string, o: { opacity?: number; filter?: string } = {}): void {
  panel.style.opacity = o.opacity === undefined || o.opacity >= 1 ? '' : String(Math.max(0, o.opacity));
  panel.style.transform = base;
  panel.style.filter = o.filter ?? '';
}
