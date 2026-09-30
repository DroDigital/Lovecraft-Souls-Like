/**
 * The night sky (playtest round 4): a sphere about the camera, drawn first and behind everything
 * (shaders/sky.ts). Each realm has its own (SKY: the Dreamlands' near moon, none under K'n-yan);
 * walking into another eases from one to the next (a journey under the veil arrives to it at
 * once), and a dungeon's walls close it off. Round 22: as the mind fails the stars go wrong (`strange`):
 * they crawl across the sky, crowd in and flicker.
 */

import * as THREE from 'three';
import { FX, LIGHT, RENDER, SKY, type SkyDef } from '../data/tuning';
import { SKY_FRAG, SKY_VERT } from './shaders/sky';

export interface Sky {
  readonly mesh: THREE.Mesh;
  /** Follows the camera; `region` picks the realm's sky (null: the plain night), `enclosed` closes it off. */
  update(camera: THREE.Camera, time: number, region: string | null, enclosed: boolean): void;
  /** How wrong the stars are, 0..1 (fx.ts): a failing mind's. */
  strange(amount: number): void;
}

const skyOf = (region: string | null): SkyDef => ({ ...SKY.base, ...(region ? SKY.regions[region] : undefined) });

export function createSky(): Sky {
  const start = skyOf(null);
  const u = {
    uTime: { value: 0 },
    uFogColor: { value: new THREE.Vector3(...FX.fogColor) },
    uHazeColor: { value: new THREE.Vector3(...SKY.haze) },
    uMoonColor: { value: new THREE.Vector3(...SKY.moonColor) },
    uMoonDir: { value: new THREE.Vector3(...LIGHT.nightMoonDir).normalize() },
    uMoon: { value: start.moon },
    uStars: { value: start.stars },
    uClouds: { value: start.clouds },
    uHaze: { value: start.haze },
    uOpen: { value: 1 },
    uWrong: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(RENDER.far * 0.8, 32, 16), material);
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  let last = 0;
  const was = new THREE.Vector3();
  const ease = (x: { value: number }, to: number, k: number): void => void (x.value += (to - x.value) * k);
  return {
    mesh,
    strange(amount) {
      u.uWrong.value = amount;
    },
    update(camera, time, region, enclosed) {
      camera.getWorldPosition(mesh.position);
      const jumped = was.distanceToSquared(mesh.position) > SKY.jump * SKY.jump;
      was.copy(mesh.position);
      const dt = Math.min(0.1, Math.max(0, time - last));
      last = time;
      const want = skyOf(region);
      const k = jumped ? 1 : Math.min(1, dt / SKY.fade);
      ease(u.uMoon, want.moon, k);
      const clear = (mesh.userData.clear as number | undefined) ?? 0; // where the horrors are gone the stars come up (omenFx.ts; round 26)
      ease(u.uStars, want.stars * (1 + clear * 0.9), k);
      ease(u.uClouds, want.clouds, k);
      ease(u.uHaze, want.haze, k);
      ease(u.uOpen, enclosed ? 0 : 1, Math.min(1, dt / SKY.close));
      u.uTime.value = time;
    },
  };
}
