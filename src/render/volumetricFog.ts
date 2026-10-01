/**
 * The volumetric fog's frame (playtest round 16; the march is shaders/fog.ts, in the post pass): the
 * lens, so each pixel's ray can be rebuilt from the scene's depth; where the investigator's ground
 * lies (the low mist pools there, eased as they climb or descend); and the mist of the place, the
 * region's or a dungeon room's (data/fogs.ts), turning from one to the next over a few seconds. A
 * failing mind thickens it, as it closes the far fog in; the Fog setting scales it (0: none).
 */

import * as THREE from 'three';
import { dungeonFogOf, FOGS, type FogDef } from '../data/fogs';
import { lookOf } from '../data/looks';
import { FOG } from '../data/tuning';
import type { PostPass } from './postPass';

export interface FogFrame {
  region: string | null; // the overworld's region (null: the arena)
  enclosed: boolean; // under a dungeon's roof
  ground: number; // the investigator's feet
  stress: number; // 0–1: the sanity effects' stress (capped by the FX setting)
  setting: number; // the Fog setting, 0–1
}

export interface VolumetricFog {
  update(camera: THREE.Camera, time: number, f: FogFrame): void;
  /** The next frame takes the place's own mist at once (the debug panel). */
  snap(): void;
}

/** The mist wanted where the investigator stands, in its realm's colour as it is now (data/looks.ts). */
export const fogOf = (region: string | null, enclosed: boolean): FogDef => (enclosed ? dungeonFogOf(region) : { ...(FOGS[region ?? ''] ?? FOGS.hub), color: lookOf(region).mist });

const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

/** `from` turned toward `to` by share `k` (0–1). */
export function easeFog(from: FogDef, to: FogDef, k: number): FogDef {
  return {
    density: mix(from.density, to.density, k),
    height: mix(from.height, to.height, k),
    haze: mix(from.haze, to.haze, k),
    moon: mix(from.moon, to.moon, k),
    color: [mix(from.color[0], to.color[0], k), mix(from.color[1], to.color[1], k), mix(from.color[2], to.color[2], k)],
    patchy: mix(from.patchy, to.patchy, k),
    wind: [mix(from.wind[0], to.wind[0], k), mix(from.wind[1], to.wind[1], k)],
  };
}

export function createVolumetricFog(post: PostPass): VolumetricFog {
  let now: FogDef | null = null;
  let ground = 0;
  let last = -1;
  let [dx, dz] = [0, 0]; // how far the wind has carried the mist
  return {
    snap() {
      now = null;
    },
    update(camera, time, f) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const want = fogOf(f.region, f.enclosed);
      now = now ? easeFog(now, want, Math.min(1, dt * FOG.ease)) : want; // the first frame takes the place's own at once
      ground = dt === 0 ? f.ground : mix(ground, f.ground, Math.min(1, dt * 2));
      [dx, dz] = [dx + now.wind[0] * dt, dz + now.wind[1] * dt];
      const u = post.uniforms;
      camera.updateMatrixWorld();
      u.uProjInv.value.copy(camera.projectionMatrixInverse);
      u.uCamWorld.value.copy(camera.matrixWorld);
      u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
      const thick = f.setting * (1 + FOG.madness * f.stress); // a failing mind thickens it
      u.uFog.value.set(now.density * thick, now.height, ground - 0.3, now.patchy);
      u.uFogAir.value.set(now.haze * thick, FOG.hazeHeight, now.moon, 0);
      u.uFogColor.value.set(...now.color);
      u.uFogDrift.value.set(dx, dz, time);
    },
  };
}
