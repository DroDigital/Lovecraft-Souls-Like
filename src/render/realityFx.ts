/**
 * The reality hooks as the renderer shows them (spec §3E), from the simulation's `reality`:
 * darkness shrinks the lantern's reach, puts out the moon and pulls the fog in; the Colour Out of
 * Space's drain greys what little colour the world has and dims the anomaly hues; camera warp makes
 * the lens breathe, lean and ripple. Called each frame after computeFx, before the uniforms update.
 */

import type { FxParams } from './fx';
import { LANTERN, LIGHT, REALITY } from '../data/tuning';
import type { Reality } from '../systems/components';
import { worldUniforms } from './worldMaterial';

export function applyReality(fx: FxParams, r: Reality): void {
  const drain = 1 - r.saturation;
  fx.desaturate += (1 - fx.desaturate) * drain;
  fx.anomalyProximity *= 1 - drain;
  fx.anomalyStress *= 1 - drain;
  fx.fogNear *= 1 - 0.5 * r.darkness;
  fx.fogFar *= 1 - 0.55 * r.darkness;
  fx.fovBreatheDeg += 6 * r.warp;
  fx.skew += 0.05 * r.warp;
  fx.ripple += 0.004 * r.warp;
}

/** The night's light under the darkness hook (lightNight() set the base values). */
export function lightReality(r: Reality): void {
  const u = worldUniforms;
  u.uLanternRange.value = LANTERN.range * (1 - REALITY.darkLantern * r.darkness);
  u.uLightColor.value.set(...LIGHT.nightMoon).multiplyScalar(1 - r.darkness);
  u.uAmbient.value.set(...LIGHT.nightAmbient).multiplyScalar(1 - 0.6 * r.darkness);
}
