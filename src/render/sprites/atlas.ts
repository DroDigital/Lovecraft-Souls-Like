/**
 * The creature sprite atlas (spec §2): generated at startup from every entity's sprite recipe (and
 * its variants), 2–4 frames per state, all packed into one texture. Pure: RGBA bytes, no Three.js.
 */

import { createRng } from '../../core/rng';
import { ENTITIES, variantOf, type Variant } from '../../data/registry';
import type { Silhouette, SpriteRecipe } from '../../data/schema';
import { ANOMALY, CREATURE_COLORS, scaleRgb } from '../palette';
import { crustacean, quadruped, serpent, toad, winged } from './beasts';
import { barrel, blob, cone, orb, swarm } from './masses';
import type { Pose, Sketch } from './parts';
import { createCanvas, GLINT, GLOW, outline, type Canvas } from './raster';
import { skinOf } from './skins';
import { cephalopod, giant, humanoid, hunched, robed, spectre } from './uprights';

export const CELL = 64;
export const ATLAS_COLUMNS = 32;

const still = { bob: 0, swing: 0, attack: 0, hurt: 0 } as const;

/** The frames of each state. */
export const STATE_POSES = {
  idle: [still, { ...still, bob: 1 }],
  move: [{ ...still, swing: 1 }, { ...still, bob: 1, swing: -1 }],
  attack: [{ ...still, attack: 1 }, { ...still, attack: 2 }, { ...still, attack: 3 }],
  hurt: [{ ...still, hurt: 1 }, { ...still, hurt: 2 }],
} as const satisfies Record<string, readonly Pose[]>;

export type SpriteState = keyof typeof STATE_POSES;
export const SPRITE_STATES = Object.keys(STATE_POSES) as SpriteState[];

const PLANS: Record<Silhouette, (s: Sketch) => void> = {
  humanoid,
  hunched,
  robed,
  giant,
  cephalopod,
  spectre,
  quadruped,
  serpent,
  winged,
  crustacean,
  toad,
  barrel,
  cone,
  blob,
  orb,
  swarm,
};

const PALE_EYE = [0.93, 0.9, 0.8] as const;

/** One frame of a creature, drawn into a fresh 64×64 cell. */
export function drawSprite(r: SpriteRecipe, state: SpriteState, frame: number, seed = r.seed ?? 0): Canvas {
  const c = createCanvas(CELL, CELL, seed);
  const pal = CREATURE_COLORS[r.palette];
  const skin = skinOf(r.palette, r.silhouette);
  PLANS[r.silhouette]({
    c,
    r: { ...r, seed },
    pose: STATE_POSES[state][frame],
    rng: createRng(seed * 31 + 7),
    body: { rgb: pal.mid, ...skin },
    dark: { rgb: pal.dark, ...skin },
    light: { rgb: pal.light },
    claw: { rgb: scaleRgb(pal.light, 0.9) },
    eye: r.glow ? { rgb: ANOMALY[r.glow], glow: true } : { rgb: PALE_EYE, glint: true },
  });
  outline(c, scaleRgb(pal.dark, 0.35));
  return c;
}

/** The atlas key of an entity (or one of its variants). */
export const spriteKey = (id: string, variant?: Variant): string => (variant ? `${id}#${variant}` : id);

/** Every sprite the game can show: each sprite entity and each variant that is drawn as a sprite. */
export function spriteRecipes(): { key: string; recipe: SpriteRecipe }[] {
  const out: { key: string; recipe: SpriteRecipe }[] = [];
  ENTITIES.forEach((d, i) => {
    const add = (key: string, r: SpriteRecipe | undefined): void => void (r && out.push({ key, recipe: { ...r, seed: r.seed ?? i + 1 } }));
    add(spriteKey(d.id), d.sprite);
    for (const v of ['eldritch', 'boss'] as const) add(spriteKey(d.id, v), variantOf(d, v)?.sprite);
  });
  return out;
}

export interface SpriteAtlas {
  width: number;
  height: number;
  data: Uint8Array; // RGBA, row-major, y down
  /** Atlas cell index of every frame, by sprite key and state. */
  frames: Map<string, Record<SpriteState, number[]>>;
  /** Each cell's eyes (playtest round 8): x, y (cell pixels from its top left) and radius of its self-lit pixels, and how many; then their mean colour. */
  eyes: Float32Array;
  eyeColors: Float32Array;
}

/** Where a frame's self-lit pixels (eyes, glowing marks) gather: into `eyes` and `colors` at `cell`. */
function findEyes(px: Uint8Array, cell: number, eyes: Float32Array, colors: Float32Array): void {
  let [n, sx, sy, r, g, b] = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < CELL * CELL; i++) {
    const a = px[i * 4 + 3];
    if (a !== GLOW && a !== GLINT) continue;
    [n, sx, sy] = [n + 1, sx + (i % CELL) + 0.5, sy + Math.floor(i / CELL) + 0.5];
    [r, g, b] = [r + px[i * 4], g + px[i * 4 + 1], b + px[i * 4 + 2]];
  }
  if (!n) return;
  const [cx, cy] = [sx / n, sy / n];
  let spread = 0;
  for (let i = 0; i < CELL * CELL; i++) {
    const a = px[i * 4 + 3];
    if (a === GLOW || a === GLINT) spread = Math.max(spread, Math.hypot((i % CELL) + 0.5 - cx, Math.floor(i / CELL) + 0.5 - cy));
  }
  eyes.set([cx, cy, spread + 1, n], cell * 4);
  colors.set([r / n / 255, g / n / 255, b / n / 255], cell * 3);
}

/** Draws the atlas a slice at a time (playtest round 10: in one piece it held the page for most of a second). */
export interface AtlasBuilder {
  /** Draws creatures until `ms` has passed (at least one, and one begun is finished); the atlas once every one is drawn. */
  step(ms: number): SpriteAtlas | null;
  readonly progress: number; // 0..1
}

export function atlasBuilder(entries = spriteRecipes()): AtlasBuilder {
  const perSprite = SPRITE_STATES.reduce((n, s) => n + STATE_POSES[s].length, 0);
  const rows = Math.ceil((entries.length * perSprite) / ATLAS_COLUMNS);
  const width = ATLAS_COLUMNS * CELL;
  const height = Math.max(1, rows) * CELL;
  const data = new Uint8Array(width * height * 4);
  const frames = new Map<string, Record<SpriteState, number[]>>();
  const eyes = new Float32Array(entries.length * perSprite * 4);
  const eyeColors = new Float32Array(entries.length * perSprite * 3);
  const atlas: SpriteAtlas = { width, height, data, frames, eyes, eyeColors };
  let [next, cell] = [0, 0];
  return {
    step(ms) {
      const start = performance.now();
      while (next < entries.length) {
        const { key, recipe } = entries[next++];
        const byState = {} as Record<SpriteState, number[]>;
        for (const state of SPRITE_STATES) {
          byState[state] = STATE_POSES[state].map((_, f) => {
            const img = drawSprite(recipe, state, f);
            const [cx, cy] = [(cell % ATLAS_COLUMNS) * CELL, Math.floor(cell / ATLAS_COLUMNS) * CELL];
            for (let y = 0; y < CELL; y++) data.set(img.px.subarray(y * CELL * 4, (y + 1) * CELL * 4), ((cy + y) * width + cx) * 4);
            findEyes(img.px, cell, eyes, eyeColors);
            return cell++;
          });
        }
        frames.set(key, byState);
        if (performance.now() - start >= ms) break;
      }
      return next < entries.length ? null : atlas;
    },
    get progress() {
      return entries.length ? next / entries.length : 1;
    },
  };
}

export const buildAtlas = (entries = spriteRecipes()): SpriteAtlas => atlasBuilder(entries).step(Infinity)!;

/** Top-left pixel of an atlas cell. */
export const cellOrigin = (cell: number): readonly [number, number] => [(cell % ATLAS_COLUMNS) * CELL, Math.floor(cell / ATLAS_COLUMNS) * CELL];
