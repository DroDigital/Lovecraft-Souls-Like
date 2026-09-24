/** Camera side of the non-Euclidean distortion: FOV "breathing" and a slight projection skew. */

import type { PerspectiveCamera } from 'three';

export function applyLens(camera: PerspectiveCamera, fovDeg: number, skew: number): void {
  camera.fov = fovDeg;
  camera.updateProjectionMatrix();
  if (skew === 0) return;
  const m = camera.projectionMatrix.elements;
  m[4] = skew * m[5]; // x_ndc += skew * y_ndc: vertical lines lean
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
