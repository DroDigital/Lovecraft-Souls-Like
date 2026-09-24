/** The arena game (Phase 1, plus a `?spawn` roster creature from Phase 2): builds the arena world and runs the systems in their fixed order each 60 Hz step. */

import { createEcs } from '../core/ecs';
import { createEventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { createRng } from '../core/rng';
import { ARENA } from '../data/arena';
import type { Variant } from '../data/registry';
import { DEEP_ONE, TRAINING_DUMMY } from '../data/placeholders';
import { CAMERA, SIM } from '../data/tuning';
import { createArenaWorld } from '../world/arena';
import { actionSystem } from './actions';
import { brainSystem } from './brain';
import { createCameraRig, stepCamera } from './camera';
import { meleeSystem } from './combat';
import { createStores, type Game, type GameEvents } from './components';
import { resolveCreature, spawnCreature } from './creatures';
import { deathSystem, registerDeath } from './death';
import { createBuffer } from './inputBuffer';
import { aimPoint, lockSystem } from './lockOn';
import { movementSystem } from './movement';
import { playerControl } from './playerControl';
import { shotSystem } from './revolver';
import { spawnCombatant, spawnPlayer } from './spawn';
import { vitalsSystem } from './vitals';

export interface GameOptions {
  seed?: number;
  /** A roster creature to fight (it replaces the placeholder Deep One) or fight beside (allies). */
  creature?: string;
  variant?: Variant;
}

export function createGame({ seed = ARENA.seed, creature, variant }: GameOptions = {}): Game {
  const ecs = createEcs(createStores());
  const world = createArenaWorld();
  const id = spawnPlayer({ ecs, world }, ARENA.spawn);
  const g: Game = {
    ecs,
    world,
    events: createEventBus<GameEvents>(),
    player: { id, buffer: createBuffer(), dodgeHeld: -1, sprinting: false, blockHeld: false, echoes: 0, checkpoint: { ...ARENA.spawn } },
    camera: createCameraRig(ARENA.spawn.yaw),
    lock: { target: null, unseen: 0 },
    rng: createRng(seed),
    frame: 0,
  };
  spawnCombatant(g, TRAINING_DUMMY, ARENA.dummy, 'enemy');
  const def = creature === undefined ? undefined : resolveCreature(creature, variant);
  if (def?.tier === 'ally') spawnCreature(g, creature!, ARENA.ally, variant);
  if (def && def.tier !== 'ally') spawnCreature(g, creature!, ARENA.deepOne, variant);
  else spawnCombatant(g, DEEP_ONE, ARENA.deepOne, 'enemy');
  registerDeath(g);
  cameraSystem(g, 0, 0, 0);
  return g;
}

function cameraSystem(g: Game, lookX: number, lookY: number, dt: number): void {
  const tr = g.ecs.c.transform.get(g.player.id)!;
  const pivot = { x: tr.pos.x, y: tr.pos.y + CAMERA.pivotHeight, z: tr.pos.z };
  const focus = g.lock.target === null ? null : aimPoint(g, g.lock.target);
  stepCamera(g.camera, { lookX, lookY, pivot, focus, behind: tr.yaw }, g.world, dt);
}

/** One fixed 60 Hz step. The order matters: intent → moves → AI → motion → hits → recovery → lock → camera → death. */
export function stepGame(g: Game, input: InputFrame): void {
  const dt = 1 / SIM.hz;
  g.frame++;
  playerControl(g, input);
  actionSystem(g);
  brainSystem(g);
  movementSystem(g, dt);
  meleeSystem(g);
  shotSystem(g);
  vitalsSystem(g, dt);
  lockSystem(g);
  cameraSystem(g, input.lookX, input.lookY, dt);
  deathSystem(g);
}
