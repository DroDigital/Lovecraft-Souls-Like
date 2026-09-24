/** Places the Three.js camera from the simulated third-person rig, interpolated between the last two steps. */

import type { PerspectiveCamera } from 'three';
import { wrapAngle } from '../core/geom';
import { CAMERA } from '../data/tuning';
import { lensPosition, shoulderPoint } from '../systems/camera';
import type { Game } from '../systems/components';

export function placeCamera(camera: PerspectiveCamera, g: Game, alpha: number): void {
  const tr = g.ecs.c.transform.get(g.player.id)!;
  const rig = g.camera;
  const lerp = (p: number, q: number): number => p + (q - p) * alpha;
  const pivot = {
    x: lerp(tr.prev.x, tr.pos.x),
    y: lerp(tr.prev.y, tr.pos.y) + CAMERA.pivotHeight,
    z: lerp(tr.prev.z, tr.pos.z),
  };
  const yaw = rig.prevYaw + wrapAngle(rig.yaw - rig.prevYaw) * alpha;
  const base = shoulderPoint(g.world, pivot, yaw);
  const lens = lensPosition(g.world, base, yaw, lerp(rig.prevPitch, rig.pitch), lerp(rig.prevDist, rig.dist));
  camera.position.set(lens.x, lens.y, lens.z);
  camera.lookAt(base.x, base.y, base.z);
}
