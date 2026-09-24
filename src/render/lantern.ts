/** The night of the arena and the open world: a dim low moon, a faint cold ambient, and the investigator's lantern. */

import { wrapAngle } from '../core/geom';
import { LANTERN, LIGHT } from '../data/tuning';
import type { Game } from '../systems/components';
import { worldUniforms } from './worldMaterial';

/** Switches the shared world light from the look test's moonlight to night: a dim low moon, and the lantern. */
export function lightNight(): void {
  const u = worldUniforms;
  u.uLightDir.value.set(...LIGHT.nightMoonDir).normalize();
  u.uLightColor.value.set(...LIGHT.nightMoon);
  u.uAmbient.value.set(...LIGHT.nightAmbient);
  u.uLanternColor.value.set(...LANTERN.color).multiplyScalar(LANTERN.intensity);
}

/** Hangs the light at the player's left hip, where the lantern is, at this frame's interpolated pose. */
export function placeLantern(g: Game, alpha: number): void {
  const tr = g.ecs.c.transform.get(g.player.id);
  if (!tr) return;
  const yaw = tr.prevYaw + wrapAngle(tr.yaw - tr.prevYaw) * alpha;
  const [s, c] = [Math.sin(yaw), Math.cos(yaw)]; // forward (s, c), left (c, -s)
  const lerp = (p: number, q: number): number => p + (q - p) * alpha;
  worldUniforms.uLanternPos.value.set(
    lerp(tr.prev.x, tr.pos.x) + s * LANTERN.forward + c * LANTERN.side,
    lerp(tr.prev.y, tr.pos.y) + LANTERN.height,
    lerp(tr.prev.z, tr.pos.z) + c * LANTERN.forward - s * LANTERN.side,
  );
}
