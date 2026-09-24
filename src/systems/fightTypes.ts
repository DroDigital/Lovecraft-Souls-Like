/** Boss-fight state (spec §3E): fights, arena props, bolts, pools and the reality the hooks bend. Pure: no Three.js. */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';
import type { PoolDef } from '../data/moves';
import type { ArenaChange, BossScript, RealityHook } from '../data/schema';
import type { Collider } from '../world/colliders';

/** Where a boss holds its fight: a circle. */
export interface ArenaCircle {
  x: number;
  z: number;
  radius: number;
}

/** A boss fight (spec §3E): the script its boss follows, the phase it has reached and the arena it holds. */
export interface Fight {
  id: string; // roster id; a signature mechanic is keyed by it
  script: BossScript;
  phase: number; // index into script.phases
  engaged: boolean;
  arena: ArenaCircle;
  frames: number; // since it was engaged
  minions: Entity[]; // its summons and decoys
  props: Entity[]; // what its arena changes put up
  changes: Set<ArenaChange>; // applied since it was engaged
  decoyIn: number; // frames to its next decoy
  sig: Record<string, number>; // its signature mechanic's counters
  form: string; // the model its brain was built for: a variant swap rebuilds it
}

/** What a boss's arena change puts up (spec §3E): its colliders stand in the world while it does. */
export interface Prop {
  kind: 'lamp' | 'monolith' | 'ship' | 'root' | 'sphere';
  owner: Entity; // the boss whose arena it stands in
  lit: boolean; // a lamp's flame
  colliders: Collider[];
}

/** A bolt in flight (spec §3E). */
export interface Bolt {
  owner: Entity;
  faction: 'player' | 'enemy';
  vel: V3; // m/s
  radius: number;
  damage: number;
  poise: number;
  life: number; // frames left
  lob: boolean; // falls under gravity
  conjured: boolean; // loosed by a hallucination or decoy: it touches only the investigator's mind
  passed: Entity[]; // bodies it flew through (a roll's i-frames)
  pool?: PoolDef; // spreads where it lands
}

/** A lingering pool on the ground (spec §3E): it hurts each hostile inside it, one tick at a time. */
export interface Hazard {
  owner: Entity;
  faction: 'player' | 'enemy';
  radius: number;
  damage: number;
  tick: number;
  life: number; // frames left
  next: number; // frames to the next tick
}

/** The world as the bosses' reality hooks bend it (spec §3E); the renderer and HUD read it. */
export interface Reality {
  hooks: Set<RealityHook>; // live this step: the engaged bosses' phase hooks together
  darkness: number; // 0..1
  dark: number; // frames left of a darkness attack's gloom
  flood: number; // 0..1
  floodAt: (ArenaCircle & { y: number }) | null; // the arena the water fills
  warp: number; // 0..1: the camera's drift and the lens's sway
  gaze: number; // 0..1: gaze buildup on the investigator
  petrify: number; // 0..1: petrification (petrify_buildup); full, the investigator is stone
  stolen: number; // frames the investigator's body is not their own (control_swap)
  swapIn: number; // frames to the next body theft
  skipIn: number; // frames to the next time skip
  saturation: number; // 1..0: the world's colour, drained by the Colour Out of Space
}

/** A boss's fight, not yet begun, over the arena around `at`. */
export const newFight = (id: string, script: BossScript, arena: ArenaCircle): Fight => ({
  id,
  script,
  phase: 0,
  engaged: false,
  arena,
  frames: 0,
  minions: [],
  props: [],
  changes: new Set(),
  decoyIn: 0,
  sig: {},
  form: '',
});
