/**
 * HiddenLayer hook (spec §3A): eldritch geometry, bridges and doors — and a few creatures, like the
 * Being from Beyond — exist only for the enlightened: while insight ≥ minInsight and the sanity
 * band lies wholly at or below maxSanity (a band floor, so the band's hysteresis carries over).
 * It listens for band and insight changes. A hidden piece's colliders leave the world (and its seal,
 * the wall a hidden door opens or the edge of the chasm a hidden bridge spans, stands); a hidden
 * creature is absent (`isAbsent`): it neither acts nor collides, and nothing can see or touch it.
 */

import type { Entity } from '../core/ecs';
import type { HiddenPieceDef } from '../data/arena';
import { pieceColliders } from '../world/arena';
import type { Game, Layer, Mind } from './components';
import { bandCeiling } from './sanity';

/** Whether a hidden layer shows to a mind with this insight and band. */
export function layerShown(m: Mind, l: Pick<Layer, 'minInsight' | 'maxSanity'>): boolean {
  return (l.minInsight === undefined || m.insight >= l.minInsight) && (l.maxSanity === undefined || bandCeiling(m.band) <= l.maxSanity);
}

/** A creature leaving the world forgets its fight: no move, no target. */
function quiet(g: Game, id: Entity): void {
  const a = g.ecs.c.actor.get(id);
  if (a) Object.assign(a, { move: null, frame: 0, hitstop: 0, frozen: false, guard: false });
  const br = g.ecs.c.brain.get(id);
  if (br) Object.assign(br, { state: 'idle', target: null, lost: 0, aware: 0, last: null });
}

/** Shows or hides one layered entity to match the mind. */
export function applyLayer(g: Game, id: Entity): void {
  const l = g.ecs.c.layer.get(id)!;
  const shown = layerShown(g.mind, l);
  if (shown === l.shown) return;
  l.shown = shown;
  const piece = g.ecs.c.piece.get(id);
  for (const c of piece?.colliders ?? []) {
    if (shown) g.world.off.delete(c);
    else g.world.off.add(c);
  }
  for (const c of piece?.seal ?? []) {
    if (shown) g.world.off.add(c);
    else g.world.off.delete(c);
  }
  if (!shown) quiet(g, id);
}

/** Puts an entity on a hidden layer, hiding it at once if the mind cannot see it. */
export function addLayer(g: Game, id: Entity, hidden: { minInsight?: number; maxSanity?: number }): void {
  g.ecs.c.layer.set(id, { ...hidden, shown: true });
  applyLayer(g, id);
}

/** Hidden-layer geometry: its colliders join the world, switched on and off with the layer (its seal's the other way round). */
export function spawnPiece(g: Game, def: HiddenPieceDef): Entity {
  const e = g.ecs.spawn();
  const pos = { x: def.x, y: g.world.ground(def.x, def.z), z: def.z };
  g.ecs.c.transform.set(e, { pos, prev: { ...pos }, yaw: 0, prevYaw: 0 });
  const colliders = pieceColliders(def);
  const seal = def.seal ? pieceColliders({ ...def, boxes: def.seal.boxes }) : [];
  g.world.colliders.push(...colliders, ...seal);
  for (const c of seal) g.world.off.add(c); // a fresh layer counts as shown until addLayer settles it
  g.ecs.c.piece.set(e, { def, colliders, seal });
  addLayer(g, e, { minInsight: def.minInsight, maxSanity: def.maxSanity });
  return e;
}

/** Subscribes the hook: every band or insight change re-checks every layer. */
export function registerHiddenLayer(g: Game): void {
  const update = (): void => {
    for (const id of g.ecs.c.layer.keys()) applyLayer(g, id);
  };
  g.events.on('SanityBandChanged', update);
  g.events.on('InsightChanged', update);
}
