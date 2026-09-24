/**
 * Lock-on (spec §3B): candidates within 25 m and in line of sight, scored by distance plus the
 * horizontal angle from the camera's forward direction (lower wins). Switch left/right on screen;
 * the lock breaks on range or when sight is lost for longer than a short grace period.
 */

import type { Entity } from '../core/ecs';
import { dist3, type V3 } from '../core/geom';
import { CAMERA, LOCK, PLAYER } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import type { Game } from './components';

export interface LockState {
  target: Entity | null;
  unseen: number; // frames the target has been out of sight
}

/** A lockable foe: its aim point and whether the player can see it. */
export interface Candidate {
  id: Entity;
  pos: V3;
  visible: boolean;
}

/** The camera's horizontal view: where it stands and which way it looks. */
export interface View {
  x: number;
  z: number;
  yaw: number;
}

/** Signed horizontal angle of `p` from the view's forward direction; positive = right of centre. */
export function viewAngle(view: View, p: V3): number {
  const dx = p.x - view.x;
  const dz = p.z - view.z;
  const fx = Math.sin(view.yaw);
  const fz = Math.cos(view.yaw);
  return Math.atan2(-dx * fz + dz * fx, dx * fx + dz * fz);
}

/** Metres from the player's eye plus LOCK.angleWeight metres per radian off the camera's forward. */
export function lockScore(eye: V3, view: View, p: V3): number {
  return dist3(eye, p) + LOCK.angleWeight * Math.abs(viewAngle(view, p));
}

const eligible = (eye: V3, c: Candidate): boolean => c.visible && dist3(eye, c.pos) <= LOCK.range;

/** Best-scoring eligible candidate, or null. */
export function pickTarget(eye: V3, view: View, cands: readonly Candidate[]): Entity | null {
  let best: Entity | null = null;
  let bestScore = Infinity;
  for (const c of cands) {
    if (!eligible(eye, c)) continue;
    const s = lockScore(eye, view, c.pos);
    if (s < bestScore) [best, bestScore] = [c.id, s];
  }
  return best;
}

/** The nearest eligible candidate on screen to the left (-1) or right (+1) of the current one; else the current one. */
export function switchTarget(eye: V3, view: View, current: Entity, cands: readonly Candidate[], dir: -1 | 1): Entity {
  const cur = cands.find((c) => c.id === current);
  const base = cur ? viewAngle(view, cur.pos) : 0;
  let best = current;
  let bestDelta = Infinity;
  for (const c of cands) {
    if (c.id === current || !eligible(eye, c)) continue;
    const delta = (viewAngle(view, c.pos) - base) * dir;
    if (delta > 0 && delta < bestDelta) [best, bestDelta] = [c.id, delta];
  }
  return best;
}

/** Updates a held lock; false once the target is gone, beyond LOCK.breakRange, or unseen past the grace period. */
export function holdLock(lock: LockState, eye: V3, target: Candidate | undefined): boolean {
  if (!target || dist3(eye, target.pos) > LOCK.breakRange) return false;
  lock.unseen = target.visible ? 0 : lock.unseen + 1;
  return lock.unseen <= LOCK.graceFrames;
}

export function playerEye(g: Game): V3 {
  const p = g.ecs.c.transform.get(g.player.id)!.pos;
  return { x: p.x, y: p.y + PLAYER.eyeHeight, z: p.z };
}

/** Aim point of an entity (lock-on and revolver target). */
export function aimPoint(g: Game, id: Entity): V3 | null {
  const p = g.ecs.c.transform.get(id)?.pos;
  const b = g.ecs.c.body.get(id);
  return p && b ? { x: p.x, y: p.y + b.aimHeight, z: p.z } : null;
}

/** Living foes of the player, with line of sight from the player's eye. */
export function candidates(g: Game): Candidate[] {
  const { combatant, health, dead } = g.ecs.c;
  const eye = playerEye(g);
  const out: Candidate[] = [];
  for (const [id, c] of combatant) {
    const pos = aimPoint(g, id);
    if (c.faction === 'player' || dead.has(id) || (health.get(id)?.hp ?? 0) <= 0 || !pos) continue;
    out.push({ id, pos, visible: hasLineOfSight(g.world, eye, pos) });
  }
  return out;
}

const view = (g: Game): View => ({ x: g.camera.pos.x, z: g.camera.pos.z, yaw: g.camera.yaw });

export function setLock(g: Game, target: Entity | null): void {
  g.lock.unseen = 0;
  if (g.lock.target === target) return;
  g.lock.target = target;
  g.events.emit('LockChanged', { target });
}

/** Lock button: release a held lock, else lock the best candidate, or recentre the camera if there is none. */
export function toggleLock(g: Game): void {
  if (g.lock.target !== null) return setLock(g, null);
  const t = pickTarget(playerEye(g), view(g), candidates(g));
  if (t === null) g.camera.recenter = CAMERA.recenterFrames;
  setLock(g, t);
}

export function switchLock(g: Game, dir: -1 | 1): void {
  if (g.lock.target !== null) setLock(g, switchTarget(playerEye(g), view(g), g.lock.target, candidates(g), dir));
}

/** Breaks the lock on range or lost sight (spec §3B). */
export function lockSystem(g: Game): void {
  if (g.lock.target === null) return;
  const t = candidates(g).find((c) => c.id === g.lock.target);
  if (!holdLock(g.lock, playerEye(g), t)) setLock(g, null);
}
