/** The arena's night: no moon, a faint cold ambient, and the investigator's lantern following the player. */

import { wrapAngle } from '../core/geom';
import { LANTERN, LIGHT } from '../data/tuning';
import type { Game } from '../systems/components';
import { worldUniforms } from './worldMaterial';

/** Switches the shared world light from the look test's moonlight to lantern-only night. */
export function lightArena(): void {
  const u = worldUniforms;
  u.uLightColor.value.set(0, 0, 0);
  u.uAmbient.value.set(...LIGHT.nightAmbient);
  u.uLanternColor.value.set(...LANTERN.color).multiplyScalar(LANTERN.intensity);
}

/** Hangs the light at the player's hip, a little ahead of them, at this frame's interpolated pose. */
export function placeLantern(g: Game, alpha: number): void {
  const tr = g.ecs.c.transform.get(g.player.id);
  if (!tr) return;
  const yaw = tr.prevYaw + wrapAngle(tr.yaw - tr.prevYaw) * alpha;
  const lerp = (p: number, q: number): number => p + (q - p) * alpha;
  worldUniforms.uLanternPos.value.set(
    lerp(tr.prev.x, tr.pos.x) + Math.sin(yaw) * LANTERN.forward,
    lerp(tr.prev.y, tr.pos.y) + LANTERN.height,
    lerp(tr.prev.z, tr.pos.z) + Math.cos(yaw) * LANTERN.forward,
  );
}
