/**
 * FX controller hook (spec §3A): each frame the investigator's sanity and the nearest anomaly
 * (glowing horrors, dropped Echoes, shown hidden-layer stone) fill the FxState, and a band change
 * for the worse sends a pulse of warp. main.ts turns the state into shader uniforms and audio
 * detune/distortion (`computeFx` → `update*Uniforms`, render/audio/). Pure: no Three.js.
 */

import { dist3, type V3 } from '../core/geom';
import { FX } from '../data/tuning';
import { isAbsent, type Game } from '../systems/components';
import { bandIndex } from '../systems/sanity';
import { anomalyProximity, type FxState } from './fx';

/** anomalyProximity of the nearest anomaly-coloured thing to `from` (the camera). */
export function nearestAnomaly(g: Game, from: V3): number {
  const { dread, drop, piece, layer, transform } = g.ecs.c;
  let best = 0;
  const near = (id: number): void => {
    const p = transform.get(id)?.pos;
    if (p) best = Math.max(best, anomalyProximity(dist3(from, p)));
  };
  for (const [id, d] of dread) if (d.glow && !isAbsent(g, id)) near(id);
  for (const id of drop.keys()) near(id);
  for (const id of piece.keys()) if (layer.get(id)?.shown) near(id);
  return best;
}

export interface FxController {
  /** Fills `state` for this frame: `seconds` is render time, `camera` the lens position. */
  update(state: FxState, camera: V3, seconds: number): void;
}

export function createFxController(g: Game): FxController {
  let worse = false;
  let pulseAt = -Infinity;
  g.events.on('SanityBandChanged', ({ from, to }) => void (worse ||= bandIndex(to) > bandIndex(from)));
  return {
    update(state, camera, seconds) {
      if (worse) [pulseAt, worse] = [seconds, false];
      state.sanity = g.mind.sanity;
      state.anomalyProximity = nearestAnomaly(g, camera);
      state.pulse = Math.max(0, 1 - (seconds - pulseAt) / FX.pulseSeconds);
    },
  };
}
