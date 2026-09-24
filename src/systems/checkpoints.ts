/**
 * Elder Signs and gates (spec §3D). A sign is found by coming near it. Resting at one (E) heals,
 * restores sanity and Laudanum, makes it the respawn point and brings the foes back, unless one is
 * hunting the investigator. From a sign they may fast-travel to any sign found, and resting at the
 * hub's Sleeper's Sign lets them descend into the Dreamlands. A gate leads to its twin in another
 * realm. Pure: no Three.js.
 */

import type { InputFrame } from '../core/input';
import { distXZ } from '../core/geom';
import type { Place } from '../data/arena';
import { CAMERA, LAUDANUM, SANITY, WORLD } from '../data/tuning';
import { worldLayout, type GatePlace, type SignPlace } from '../world/placements';
import { yawOfDir } from '../world/worldMap';
import { isAbsent, type Game } from './components';
import { resetFoes, restore } from './death';
import { spawnPiece } from './hiddenLayer';
import { spawnTome } from './insight';
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
  for (const t of w.tomes) if (!g.overworld?.read.has(t.name)) spawnTome(g, { ...t.at, name: t.name, insight: t.insight });
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
  g.player.laudanum = LAUDANUM.doses;
  setSanity(g, SANITY.max);
  ow.sign = id;
  g.player.checkpoint = { ...s.rest };
  resetFoes(g);
  reopen(g);
  g.events.emit('Rested', { sign: id, name: s.name });
  return true;
}

/** Fast travel to a sign found (spec §3D): it becomes the respawn point. */
export function travel(g: Game, id: string): boolean {
  const ow = g.overworld;
  const s = signPlace(id);
  if (!ow || !s || !ow.discovered.has(id)) return false;
  teleport(g, s.rest);
  ow.sign = id;
  g.player.checkpoint = { ...s.rest };
  g.events.emit('Travelled', { via: 'sign', to: id, name: s.name });
  return true;
}

/** From the Sleeper's Sign, down the seventy steps of light slumber into the Dreamlands. */
export function dream(g: Game): boolean {
  const at = worldLayout().dream;
  if (!g.overworld || !at || !signPlace(g.overworld.sign)?.dream) return false;
  teleport(g, at);
  g.events.emit('Travelled', { via: 'dream', to: 'slumber', name: 'Stairs of Slumber' });
  return true;
}

/** Passes a gate to its twin. */
export function passGate(g: Game, id: string): boolean {
  const twin = gatePlace(gatePlace(id)?.to ?? '');
  if (!g.overworld || !twin) return false;
  teleport(g, twin.arrive);
  g.events.emit('Travelled', { via: 'gate', to: twin.id, name: twin.name });
  return true;
}

export interface Interactable {
  kind: 'sign' | 'gate';
  id: string;
  name: string;
}

/** The nearest sign or gate within reach of a free investigator, if any. */
export function interactable(g: Game): Interactable | null {
  if (!g.overworld || g.ecs.c.actor.get(g.player.id)!.move !== null) return null;
  const pp = g.ecs.c.transform.get(g.player.id)!.pos;
  let best: Interactable | null = null;
  let bestD: number = WORLD.reach;
  const consider = (kind: Interactable['kind'], p: SignPlace | GatePlace): void => {
    const d = distXZ(p, pp);
    if (d <= bestD) [best, bestD] = [{ kind, id: p.id, name: p.name }, d];
  };
  const w = worldLayout();
  for (const s of w.signs) consider('sign', s);
  for (const t of w.gates) consider('gate', t);
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
}
