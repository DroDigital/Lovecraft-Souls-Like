/**
 * The game: the open world (Phase 4) or the combat arena (Phase 1, with a `?spawn` roster creature
 * from Phase 2). Builds the world, subscribes the event hooks (the mind from Phase 3), and runs the
 * systems in their fixed order each step.
 */

import { createEcs } from '../core/ecs';
import { createEventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { createRng } from '../core/rng';
import { ARENA } from '../data/arena';
import { getEntity, type Variant } from '../data/registry';
import { DEEP_ONE, TRAINING_DUMMY } from '../data/placeholders';
import type { Place } from '../data/arena';
import { START_SIGN } from '../data/sites';
import { CAMERA, LAUDANUM, SIM, WORLD } from '../data/tuning';
import { createArenaWorld } from '../world/arena';
import type { CollisionWorld } from '../world/colliders';
import { createWorldCollision } from '../world/worldCollision';
import { actionSystem } from './actions';
import { fightSystem, registerFights, setArena } from './bossFight';
import { brainSystem } from './brain';
import { createCameraRig, stepCamera } from './camera';
import { checkpointSystem, furnishWorld, signPlace } from './checkpoints';
import { meleeSystem } from './combat';
import { createStores, type Game, type GameEvents } from './components';
import { dreadOf, resolveCreature, spawnCreature } from './creatures';
import { deathSystem, registerDeath } from './death';
import { fightActionSystem } from './fightActions';
import { hallucinationSystem, registerHallucinations } from './hallucinations';
import { hazardSystem } from './hazards';
import { registerHiddenLayer, spawnPiece } from './hiddenLayer';
import { createBuffer } from './inputBuffer';
import { insightSystem, spawnTome } from './insight';
import { aimPoint, lockSystem } from './lockOn';
import { movementSystem } from './movement';
import { createOverworld, registerOverworld } from './overworld';
import { playerControl } from './playerControl';
import { populationSystem } from './population';
import { boltSystem } from './projectiles';
import { createReality, realitySystem, registerReality } from './reality';
import { registerHastur } from './signatures/hastur';
import { registerNyarlathotep } from './signatures/nyarlathotep';
import { shotSystem } from './revolver';
import { createMind, registerSanity, sanitySystem } from './sanity';
import { applySave, type SaveData } from './save';
import { spawnCombatant, spawnPlayer } from './spawn';
import { specialSystem } from './specials';
import { registerVariantSwap } from './variantSwap';
import { vitalsSystem } from './vitals';

export interface GameOptions {
  seed?: number;
  /** A roster creature to fight (it replaces the placeholder Deep One) or fight beside (allies). */
  creature?: string;
  variant?: Variant;
}

/** The investigator in a world, with the hooks every game shares. */
function baseGame(world: CollisionWorld, spawn: Place, seed: number): Game {
  const ecs = createEcs(createStores());
  const id = spawnPlayer({ ecs, world }, spawn);
  const g: Game = {
    ecs,
    world,
    events: createEventBus<GameEvents>(),
    player: { id, buffer: createBuffer(), dodgeHeld: -1, sprinting: false, blockHeld: false, echoes: 0, checkpoint: { ...spawn }, laudanum: LAUDANUM.doses },
    mind: createMind(),
    camera: createCameraRig(spawn.yaw),
    lock: { target: null, unseen: 0 },
    rng: createRng(seed),
    frame: 0,
    reality: createReality(),
  };
  registerDeath(g);
  registerSanity(g);
  registerHiddenLayer(g);
  registerVariantSwap(g);
  registerHallucinations(g);
  registerFights(g);
  registerReality(g);
  return g;
}

/** The open world (spec §3D): a new investigator wakes at the Miskatonic Quad; a save puts them back where they were. */
export function createWorldGame({ seed = WORLD.seed, save }: { seed?: number; save?: SaveData } = {}): Game {
  const g = baseGame(createWorldCollision(), signPlace(START_SIGN)!.rest, seed);
  g.overworld = createOverworld(START_SIGN);
  registerOverworld(g);
  registerHastur(g);
  registerNyarlathotep(g);
  if (save) g.overworld.read = new Set(save.read); // unread tomes only
  furnishWorld(g);
  if (save) applySave(g, save);
  populationSystem(g);
  cameraSystem(g, 0, 0, 0);
  return g;
}

export function createGame({ seed = ARENA.seed, creature, variant }: GameOptions = {}): Game {
  const g = baseGame(createArenaWorld(), ARENA.spawn, seed);
  spawnCombatant(g, TRAINING_DUMMY, ARENA.dummy, 'enemy');
  const def = creature === undefined ? undefined : resolveCreature(creature, variant);
  if (def?.tier === 'ally') spawnCreature(g, creature!, ARENA.ally, variant);
  const foe = def && def.tier !== 'ally' ? spawnCreature(g, creature!, ARENA.deepOne, variant) : undefined;
  if (foe !== undefined) setArena(g, foe, { x: 0, z: 0, radius: ARENA.radius }); // a boss holds the whole arena
  else g.ecs.c.dread.set(spawnCombatant(g, DEEP_ONE, ARENA.deepOne, 'enemy'), dreadOf(getEntity('deep_one')!)); // it weighs on the mind like the roster's Deep One
  spawnTome(g, ARENA.tome);
  for (const piece of ARENA.hidden) spawnPiece(g, piece);
  cameraSystem(g, 0, 0, 0);
  return g;
}

function cameraSystem(g: Game, lookX: number, lookY: number, dt: number): void {
  const tr = g.ecs.c.transform.get(g.player.id)!;
  const pivot = { x: tr.pos.x, y: tr.pos.y + CAMERA.pivotHeight, z: tr.pos.z };
  const focus = g.lock.target === null ? null : aimPoint(g, g.lock.target);
  stepCamera(g.camera, { lookX, lookY, pivot, focus, behind: tr.yaw }, g.world, dt);
}

/**
 * One fixed 60 Hz step. The order matters: intent → a boss fight's E, then signs and gates → moves →
 * AI → motion → hits, shots, special effects, bolts and pools → recovery → sanity → boss fights and
 * their reality hooks → lock → camera → sight → hallucinations → death → population.
 */
export function stepGame(g: Game, input: InputFrame): void {
  const dt = 1 / SIM.hz;
  g.frame++;
  playerControl(g, input);
  const spent = g.reality.stolen <= 0 && fightActionSystem(g, input);
  checkpointSystem(g, spent ? { ...input, pressed: { ...input.pressed, interact: false } } : input);
  actionSystem(g);
  brainSystem(g);
  movementSystem(g, dt);
  meleeSystem(g);
  shotSystem(g);
  specialSystem(g);
  boltSystem(g);
  hazardSystem(g);
  vitalsSystem(g, dt);
  sanitySystem(g, dt);
  fightSystem(g);
  realitySystem(g);
  lockSystem(g);
  cameraSystem(g, input.lookX, input.lookY, dt);
  insightSystem(g);
  hallucinationSystem(g);
  deathSystem(g);
  populationSystem(g);
}
