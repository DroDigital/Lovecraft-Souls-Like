/**
 * The water mirrors the world (round 35: the sea reflected a flat gradient and a path of moonlight, and
 * the lights and the shore and the houses standing over it were not in it): when there is sea about
 * the investigator, the scene is drawn once more from a camera mirrored in the sea's surface, at half
 * the picture's size, with whatever lies under the surface cut away (world material, `uClipY`) and the
 * sea itself left out; the sea's shader reads that picture, turned over, through its own ripples, as
 * much as the glancing angle makes a mirror of it. Render only.
 */

import * as THREE from 'three';
import { RENDER, WORLD } from '../data/tuning';
import { worldUniforms } from './worldMaterial';

export interface Reflection {
  /** Whether there is water about to be seen: the picture is drawn only then. */
  enabled: boolean;
  /** Draws the mirrored scene (before the frame is drawn), if it should be. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void;
}

/** Whether any of a ring of points about (x, z) lies under the sea: the ground is `ground`'s. */
export function waterAbout(ground: (x: number, z: number) => number, x: number, z: number): boolean {
  for (const r of [18, 55, 110]) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      if (ground(x + Math.sin(a) * r, z + Math.cos(a) * r) < WORLD.seaLevel - 0.5) return true;
    }
  }
  return false;
}

export function createReflection(): Reflection {
  const target = new THREE.WebGLRenderTarget(Math.round(RENDER.width / 2), Math.round(RENDER.height / 2), { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: true });
  const mirror = new THREE.PerspectiveCamera();
  const dir = new THREE.Vector3();
  const u = worldUniforms;
  u.uReflect.value = target.texture;
  let sea: THREE.Object3D | null | undefined;
  const self: Reflection = {
    enabled: false,
    render(renderer, scene, camera) {
      const level = WORLD.seaLevel;
      if (!self.enabled || camera.position.y < level + 0.4) {
        u.uReflectOn.value = 0;
        return;
      }
      sea ??= scene.getObjectByName('sea') ?? null;
      camera.updateMatrixWorld();
      camera.getWorldDirection(dir);
      mirror.up.set(0, 1, 0);
      mirror.position.set(camera.position.x, 2 * level - camera.position.y, camera.position.z);
      mirror.lookAt(mirror.position.x + dir.x, mirror.position.y - dir.y, mirror.position.z + dir.z);
      mirror.projectionMatrix.copy(camera.projectionMatrix);
      mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      mirror.updateMatrixWorld(true);
      const [was, hid] = [renderer.getRenderTarget(), sea?.visible ?? true];
      if (sea) sea.visible = false;
      u.uClipY.value = level - 0.02;
      renderer.setRenderTarget(target);
      renderer.render(scene, mirror);
      u.uClipY.value = -1e9;
      renderer.setRenderTarget(was);
      if (sea) sea.visible = hid;
      u.uReflectOn.value = 1;
    },
  };
  return self;
}
