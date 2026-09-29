/**
 * Where the world's small lives keep (playtest round 18; data/fauna.ts): each chunk's critters,
 * placed on the props of its region's plan. A crow sits on a dead tree's branch, a gravestone or a
 * house's ridge; a rat runs about the foot of a house or wall; moths circle a lamp's head; fireflies
 * drift about a bush. The same every time for a chunk (seeded by it), and never on a dungeon's floor.
 * Pure: no Three.js.
 */

import type { V3 } from '../core/geom';
import { createRng, type Rng } from '../core/rng';
import { CHUNK_CRITTERS, CRITTERS, FAUNA, type CritterId } from '../data/fauna';
import type { Prop } from './props';
import { regionPlan } from './regionPlan';
import { inDungeon, surface } from './terrain';
import { chunkKey, regionOfChunk } from './worldMap';

/** A critter's haunt: where it perches, what it circles, or where about the ground it keeps. */
export interface Nest extends V3 {
  critter: CritterId;
  seed: number;
}

/** How far above the ground a perching critter sits at the least. */
const PERCH_UP = 0.12;

/** Where on a prop a critter keeps. */
function spot(p: Prop, critter: CritterId, rng: Rng): V3 {
  const habit = CRITTERS[critter].habit;
  if (habit === 'orbit') return { x: p.x, y: p.y + p.h - 0.3, z: p.z }; // a lamp's head
  if (habit === 'scurry' || habit === 'drift') {
    const a = rng() * Math.PI * 2;
    const r = Math.max(p.w, p.d) + 0.5 + rng() * 1.2; // at its foot
    const [x, z] = [p.x + Math.sin(a) * r, p.z + Math.cos(a) * r];
    return { x, y: surface(x, z), z };
  }
  const along = (rng() - 0.5) * 1.6 * p.w; // a long prop's ridge or top runs along its own x
  const [s, c] = [Math.sin(p.yaw), Math.cos(p.yaw)];
  switch (p.kind) {
    case 'tree':
    case 'pine': {
      const [a, r] = [rng() * Math.PI * 2, 0.4 + rng() * (p.kind === 'pine' ? 0.7 : 1.2)]; // out on a branch
      return { x: p.x + Math.sin(a) * r, y: p.y + p.h * (0.5 + 0.25 * rng()), z: p.z + Math.cos(a) * r };
    }
    case 'house':
    case 'wall':
    case 'fence':
    case 'ruin':
      return { x: p.x + c * along, y: p.y + p.h, z: p.z - s * along };
    default:
      return { x: p.x, y: p.y + p.h, z: p.z }; // a grave's, a cross's, a stone's top
  }
}

function place(cx: number, cz: number): Nest[] {
  const region = regionOfChunk(cx, cz);
  const haunts = region ? FAUNA[region.id] : undefined;
  const props = region && haunts ? regionPlan(region).props.get(chunkKey(cx, cz)) : undefined;
  if (!haunts || !props) return [];
  const rng = createRng(chunkKey(cx, cz) * 7919 + 13);
  const out: Nest[] = [];
  for (const h of haunts) {
    for (const p of props) {
      if (out.length >= CHUNK_CRITTERS) return out;
      if (!h.on.includes(p.kind) || rng() >= h.share) continue;
      const n = h.count[0] + Math.floor(rng() * (h.count[1] - h.count[0] + 1));
      for (let i = 0; i < n && out.length < CHUNK_CRITTERS; i++) {
        const at = spot(p, h.critter, rng);
        const seed = Math.floor(rng() * 1e9);
        if (inDungeon(at.x, at.z) || (CRITTERS[h.critter].habit === 'perch' && at.y - surface(at.x, at.z) < PERCH_UP)) continue; // a perch sits up on its prop, not on the ground that rises beside a low wall
        out.push({ critter: h.critter, ...at, seed });
      }
    }
  }
  return out;
}

const cache = new Map<number, readonly Nest[]>();

/** The critters kept to chunk (cx, cz). */
export function nestsOf(cx: number, cz: number): readonly Nest[] {
  const key = chunkKey(cx, cz);
  let n = cache.get(key);
  if (!n) cache.set(key, (n = place(cx, cz)));
  return n;
}
