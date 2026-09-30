/**
 * The game: the open world (Phase 4) or the combat arena (Phase 1, with a `?spawn` roster creature
 * from Phase 2). Builds the world, subscribes the event hooks (the mind from Phase 3), and runs the
 * systems in their fixed order each step.
 */

import { createEcs, type Entity } from '../core/ecs';
import { createEventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { yawOf, type V3 } from '../core/geom';
import { createRng } from '../core/rng';
import { ARENA } from '../data/arena';
import { getEntity, type Variant } from '../data/registry';
import { DEEP_ONE, TRAINING_DUMMY } from '../data/placeholders';
import type { Place } from '../data/arena';
import { START_SIGN } from '../data/sites';
import { CAMERA, GUN, LAUDANUM, REAGENT, SIM, WORLD } from '../data/tuning';
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
import { explorationSystem } from './exploration';
import { placeSystem } from './places';
import { createBuffer } from './inputBuffer';
import { insightSystem, spawnTome } from './insight';
import { aimPoint, lockSystem } from './lockOn';
import { movementSystem } from './movement';
import { createOverworld, registerOverworld } from './overworld';
import { registerArms, unreinforced } from './arms';
import { applyCarry, type Carry } from './cycles';
import { registerTally, tallySystem } from './tally';
import { registerRoomWords, roomWordsSystem } from './roomWords';
import { registerPerception } from './perception';
import { playerControl } from './playerControl';
import { npcSystem, spawnNpcs } from './npcs';
import { populationSystem } from './population';
import { boltSystem } from './projectiles';
import { questSystem } from './quests';
import { npcLife } from './npcLife';
import { registerOmens } from './omens';
import { wanderSystem } from './wanderers';
import { weatherSystem } from './weather';
import { refreshSeals, registerSeals, sealSystem } from './seals';
import { createReality, realitySystem, registerReality } from './reality';
import { reagentSystem, registerReagent } from './reagent';
import { registerHastur } from './signatures/hastur';
import { registerNyarlathotep } from './signatures/nyarlathotep';
import { shotSystem } from './revolver';
import { gunSystem, registerGun } from './gun';
import { createMind, registerSanity, sanitySystem } from './sanity';
import { applySave, type SaveData } from './save';
import { spawnCombatant, spawnPlayer } from './spawn';
import { specialSystem } from './specials';
import { strikeSystem } from './strikes';
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
    player: { id, buffer: createBuffer(), dodgeHeld: -1, sprinting: false, blockHeld: false, blockRaised: false, echoes: 0, levels: { vigour: 0, endurance: 0, might: 0 }, arms: ['cane'], weapon: 'cane', stones: 0, reinforced: unreinforced(), checkpoint: { ...spawn }, laudanum: LAUDANUM.doses, reagent: REAGENT.doses, reagentMax: REAGENT.doses, oil: 0, ammo: GUN.chamber, rounds: GUN.start, gun: 0, cycle: 0, steady: 0, mended: 0, listening: null, kneeling: null },
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
  registerReagent(g);
  registerGun(g);
  registerPerception(g);
  return g;
}

/** The open world (spec §3D): a new investigator wakes at the Miskatonic Quad; a save puts them back where they were. */
export function createWorldGame({ seed = WORLD.seed, save, carry }: { seed?: number; save?: SaveData; carry?: Carry } = {}): Game {
  const g = baseGame(createWorldCollision(), signPlace(START_SIGN)!.rest, seed);
  g.overworld = createOverworld(START_SIGN);
  registerOverworld(g);
  registerArms(g);
  registerTally(g);
  registerRoomWords(g);
  registerHastur(g);
  registerNyarlathotep(g);
  registerSeals(g);
  registerOmens(g);
  if (save) g.overworld.read = new Set(save.read); // unread tomes only
  furnishWorld(g);
  spawnNpcs(g);
  if (save) applySave(g, save);
  else if (carry) applyCarry(g, carry); // a new journey (NG+): before the world fills, so its foes are that journey's
  refreshSeals(g); // bosses slain in the save break their seals
  populationSystem(g);
  cameraSystem(g, 0, 0, 0);
  return g;
}

export function createGame({ seed = ARENA.seed, creature, variant }: GameOptions = {}): Game {
  const g = baseGame(createArenaWorld(), ARENA.spawn, seed);
  g.player.rounds = GUN.carry; // the arena has no boxes to find and no merchant
  spawnCombatant(g, TRAINING_DUMMY, ARENA.dummy, 'enemy');
  const def = creature === undefined ? undefined : resolveCreature(creature, variant);
  if (def?.tier === 'ally') spawnCreature(g, creature!, ARENA.ally, variant);
  const foe = def && def.tier !== 'ally' ? spawnCreature(g, creature!, ARENA.deepOne, variant) : undefined;
  if (foe !== undefined) {
    setArena(g, foe, { x: 0, z: 0, radius: ARENA.radius }); // a boss holds the whole arena
    standAtEdge(g, foe);
  }
  else g.ecs.c.dread.set(spawnCombatant(g, DEEP_ONE, ARENA.deepOne, 'enemy'), dreadOf(getEntity('deep_one')!)); // it weighs on the mind like the roster's Deep One
  spawnTome(g, ARENA.tome);
  for (const piece of ARENA.hidden) spawnPiece(g, piece);
  cameraSystem(g, 0, 0, 0);
  return g;
}

/** A body wider than a man's is not stood inside (round 24: `?spawn=cthulhu` began with the investigator within it): they stand a few metres off its near edge, facing it. */
function standAtEdge(g: Game, foe: Entity): void {
  const [at, body, me] = [g.ecs.c.transform.get(foe)!.pos, g.ecs.c.body.get(foe)!, g.ecs.c.transform.get(g.player.id)!];
  const gap = body.radius + 4;
  if (Math.hypot(me.pos.x - at.x, me.pos.z - at.z) >= gap) return;
  const z = at.z + gap;
  me.pos = { x: at.x, y: g.world.ground(at.x, z), z };
  me.prev = { ...me.pos };
  me.yaw = me.prevYaw = Math.PI; // toward -z, where the body stands
}

/** Where the camera looks while someone talks: at them, turned a little left so they stand clear of the investigator. */
function talkFocus(pivot: V3, at: V3 | null): V3 | null {
  if (!at) return null;
  const [len, yaw] = [Math.hypot(at.x - pivot.x, at.z - pivot.z), yawOf(at.x - pivot.x, at.z - pivot.z) + CAMERA.talkTurn];
  return { x: pivot.x + Math.sin(yaw) * len, y: at.y, z: pivot.z + Math.cos(yaw) * len };
}

function cameraSystem(g: Game, lookX: number, lookY: number, dt: number): void {
  const tr = g.ecs.c.transform.get(g.player.id)!;
  const pivot = { x: tr.pos.x, y: tr.pos.y + CAMERA.pivotHeight, z: tr.pos.z };
  const focus = g.lock.target !== null ? aimPoint(g, g.lock.target) : g.player.listening !== null ? talkFocus(pivot, aimPoint(g, g.player.listening)) : null;
  stepCamera(g.camera, { lookX, lookY, pivot, focus, behind: tr.yaw }, g.world, dt);
}

/**
 * One fixed 60 Hz step. The order matters: intent → a boss fight's E, then signs, gates and talk → moves →
 * AI → motion → hits, shots, special effects, bolts and pools → recovery → sanity → boss fights and
 * their reality hooks → lock → camera → sight → hallucinations → death → population.
 */
export function stepGame(g: Game, input: InputFrame): void {
  const dt = 1 / SIM.hz;
  g.frame++;
  playerControl(g, input);
  weatherSystem(g, dt);
  const spent = g.reality.stolen <= 0 && fightActionSystem(g, input);
  checkpointSystem(g, spent ? { ...input, pressed: { ...input.pressed, interact: false } } : input);
  npcSystem(g, dt);
  npcLife(g, dt);
  actionSystem(g);
  brainSystem(g);
  wanderSystem(g);
  movementSystem(g, dt);
  meleeSystem(g);
  shotSystem(g);
  specialSystem(g);
  strikeSystem(g);
  boltSystem(g);
  hazardSystem(g);
  vitalsSystem(g, dt);
  sanitySystem(g, dt);
  reagentSystem(g);
  gunSystem(g);
  fightSystem(g);
  realitySystem(g);
  lockSystem(g);
  cameraSystem(g, input.lookX, input.lookY, dt);
  insightSystem(g);
  explorationSystem(g);
  placeSystem(g);
  questSystem(g);
  tallySystem(g);
  roomWordsSystem(g);
  sealSystem(g);
  hallucinationSystem(g);
  deathSystem(g);
  populationSystem(g);
}
