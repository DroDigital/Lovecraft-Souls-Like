/** Components, events and the Game state shared by the systems. Pure: no Three.js. */

import type { Ecs, Entity } from '../core/ecs';
import type { EventBus } from '../core/events';
import type { V3 } from '../core/geom';
import type { Rng } from '../core/rng';
import type { HiddenPieceDef, Place } from '../data/arena';
import type { MoveSet } from '../data/moves';
import type { BrainDef } from '../data/archetypes';
import type { Tier } from '../data/schema';
import type { UpgradeId } from '../data/tuning';
import type { Collider, CollisionWorld } from '../world/colliders';
import type { CameraRig } from './camera';
import type { Bolt, Fight, Hazard, Mark, Prop, Reality, Wave } from './fightTypes';
import type { Explored } from './exploration';
import type { Band, GameEvents } from './gameEvents';

export type { ArenaCircle, Bolt, Fight, Hazard, Mark, Prop, Reality, Wave } from './fightTypes';
export { BANDS, type Band, type GameEvents, type HitOutcome } from './gameEvents';
import type { InputBuffer } from './inputBuffer';
import type { LockState } from './lockOn';

export interface Transform {
  pos: V3; // feet
  prev: V3; // last step, for interpolated rendering
  yaw: number;
  prevYaw: number;
}

/** Kinematic capsule, also the hurtbox. */
export interface Body {
  radius: number;
  height: number;
  aimHeight: number;
  fixed: boolean;
}

/** Desired locomotion, written by the player controller or a brain and read by movement. */
export interface Mover {
  vx: number; // m/s
  vz: number;
  face: number | null; // yaw to turn toward (also the tracking target during moves)
  turnRate: number; // rad/s
}

export interface Health {
  hp: number;
  max: number;
  immortal: boolean;
  calm: number; // frames since the last damage
  ward?: number; // damage taken is scaled by this: a boss's hooks and signature set it each step
  floor?: number; // blows cannot bring it below this: a boss no blade finishes (its signature sets it)
}

export interface Poise {
  value: number;
  max: number;
  calm: number; // frames since the last poise damage
}

export interface Stamina {
  value: number;
  max: number;
  delay: number; // frames before regen resumes
}

export interface Actor {
  moves: MoveSet;
  move: string | null; // null = free
  frame: number;
  hitstop: number; // frames left frozen
  frozen: boolean; // frozen this step
  hits: Set<Entity>; // already struck by the current move
  dir: { x: number; z: number }; // travel direction of an 'input' motion (the roll)
  last: string | null; // the move that finished most recently, for combo chains
  idle: number; // frames since it finished
  guard: boolean; // blocking this step
}

export interface Combatant {
  name: string;
  faction: 'player' | 'enemy';
  bounty: number;
}

/** Archetype state machine (systems/brain.ts). `hidden`: lying in ambush or burrowed, unseen and untouchable. */
export type BrainState = 'idle' | 'hidden' | 'engage' | 'return' | 'follow';

export interface Brain {
  def: BrainDef;
  state: BrainState;
  target: Entity | null;
  lost: number; // frames since the target was last perceived
  strafe: 1 | -1; // circling direction
  cooldown: number; // frames before the next attack
  speed: number;
  evadeIn?: number; // frames before it may try to slip another blow
}

export interface Drop {
  amount: number;
}

/** How a roster creature weighs on the mind (spec §3A). */
export interface Dread {
  id: string; // roster id: first sight counts once per id
  tier: Tier;
  aura: number; // sanity per second at close range
  blow: number; // sanity per landed hit
  insight: number; // insight on first sight
  glow: boolean; // carries anomaly colour (the FX controller's anomaly proximity)
}

/** HiddenLayer (spec §3A): there only while insight ≥ minInsight and the sanity band lies at or below maxSanity. */
export interface Layer {
  minInsight?: number;
  maxSanity?: number; // a band floor (70, 40, 15): shown once the whole band is at or below it
  shown: boolean;
}

/** Hidden-layer geometry: its data, the colliders it puts into the world while shown, and those of its seal while hidden. */
export interface Piece {
  def: HiddenPieceDef;
  colliders: readonly Collider[];
  seal: readonly Collider[];
}

/** VariantSwap (spec §3A): the roster entry to rebuild from, and whether it shows its eldritch variant. */
export interface Swap {
  id: string;
  eldritch: boolean;
}

/** A hallucination (spec §3A), or a boss's decoy (§3E): only the investigator sees it, and it fades after `life` frames. */
export interface Phantom {
  life: number;
  decoy?: boolean; // a boss's decoy: it stays whatever the sanity band
}

/** A tome lying in the world: reading it (by touch) grants insight. */
export interface Tome {
  name: string;
  insight: number;
  vial?: boolean; // a Silver Vial: one more dose of West's Reagent
  note?: boolean; // a letter, clipping or report (documents.ts), not a tome
}

/** An Elder Sign (spec §3D): a checkpoint to rest at, found by coming near. */
export interface Sign {
  id: string;
  name: string;
}

/** A gate between the waking world and a realm beyond: passing it lands at its twin. */
export interface Gate {
  id: string;
  name: string;
  to: string;
}

export function createStores() {
  return {
    transform: new Map<Entity, Transform>(),
    body: new Map<Entity, Body>(),
    mover: new Map<Entity, Mover>(),
    health: new Map<Entity, Health>(),
    poise: new Map<Entity, Poise>(),
    stamina: new Map<Entity, Stamina>(),
    actor: new Map<Entity, Actor>(),
    combatant: new Map<Entity, Combatant>(),
    brain: new Map<Entity, Brain>(),
    home: new Map<Entity, Place>(), // where a non-boss enemy resets to
    drop: new Map<Entity, Drop>(), // dropped Echoes
    model: new Map<Entity, string>(), // which figure renders it
    dead: new Map<Entity, true>(), // gone until the next reset
    dread: new Map<Entity, Dread>(),
    layer: new Map<Entity, Layer>(),
    piece: new Map<Entity, Piece>(),
    swap: new Map<Entity, Swap>(),
    phantom: new Map<Entity, Phantom>(),
    tome: new Map<Entity, Tome>(),
    sign: new Map<Entity, Sign>(),
    gate: new Map<Entity, Gate>(),
    origin: new Map<Entity, string>(), // the world spawn point a creature came from (population.ts)
    fight: new Map<Entity, Fight>(), // bosses (bossFight.ts)
    minion: new Map<Entity, Entity>(), // a summon or decoy → its summoner
    prop: new Map<Entity, Prop>(),
    bolt: new Map<Entity, Bolt>(),
    hazard: new Map<Entity, Hazard>(),
    mark: new Map<Entity, Mark>(), // an eruption's marked ground (strikes.ts)
    wave: new Map<Entity, Wave>(), // a quake's ring
    npc: new Map<Entity, string>(), // someone met in the dream (npcs.ts): their id
    unseen: new Map<Entity, { revealed: number }>(), // invisible unless revealed (frames left): the Dunwich Horror
    shove: new Map<Entity, { x: number; z: number; frames: number }>(), // metres per frame, for this many frames
  };
}

export type Stores = ReturnType<typeof createStores>;

/** Lying in ambush or burrowed: unseen, and nothing can target it. */
export const isConcealed = (g: Pick<Game, 'ecs'>, id: Entity): boolean => g.ecs.c.brain.get(id)?.state === 'hidden';

/** Invisible and not revealed (spec §3E, the Dunwich Horror): not drawn, locked on to or beheld, though it is there. */
export const isUnseen = (g: Pick<Game, 'ecs'>, id: Entity): boolean => (g.ecs.c.unseen.get(id)?.revealed ?? 1) <= 0;

/** Not in the world at all: dead, or on a hidden layer that is not shown. It neither acts nor collides, and nothing can touch it. */
export const isAbsent = (g: Pick<Game, 'ecs'>, id: Entity): boolean => g.ecs.c.dead.has(id) || g.ecs.c.layer.get(id)?.shown === false;

/** Player-only state that is not a component. */
export interface Pilot {
  id: Entity;
  buffer: InputBuffer;
  dodgeHeld: number; // frames the dodge button has been down, -1 while up
  sprinting: boolean;
  blockHeld: boolean;
  echoes: number; // carried currency
  checkpoint: Place; // the last Elder Sign
  laudanum: number; // doses left
  reagent: number; // West's Reagent: doses left...
  reagentMax: number; // ...and the most it holds (Silver Vials add to it)
}

/** The investigator's mind (spec §3A). */
export interface Mind {
  sanity: number; // 0..100
  band: Band; // moves with hysteresis (systems/sanity.ts)
  insight: number; // integer, 0 or more
  seen: Set<string>; // roster ids already beheld: first sight counts once
  upgrades: Record<UpgradeId, number>; // levels bought with insight
  phantomIn: number; // frames until the next hallucination may appear
}

/** Open-world state (spec §3D); absent in the arena. */
export interface Overworld {
  sign: string; // the Elder Sign last rested at: the respawn point
  discovered: Set<string>; // Elder Signs found: fast-travel destinations
  slain: Set<string>; // spawn ids of bosses and optional bosses, gone for good
  killed: Set<string>; // spawn ids of foes killed since the last rest or death
  read: Set<string>; // tomes read
  named: number; // times Hastur's name has appeared (signatures/hastur.ts)
  called: Set<string>; // bosses called into the world: until then their spawn stays empty
  ending: string | null; // the ending chosen, once one has been (endings.ts)
  alive: Map<string, Entity>; // spawn id → the creature standing for it
  region: string | null; // where the investigator is
  chunk: number; // the investigator's chunk key
  dirty: boolean; // spawn points need another look
  explored: Explored; // the ground seen, for the map (exploration.ts)
  lookedFrom: number; // the cell the investigator last looked around from
  quests: Map<string, number>; // each quest begun: its open stage, or its stage count once done (quests.ts)
  met: Set<string>; // the people talked with (npcs.ts)
}

export interface Game {
  ecs: Ecs<Stores>;
  events: EventBus<GameEvents>;
  world: CollisionWorld;
  player: Pilot;
  mind: Mind;
  camera: CameraRig;
  lock: LockState;
  rng: Rng;
  frame: number;
  reality: Reality;
  overworld?: Overworld;
}
