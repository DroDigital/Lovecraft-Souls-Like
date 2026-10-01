/**
 * Elder Signs and gates (spec §3D). A sign is found by coming near it. Resting at one (E) heals,
 * restores sanity and Laudanum, makes it the respawn point and brings the foes back, unless one is
 * hunting the investigator. From a sign, or from the map when nothing hunts them (playtest round 7),
 * they may fast-travel to any sign found, and resting at the hub's Sleeper's Sign lets them descend
 * into the Dreamlands. A gate leads to its twin in another realm. Pure: no Three.js.
 */

import { talk } from './npcs';
import { npcDef } from '../data/npcs';
import type { InputFrame } from '../core/input';
import { distXZ } from '../core/geom';
import type { Place } from '../data/arena';
import { CAMERA, SANITY, WORLD } from '../data/tuning';
import { fogToPass, passFog } from './fogGates';
import { worldLayout, type GatePlace, type SignPlace } from '../world/placements';
import { yawOfDir } from '../world/worldMap';
import { engagedFights } from './bossFight';
import { isAbsent, type Game } from './components';
import { resetFoes, restore } from './death';
import { loadRounds } from './gun';
import { spawnPiece } from './hiddenLayer';
import { spawnTome } from './insight';
import { laudanumMax } from './levels';
import { setLock } from './lockOn';
import { reopen } from './overworld';
import { setSanity } from './sanity';

export const signPlace = (id: string): SignPlace | undefined => worldLayout().signs.find((s) => s.id === id);
export const gatePlace = (id: string): GatePlace | undefined => worldLayout().gates.find((g) => g.id === id);

/** Puts the world's Elder Signs, gates, unread tomes and hidden-layer pieces into the game. */
export function furnishWorld(g: Game): void {
  const w = worldLayout();
  const c = g.ecs.c;
  const put = (x: number, z: number, yaw: number, model: string): number => {
    const e = g.ecs.spawn();
    const pos = { x, y: g.world.ground(x, z), z };
    c.transform.set(e, { pos, prev: { ...pos }, yaw, prevYaw: yaw });
    c.model.set(e, model);
    return e;
  };
  for (const s of w.signs) c.sign.set(put(s.x, s.z, yawOfDir(s.face), 'elderSign'), { id: s.id, name: s.name });
  for (const t of w.gates) c.gate.set(put(t.x, t.z, yawOfDir(t.face), 'gate'), { id: t.id, name: t.name, to: t.to });
  for (const t of w.tomes) if (!g.overworld?.read.has(t.name)) spawnTome(g, { ...t.at, name: t.name, insight: t.insight, vial: t.vial, note: t.note, echoes: t.echoes, weapon: t.weapon, rounds: t.rounds });
  for (const p of w.pieces) spawnPiece(g, p);
}

/** Moves the investigator to `at` (no healing), the camera behind them. */
export function teleport(g: Game, at: Place): void {
  const tr = g.ecs.c.transform.get(g.player.id)!;
  tr.pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
  tr.prev = { ...tr.pos };
  [tr.yaw, tr.prevYaw] = [at.yaw, at.yaw];
  Object.assign(g.ecs.c.mover.get(g.player.id)!, { vx: 0, vz: 0, face: at.yaw });
  setLock(g, null);
  g.player.listening = null;
  g.player.kneeling = null;
  Object.assign(g.camera, { yaw: at.yaw, prevYaw: at.yaw, pitch: CAMERA.pitch, prevPitch: CAMERA.pitch });
}

/** Marks a sign found; true the first time. */
export function discover(g: Game, id: string): boolean {
  const ow = g.overworld;
  const s = signPlace(id);
  if (!ow || !s || ow.discovered.has(id)) return false;
  ow.discovered.add(id);
  g.events.emit('Discovered', { sign: id, name: s.name });
  return true;
}

/** Whether a foe is hunting the investigator close by (no resting then). */
export function hunted(g: Game): boolean {
  const pp = g.ecs.c.transform.get(g.player.id)!.pos;
  for (const [id, br] of g.ecs.c.brain) {
    if (br.target !== g.player.id || br.state !== 'engage' || isAbsent(g, id)) continue;
    if (distXZ(g.ecs.c.transform.get(id)!.pos, pp) <= WORLD.restFoes) return true;
  }
  return false;
}

/** Rests at a sign: whole again, sanity and Laudanum restored, the respawn point set, the foes back. */
export function rest(g: Game, id: string): boolean {
  const ow = g.overworld;
  const s = signPlace(id);
  if (!ow || !s) return false;
  if (hunted(g)) {
    g.events.emit('RestRefused', { sign: id });
    return false;
  }
  discover(g, id);
  const tr = g.ecs.c.transform.get(g.player.id)!;
  restore(g, g.player.id, { x: tr.pos.x, z: tr.pos.z, yaw: tr.yaw });
  g.player.laudanum = laudanumMax(g);
  g.player.reagent = g.player.reagentMax;
  loadRounds(g); // the cylinder filled from the spare rounds
  setSanity(g, SANITY.max);
  ow.sign = id;
  g.player.checkpoint = { ...s.rest };
  resetFoes(g);
  reopen(g);
  g.player.kneeling = { x: s.x, z: s.z }; // down on one knee before the stone (round 15)
  g.events.emit('Rested', { sign: id, name: s.name });
  return true;
}

/** Fast travel to a sign found (spec §3D): it becomes the respawn point. */
export function travel(g: Game, id: string): boolean {
  const ow = g.overworld;
  const s = signPlace(id);
  if (!ow || !s || !ow.discovered.has(id)) return false;
  teleport(g, s.rest);
  g.player.kneeling = { x: s.x, z: s.z }; // they arrive on one knee before the stone, as after a rest (round 29)
  ow.sign = id;
  g.player.checkpoint = { ...s.rest };
  g.events.emit('Travelled', { via: 'sign', to: id, name: s.name });
  return true;
}

/**
 * Why no journey may begin from the map now (playtest round 7), or null: a boss fight on, a foe
 * hunting the investigator close by (as for resting), or the investigator fallen.
 */
export function travelBar(g: Game): 'boss' | 'foes' | 'fallen' | null {
  if (engagedFights(g).length) return 'boss';
  if (hunted(g)) return 'foes';
  return g.ecs.c.health.get(g.player.id)!.hp <= 0 ? 'fallen' : null;
}

/** Whether the stair into the Dreamlands opens: only once Keziah Mason is gone from the Witch House (round 12). */
export const descentOpen = (g: Game): boolean => !!g.overworld?.slain.has('boss:keziah_mason');

/** From the Sleeper's Sign, down the seventy steps of light slumber into the Dreamlands (once it opens). */
export function dream(g: Game): boolean {
  const at = worldLayout().dream;
  if (!g.overworld || !at || !signPlace(g.overworld.sign)?.dream || !descentOpen(g)) return false;
  teleport(g, at);
  g.events.emit('Travelled', { via: 'dream', to: 'slumber', name: 'Stairs of Slumber' });
  return true;
}

/** Whether a gate is barred now: none opens while a boss fight holds the investigator (round 12: the Ultimate Gate stands in Kadath's hall). */
export function gateBarred(g: Game): boolean {
  return engagedFights(g).length > 0;
}

/** Passes a gate to its twin (refused, and told why, while a boss fight is on). */
export function passGate(g: Game, id: string): boolean {
  const twin = gatePlace(gatePlace(id)?.to ?? '');
  if (!g.overworld || !twin) return false;
  if (gateBarred(g)) {
    g.events.emit('Notice', { text: 'THE GATE WILL NOT OPEN WHILE A HORROR HOLDS YOU' });
    return false;
  }
  teleport(g, twin.arrive);
  g.events.emit('Travelled', { via: 'gate', to: twin.id, name: twin.name });
  return true;
}

export interface Interactable {
  kind: 'sign' | 'gate' | 'npc' | 'fog';
  id: string;
  name: string;
}

/**
 * How near a thing at distance `d` seems to an investigator facing `yaw`: its distance, lengthened
 * the further it lies from straight ahead, so E takes the one they face (playtest round 12: near a
 * sign, the person standing by it took E from their side).
 */
function seems(at: { x: number; z: number }, from: { x: number; z: number }, yaw: number, d: number): number {
  if (d < 1e-3) return 0;
  const cos = (Math.sin(yaw) * (at.x - from.x) + Math.cos(yaw) * (at.z - from.z)) / d;
  return d * (1 + (WORLD.faceWeight * (1 - cos)) / 2);
}

/** The sign, gate or person within reach of a free investigator that they face most nearly, if any. */
export function interactable(g: Game): Interactable | null {
  if (!g.overworld || g.ecs.c.actor.get(g.player.id)!.move !== null) return null;
  const tr = g.ecs.c.transform.get(g.player.id)!;
  let best: Interactable | null = null;
  let bestScore = Infinity;
  const consider = (it: Interactable, at: { x: number; z: number }, reach: number): void => {
    const d = distXZ(at, tr.pos);
    const score = d <= reach ? seems(at, tr.pos, tr.yaw, d) : Infinity;
    if (score < bestScore) [best, bestScore] = [it, score];
  };
  const w = worldLayout();
  for (const s of w.signs) consider({ kind: 'sign', id: s.id, name: s.name }, s, WORLD.signReach);
  for (const t of w.gates) consider({ kind: 'gate', id: t.id, name: t.name }, t, WORLD.reach);
  for (const [e, id] of g.ecs.c.npc) consider({ kind: 'npc', id, name: npcDef(id)?.name ?? id }, g.ecs.c.transform.get(e)!.pos, WORLD.reach);
  const fog = fogToPass(g); // a boss's fog, close by: E passes it (round 35)
  if (fog && best === null) return { kind: 'fog', id: fog.id, name: 'the fog' };
  return best;
}

/** One step: signs found by coming near, and the interact button (rest, or pass a gate). */
export function checkpointSystem(g: Game, input: InputFrame): void {
  if (!g.overworld) return;
  const pp = g.ecs.c.transform.get(g.player.id)!.pos;
  for (const s of worldLayout().signs) if (!g.overworld.discovered.has(s.id) && distXZ(s, pp) <= WORLD.discover) discover(g, s.id);
  if (!input.pressed.interact) return;
  const t = interactable(g);
  if (t?.kind === 'sign') rest(g, t.id);
  else if (t?.kind === 'gate') passGate(g, t.id);
  else if (t?.kind === 'npc') talk(g, t.id);
  else if (t?.kind === 'fog') {
    const w = fogToPass(g);
    if (w) passFog(g, w);
  }
}
