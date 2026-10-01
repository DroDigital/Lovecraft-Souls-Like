/**
 * What stands along a hall's walls (round 30: the dungeons were bare stone boxes with a pillar or
 * two): by its kit, shelves of books, stone coffins, statues, stelae, pews, casks and crates, growths
 * of the deep and of the fungus; each built on a wall's own frame (`s` along it, `d` out from it), a
 * few small things strewn on the floor between them, and braziers in a hall's far corners. Render
 * only, and nothing it makes is solid: the walls it leans on are, and it stands no more than 60 cm
 * off them. Pure but for the geometry it makes.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { XZ } from '../core/geom';
import type { Rng } from '../core/rng';
import type { KitId } from '../data/kits';
import { box, tint } from './meshKit';
import { scaleRgb, type Rgb } from './palette';

/** The groups an item's geometry goes into (siteMeshes.ts gives each its material). */
export interface Out {
  wall: THREE.BufferGeometry[]; // the kit's stone
  wood: THREE.BufferGeometry[];
  beam: THREE.BufferGeometry[]; // relief on wood: drawn nearer (books on a shelf, planks)
  trim: THREE.BufferGeometry[]; // relief on a wall: drawn nearer
  glow: THREE.BufferGeometry[];
}

/** A wall's frame: where (s along it, d out from it into the room) is in the world, and which way it runs. */
export interface Wall {
  at(s: number, d: number): XZ;
  alongX: boolean;
}

export type Item = 'shelves' | 'crate' | 'barrel' | 'coffin' | 'statue' | 'stele' | 'pew' | 'growth' | 'rubble' | 'bones';

/** What each kit sets along its walls, in turn (a few repeat to weigh them). */
export const ITEMS: Readonly<Record<KitId, readonly Item[]>> = {
  masonry: ['coffin', 'stele', 'barrel', 'bones'],
  library: ['shelves', 'shelves', 'shelves', 'statue'],
  timber: ['shelves', 'crate', 'barrel', 'crate'],
  townhouse: ['shelves', 'crate', 'barrel'],
  cellar: ['barrel', 'crate', 'barrel', 'rubble'],
  mine: ['crate', 'rubble', 'barrel', 'rubble'],
  brick: ['barrel', 'crate', 'stele'],
  crypt: ['coffin', 'coffin', 'stele', 'bones'],
  church: ['pew', 'statue', 'coffin', 'pew'],
  marble: ['statue', 'statue', 'stele'],
  hill: ['stele', 'rubble'],
  drowned: ['growth', 'stele', 'growth', 'rubble'],
  sunken: ['growth', 'stele', 'rubble'],
  elder: ['stele', 'rubble'],
  basalt: ['coffin', 'stele', 'statue'],
  tsath: ['statue', 'stele'],
  dream: ['statue', 'stele', 'coffin'],
  onyx: ['stele', 'statue'],
  cyclopean: ['stele', 'growth', 'rubble'],
  fungoid: ['growth', 'growth', 'rubble'],
  void: [],
};

const DARK: Rgb = [0.34, 0.27, 0.2];
const IRON: Rgb = [0.24, 0.23, 0.25];
const BONE: Rgb = [0.78, 0.74, 0.64];
const BOOKS: readonly Rgb[] = [[0.5, 0.2, 0.18], [0.22, 0.32, 0.4], [0.62, 0.52, 0.3], [0.3, 0.38, 0.24], [0.4, 0.3, 0.42], [0.55, 0.45, 0.35]];

export interface Frame {
  wall: Wall;
  s: number;
  y: number; // the floor
  c: Rgb; // the kit's stone
  rng: Rng;
  out: Out;
}

const wb = (f: Frame, s: number, d: number, ws: number, wd: number, h: number, y: number, c: Rgb): THREE.BufferGeometry => {
  const p = f.wall.at(f.s + s, d);
  return box(f.wall.alongX ? ws : wd, h, f.wall.alongX ? wd : ws, p.x, f.y + y + h / 2, p.z, c);
};
const round = (f: Frame, s: number, d: number, r: number, h: number, y: number, c: Rgb, sides = 8, top = r): THREE.BufferGeometry => {
  const p = f.wall.at(f.s + s, d);
  return tint(new THREE.CylinderGeometry(top, r, h, sides).translate(p.x, f.y + y + h / 2, p.z), c);
};
const blob = (f: Frame, s: number, d: number, r: number, y: number, c: Rgb, squash = 0.7): THREE.BufferGeometry => {
  const p = f.wall.at(f.s + s, d);
  return tint(new THREE.IcosahedronGeometry(r, 0).scale(1, squash, 1).translate(p.x, f.y + y, p.z), c);
};

const BUILD: Record<Item, (f: Frame) => void> = {
  shelves(f) {
    const w = 1.9;
    f.out.wood.push(wb(f, 0, 0.26, w, 0.5, 2.8, 0, DARK));
    for (let row = 0; row < 5; row++) {
      let s = -w / 2 + 0.1;
      while (s < w / 2 - 0.2) {
        const bw = 0.07 + f.rng() * 0.08;
        const bh = 0.3 + f.rng() * 0.12;
        f.out.beam.push(wb(f, s + bw / 2, 0.52, bw, 0.06, bh, 0.25 + row * 0.52, BOOKS[Math.floor(f.rng() * BOOKS.length)]));
        s += bw + 0.01;
      }
    }
  },
  crate(f) {
    const z = 0.7 + f.rng() * 0.25;
    f.out.wood.push(wb(f, -0.45, 0.2 + z / 2, z, z, z, 0, scaleRgb(DARK, 0.9 + f.rng() * 0.3)));
    f.out.wood.push(wb(f, 0.45, 0.2 + z / 2, 0.8, 0.8, 0.8, 0, scaleRgb(DARK, 0.9 + f.rng() * 0.3)));
    if (f.rng() < 0.6) f.out.wood.push(wb(f, -0.4, 0.2 + z / 2, z * 0.8, z * 0.8, z * 0.8, z, scaleRgb(DARK, 1.1)));
  },
  barrel(f) {
    for (const [s, d] of [[-0.45, 0.42], [0.45, 0.42]].slice(0, 1 + Math.floor(f.rng() * 2))) {
      f.out.wood.push(round(f, s, d, 0.38, 0.95, 0, DARK, 8, 0.33));
      f.out.wall.push(round(f, s, d, 0.4, 0.06, 0.2, IRON, 8), round(f, s, d, 0.37, 0.06, 0.7, IRON, 8));
    }
  },
  coffin(f) {
    f.out.wall.push(wb(f, 0, 0.55, 2.2, 0.95, 0.75, 0, scaleRgb(f.c, 0.9)), wb(f, 0, 0.55, 2.35, 1.1, 0.2, 0.75, f.c));
    f.out.trim.push(wb(f, 0, 0.55, 0.14, 0.8, 0.06, 0.95, scaleRgb(f.c, 0.7)), wb(f, 0, 0.55, 1.1, 0.14, 0.06, 0.95, scaleRgb(f.c, 0.7))); // a cross cut in its lid
    if (f.rng() < 0.4) f.out.wall.push(wb(f, 0.9, 0.55, 0.8, 0.9, 0.25, 0.95, scaleRgb(f.c, 0.85)));
  },
  statue(f) {
    const pale = scaleRgb(f.c, 1.08);
    f.out.wall.push(wb(f, 0, 0.45, 0.9, 0.9, 0.9, 0, scaleRgb(f.c, 0.9)), wb(f, 0, 0.45, 0.5, 0.36, 1.0, 0.9, pale), wb(f, 0, 0.45, 1.0, 0.3, 0.16, 1.7, pale));
    f.out.wall.push(blob(f, 0, 0.45, 0.22, 2.05, pale, 1.1));
    f.out.wall.push(wb(f, 0.28, 0.45, 0.12, 0.14, 0.7, 1.0, pale), wb(f, -0.28, 0.45, 0.12, 0.14, 0.7, 1.0, pale));
  },
  stele(f) {
    const h = 1.6 + f.rng() * 1.6;
    f.out.wall.push(wb(f, 0, 0.3, 0.9, 0.4, 0.3, 0, scaleRgb(f.c, 0.85)), wb(f, 0, 0.3, 0.7, 0.28, h, 0.3, scaleRgb(f.c, 0.95)));
    for (let k = 0; k < 4; k++) f.out.trim.push(wb(f, 0, 0.45, 0.4 + (k % 2) * 0.12, 0.04, 0.08, 0.7 + k * (h / 5), scaleRgb(f.c, 0.55))); // runes cut in its face
  },
  pew(f) {
    f.out.wood.push(wb(f, 0, 0.5, 2.6, 0.5, 0.45, 0, DARK), wb(f, 0, 0.8, 2.6, 0.1, 0.9, 0.45, DARK), wb(f, -1.2, 0.5, 0.1, 0.5, 0.8, 0, scaleRgb(DARK, 0.8)), wb(f, 1.2, 0.5, 0.1, 0.5, 0.8, 0, scaleRgb(DARK, 0.8)));
  },
  growth(f) {
    for (let k = 0; k < 5; k++) {
      const [s, d, h] = [(f.rng() - 0.5) * 1.8, 0.3 + f.rng() * 0.5, 0.35 + f.rng() * 0.9];
      f.out.wall.push(round(f, s, d, 0.07 + f.rng() * 0.05, h, 0, [0.6, 0.62, 0.55], 5, 0.05));
      f.out.glow.push(tint(blob(f, s, d, 0.18 + f.rng() * 0.15, h, k % 2 ? [0.3, 0.7, 0.62] : [0.55, 0.38, 0.75], 0.45), k % 2 ? [0.3, 0.7, 0.62] : [0.55, 0.38, 0.75]));
    }
    for (let k = 0; k < 6; k++) f.out.wall.push(blob(f, (f.rng() - 0.5) * 2, 0.15 + f.rng() * 0.2, 0.1 + f.rng() * 0.1, 0.1, scaleRgb(f.c, 0.6), 0.8));
  },
  rubble(f) {
    for (let k = 0; k < 7; k++) {
      const r = 0.12 + f.rng() * 0.3;
      f.out.wall.push(blob(f, (f.rng() - 0.5) * 1.8, 0.2 + f.rng() * 0.9, r, r * 0.4, scaleRgb(f.c, 0.7)));
    }
  },
  bones(f) {
    for (let k = 0; k < 6; k++) f.out.wall.push(wb(f, (f.rng() - 0.5) * 1.6, 0.2 + f.rng() * 0.8, 0.5 + f.rng() * 0.3, 0.05, 0.04, 0.03 + f.rng() * 0.08, BONE));
    f.out.wall.push(blob(f, 0.1, 0.55, 0.12, 0.12, BONE, 0.9), blob(f, -0.35, 0.8, 0.1, 0.1, BONE, 0.9), blob(f, 0.5, 0.35, 0.1, 0.1, BONE, 0.9));
  },
};

/** Builds one item on a wall at `f.s`. */
export const place = (item: Item, f: Frame): void => BUILD[item](f);

/** How far an item stands off its wall at most (the walls' inner faces are solid; nothing is set deeper into a room than this). */
export const DEPTH = 1.1;

/** A brazier's iron stand and bowl, and its flame (a stout cone with a brighter core), at (x, z) on a floor at `y`. */
export function brazier(x: number, z: number, y: number): { iron: THREE.BufferGeometry[]; flame: THREE.BufferGeometry; at: { x: number; y: number; z: number } } {
  const iron = [
    tint(new THREE.CylinderGeometry(0.14, 0.3, 0.9, 6).translate(x, y + 0.45, z), IRON),
    tint(new THREE.CylinderGeometry(0.42, 0.22, 0.28, 8).translate(x, y + 1.04, z), scaleRgb(IRON, 1.15)),
  ];
  const body = tint(new THREE.ConeGeometry(0.26, 0.75, 6).translate(x, y + 1.55, z), [1, 0.72, 0.4]);
  const core = tint(new THREE.ConeGeometry(0.13, 0.45, 6).translate(x, y + 1.38, z), [1, 0.95, 0.75]);
  const flame = mergeGeometries([body, core]);
  return { iron, flame, at: { x, y: y + 1.7, z } };
}

/** How many vertices one brazier's flame is drawn with (counted by the lights test). */
export const BRAZIER_VERTICES = brazier(0, 0, 0).flame.getAttribute('position').count;
