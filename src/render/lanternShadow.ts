/**
 * The lantern's shadows (round 34): a pillar, a wall's end, a trunk or a house throws the lantern's light back, and what
 * stands behind it is left in the dark, in a dungeon and under the open night alike. One depth map is drawn each frame from
 * the investigator's chest, in the way the camera looks, of the solid things about them (render/colliderShadow.ts: what the
 * simulation already holds as a collider, on the LANTERN_CASTER layer, drawn by its far faces so that the face a room shows
 * is never in its own shadow); the world and sprite shaders (shaders/shadow.ts) take what stands behind one of them out of
 * the lantern's share of the light. The world's lamps and the moon are not shadowed here. Render only.
 */

import * as THREE from 'three';
import { LANTERN_SHADOW } from '../data/fxTuning';
import { LANTERN } from '../data/tuning';
import { LANTERN_CASTER } from './colliderShadow';
import { worldUniforms } from './worldMaterial';

export interface LanternShadow {
  /** Drawn at all: the open world or a dungeon, with the setting on. */
  enabled: boolean;
  /** Draws the map from `from` (the investigator's feet) in the way `camera` looks (before the world is), and tells the shaders whether to use it. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, from: { x: number; y: number; z: number }): void;
}

export const FAR_SIDE = new THREE.ShaderMaterial({
  vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
  side: THREE.BackSide,
  colorWrite: false,
});

export function createLanternShadow(): LanternShadow {
  const { size, fov, near, reach, height, bias, offset } = LANTERN_SHADOW;
  const far = LANTERN.range + reach;
  const depthTexture = new THREE.DepthTexture(size, size);
  const target = new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true, depthTexture });
  const lens = new THREE.PerspectiveCamera(fov, 1, near, far);
  lens.layers.set(LANTERN_CASTER);
  const u = worldUniforms;
  u.uLShadowMap.value = depthTexture;
  u.uLShadowNF.value.set(near, far);
  u.uLShadow.value.set(0, 1 / size, bias, offset);
  u.uLShadowView.value = lens.matrixWorldInverse; // the camera keeps these two matrices up to date in place
  u.uLShadowProj.value = lens.projectionMatrix;
  const aim = new THREE.Vector3();
  // Held still while the camera turns (round 35: aimed afresh at every frame's look, the map's texels crawled across every shadow's edge as the mouse moved, and they shimmered): the map's aim steps in whole notches, and only when the look has gone well past the one held, so the edges are the same ones from frame to frame.
  let held: { yaw: number; pitch: number } | null = null;
  const notch = (v: number, step: number): number => Math.round(v / step) * step;
  const shadow: LanternShadow = {
    enabled: false,
    render(renderer, scene, camera, from) {
      u.uLShadow.value.x = shadow.enabled ? LANTERN_SHADOW.strength : 0; // read each frame: the debug panel's slider moves it
      if (!shadow.enabled) return;
      camera.updateMatrixWorld();
      camera.getWorldDirection(aim);
      lens.position.set(from.x, from.y + height, from.z);
      const [yaw, pitch] = [Math.atan2(aim.x, aim.z), Math.asin(Math.max(-1, Math.min(1, aim.y)))];
      const turn = held ? Math.abs(Math.atan2(Math.sin(yaw - held.yaw), Math.cos(yaw - held.yaw))) : Infinity;
      if (!held || turn > LANTERN_SHADOW.hold || Math.abs(pitch - held.pitch) > LANTERN_SHADOW.hold) held = { yaw: notch(yaw, LANTERN_SHADOW.notch), pitch: notch(pitch, LANTERN_SHADOW.notch) };
      const [cp, sp] = [Math.cos(held.pitch), Math.sin(held.pitch)];
      lens.lookAt(lens.position.x + Math.sin(held.yaw) * cp, lens.position.y + sp, lens.position.z + Math.cos(held.yaw) * cp);
      lens.updateMatrixWorld(true);
      const [was, material] = [renderer.getRenderTarget(), scene.overrideMaterial];
      scene.overrideMaterial = FAR_SIDE;
      renderer.setRenderTarget(target);
      renderer.render(scene, lens);
      scene.overrideMaterial = material;
      renderer.setRenderTarget(was);
    },
  };
  return shadow;
}
