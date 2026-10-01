/** Components, events and the Game state shared by the systems. Pure: no Three.js. */

import type { Ecs, Entity } from '../core/ecs';
import type { EventBus } from '../core/events';
import type { V3, XZ } from '../core/geom';
import type { Rng } from '../core/rng';
import type { HiddenPieceDef, Place } from '../data/arena';
import type { MoveSet } from '../data/moves';
import type { BrainDef } from '../data/archetypes';
import type { AssemblyRecipe, Tier } from '../data/schema';
import type { LevelId, UpgradeId } from '../data/tuning';
import type { WeaponId } from '../data/weapons';
import type { Collider, CollisionWorld } from '../world/colliders';
import type { CameraRig } from './camera';
import type { Bolt, Fight, Hazard, Mark, Prop, Reality, Wave } from './fightTypes';
import type { Band, GameEvents } from './gameEvents';
import type { Overworld } from './overworldTypes';

export type { ArenaCircle, Bolt, Fight, Hazard, Mark, Prop, Reality, Wave } from './fightTypes';
export type { Overworld } from './overworldTypes';
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
  assembly?: AssemblyRecipe; // a colossus's shape: its hurt zones follow it (hurt.ts)
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
  grace?: number; // frames left in which it cannot break again...
  respite?: number; // ...and the grace each break gives (the investigator's, round 12: blow on blow held them staggered to death)
}

export interface Stamina {
  value: number;
  max: number;
  delay: number; // frames before regen resumes
  regen?: number; // regained per second (the investigator's, from Endurance: levels.ts); STAMINA.regen without
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
export type BrainState = 'idle' | 'hidden' | 'alert' | 'engage' | 'search' | 'return' | 'follow';

export interface Brain {
  def: BrainDef;
  state: BrainState;
  target: Entity | null;
  lost: number; // frames since the target was last perceived
  strafe: 1 | -1; // circling direction
  cooldown: number; // frames before the next attack
  speed: number;
  evadeIn?: number; // frames before it may try to slip another blow
  // How it hunts (playtest round 8: perception.ts, tactics.ts).
  aware?: number; // 0..1: how sure it is that a foe is about (alert below 1, hunting at 1)
  last?: XZ | null; // where it last saw or heard its quarry
  searching?: number; // frames it has left to look about there
  token?: boolean; // one of the few closing in on the investigator at once (the rest wait their turn)
  lookIn?: number; // frames before an idle creature next looks about or moves on
  roamTo?: XZ | null; // on its rounds: where it is ambling to (roam.ts)
  roamFor?: number; // frames it has left to get there
  stuck?: number; // frames it has pushed without getting anywhere
  detour?: number; // frames it steps aside round what blocks it (the sign: which way)
  fallBack?: number; // frames it gives ground after its blow
  joined?: boolean; // an ally that has fallen in beside the investigator (its notice said once: round 19)
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
  minSeals?: number; // the waking world's seals broken (seals.ts)
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
  echoes?: number; // an Echo cache (world/caches.ts), not a tome
  weapon?: string; // a weapon lying where it was left (arms.ts), not a tome
  rounds?: number; // a box of cartridges (data/ammoSites.ts, world/caches.ts): rounds for the revolver, not a tome (gun.ts)
  warned?: number; // the frame it last said they carry all the rounds they can
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
  blockRaised: boolean; // block pressed since the last move began, and still held: it calls off an attack
  echoes: number; // carried currency
  levels: Record<LevelId, number>; // bought with Echoes at an Elder Sign (levels.ts)
  arms: WeaponId[]; // the weapons they own (arms.ts)...
  weapon: WeaponId; // ...and the one in hand
  stones: number; // star-stones carried, left by bosses slain (arms.ts; round 12)...
  reinforced: Record<WeaponId, number>; // ...and how many levels each weapon has had set into it
  checkpoint: Place; // the last Elder Sign
  laudanum: number; // doses left
  reagent: number; // West's Reagent: doses left...
  reagentMax: number; // ...and the most it holds (Silver Vials add to it)
  oil: number; // flasks of lamp oil to throw (round 12; bought from Dr. Morgan)
  ammo: number; // rounds in the revolver's cylinder (round 22)...
  rounds: number; // ...and the spare rounds carried (gun.ts)
  gun: number; // levels of star-stones set into the revolver (gun.ts)
  cycle: number; // the journey through the dream, 0 the first (NG+, cycles.ts; round 12)
  steady: number; // frames left in which a swallow of Laudanum holds the mind: no sanity lost to auras, roars, gazes or the void
  mended: number; // frames left in which a shot of Reagent holds the body: lingering hurts (pools, the void) do no harm
  listening: Entity | null; // the person talked with: they face them and the camera frames them until they move or look away (round 12)
  kneeling: { x: number; z: number } | null; // the Elder Sign rested at: they kneel to it until they move or act (round 15)
}

/** The investigator's mind (spec §3A). */
export interface Mind {
  sanity: number; // 0..100
  band: Band; // moves with hysteresis (systems/sanity.ts)
  insight: number; // integer, 0 or more
  seen: Set<string>; // roster ids already beheld: first sight counts once
  upgrades: Record<UpgradeId, number>; // levels bought with insight
  phantomIn: number; // frames until the next hallucination may appear
  fought: number; // the frame of the last real blow struck or taken (sanity.ts: the mind mends only apart from a fight)
  mending: number; // sanity being regained a second now (0: not mending), for the HUD
  struck: Toll; // the last landed blow's toll on the mind (sanity.ts)...
  beheld: Toll; // ...and the last first sight's (insight.ts)
}

/** A toll on the mind taken once within a spell (round 12): when the spell began, and the most it has taken. */
export interface Toll {
  at: number; // the frame
  amount: number;
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
  /** How well lit the ground at a point is by the world's lamps, fires and torches, 0..1 (handed in by the renderer, which knows where they are; the dark when absent: sanity.ts mends faster in it). */
  lit?: (at: V3) => number;
}
