/** Components, events and the Game state shared by the Phase 1 systems. Pure: no Three.js. */

import type { Ecs, Entity } from '../core/ecs';
import type { EventBus } from '../core/events';
import type { V3 } from '../core/geom';
import type { Rng } from '../core/rng';
import type { Place } from '../data/arena';
import type { MoveSet } from '../data/moves';
import type { BrainDef } from '../data/archetypes';
import type { CollisionWorld } from '../world/colliders';
import type { CameraRig } from './camera';
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
}

export interface Drop {
  amount: number;
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
  };
}

export type Stores = ReturnType<typeof createStores>;

export type HitOutcome =
  | 'dodged'
  | 'parried'
  | 'blocked'
  | 'guardBreak'
  | 'hit'
  | 'stagger'
  | 'riposte'
  | 'interrupted'
  | 'kill';

export interface GameEvents {
  Hit: { attacker: Entity; target: Entity; outcome: HitOutcome; damage: number };
  Shot: { shooter: Entity; from: V3; to: V3; target: Entity | null };
  Died: { entity: Entity; killer: Entity | null; at: V3 };
  Respawned: { entity: Entity };
  Echoes: { change: 'earned' | 'dropped' | 'recovered' | 'lost'; amount: number; total: number };
  LockChanged: { target: Entity | null };
}

/** Lying in ambush or burrowed: unseen, and nothing can target it. */
export const isConcealed = (g: Pick<Game, 'ecs'>, id: Entity): boolean => g.ecs.c.brain.get(id)?.state === 'hidden';

/** Player-only state that is not a component. */
export interface Pilot {
  id: Entity;
  buffer: InputBuffer;
  dodgeHeld: number; // frames the dodge button has been down, -1 while up
  sprinting: boolean;
  blockHeld: boolean;
  echoes: number; // carried currency
  checkpoint: Place; // the last Elder Sign
}

export interface Game {
  ecs: Ecs<Stores>;
  events: EventBus<GameEvents>;
  world: CollisionWorld;
  player: Pilot;
  camera: CameraRig;
  lock: LockState;
  rng: Rng;
  frame: number;
}
