/**
 * Where foes' nameplates go so that none lies over another (playtest round 32: two foes standing
 * together wore their plates on one spot, and the names ran into one unreadable word). Plates are
 * placed in turn, the one that matters most first (the foe locked on to, then the nearest); one that
 * would lie over a plate already placed is lifted above it, and one that finds no room within a few
 * lifts is left out (the bar of a foe far behind another's adds nothing), unless it is `keep`'s. Pure.
 */

export interface PlateIn {
  id: number;
  x: number; // the middle of its width, in HUD pixels
  y: number; // its top
  width: number;
  keep?: boolean; // shown wherever it falls
}

export interface PlateOut {
  id: number;
  x: number;
  y: number;
}

export const PLATE_HEIGHT = 22; // pixels: a name, its bar and the space between
export const PLATE_SIDE = 36; // pixels the damage a run of blows adds up to takes, to its right

/** How wide a plate is, by the length of its name (about 6.4 px a letter at the HUD's size, as little as the bar's 74). */
export const plateWidth = (name: string): number => Math.max(74, Math.round(name.length * 6.4 + 8));

const overlaps = (a: PlateIn, b: PlateIn, gap: number): boolean =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 + PLATE_SIDE * 0.5 + gap && a.y < b.y + PLATE_HEIGHT + gap && b.y < a.y + PLATE_HEIGHT + gap;

/** The plates that find a place, each at its own spot or lifted clear of those placed before it (none placed over another). */
export function layoutPlates(plates: readonly PlateIn[], gap = 2, lifts = 4): PlateOut[] {
  const placed: PlateIn[] = [];
  for (const p of plates) {
    const at = { ...p };
    for (let k = 0; k <= lifts; k++) {
      const over = placed.find((q) => overlaps(at, q, gap));
      if (!over) break;
      at.y = over.y - PLATE_HEIGHT - gap; // above the one it lay on
    }
    if (!p.keep && placed.some((q) => overlaps(at, q, gap))) continue;
    placed.push(at);
  }
  return placed.map(({ id, x, y }) => ({ id, x, y }));
}
