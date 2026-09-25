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
import { createCanvas, outline, type Canvas } from './raster';
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
}

export function buildAtlas(entries = spriteRecipes()): SpriteAtlas {
  const perSprite = SPRITE_STATES.reduce((n, s) => n + STATE_POSES[s].length, 0);
  const rows = Math.ceil((entries.length * perSprite) / ATLAS_COLUMNS);
  const width = ATLAS_COLUMNS * CELL;
  const height = Math.max(1, rows) * CELL;
  const data = new Uint8Array(width * height * 4);
  const frames = new Map<string, Record<SpriteState, number[]>>();
  let cell = 0;
  for (const { key, recipe } of entries) {
    const byState = {} as Record<SpriteState, number[]>;
    for (const state of SPRITE_STATES) {
      byState[state] = STATE_POSES[state].map((_, f) => {
        const img = drawSprite(recipe, state, f);
        const [cx, cy] = [(cell % ATLAS_COLUMNS) * CELL, Math.floor(cell / ATLAS_COLUMNS) * CELL];
        for (let y = 0; y < CELL; y++) data.set(img.px.subarray(y * CELL * 4, (y + 1) * CELL * 4), ((cy + y) * width + cx) * 4);
        return cell++;
      });
    }
    frames.set(key, byState);
  }
  return { width, height, data, frames };
}

/** Top-left pixel of an atlas cell. */
export const cellOrigin = (cell: number): readonly [number, number] => [(cell % ATLAS_COLUMNS) * CELL, Math.floor(cell / ATLAS_COLUMNS) * CELL];
