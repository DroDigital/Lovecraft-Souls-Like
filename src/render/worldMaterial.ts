/** World materials: one shared uniform set (updated once per frame) + a procedural texture each. */

import * as THREE from 'three';
import { FX, LIGHT, type Vec3 } from '../data/tuning';
import type { FxParams } from './fx';
import { ANOMALY } from './palette';
import { WORLD_FRAG, WORLD_VERT } from './shaders/world';
import { generateTexture, TEXTURE_SIZE, type TextureKind } from './textures';

const v3 = (c: Vec3): THREE.Vector3 => new THREE.Vector3(c[0], c[1], c[2]);

/** Shared by every world material (same uniform objects), so one update reaches them all. */
export const worldUniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uSnap: { value: 0 },
  uAffine: { value: 0 },
  uDisplace: { value: 0 },
  uCamPos: { value: new THREE.Vector3() },
  uDispAmp: { value: FX.displaceAmp },
  uDispFreq: { value: FX.displaceFreq },
  uDispSafe: { value: FX.displaceSafe },
  uDispFull: { value: FX.displaceFull },
  uTwist: { value: FX.displaceTwist },
  uLightDir: { value: v3(LIGHT.dir).normalize() },
  uLightColor: { value: v3(LIGHT.color) },
  uAmbient: { value: v3(LIGHT.ambient) },
  uGlowPos: { value: new THREE.Vector3() },
  uGlowColor: { value: v3(ANOMALY.magenta).multiplyScalar(LIGHT.glowIntensity) },
  uGlowRange: { value: LIGHT.glowRange },
  uFogNear: { value: 0 },
  uFogFar: { value: 1 },
  uFogAmount: { value: 0 },
  uFogColor: { value: v3(FX.fogColor) },
};

export interface WorldMaterialOptions {
  texture: TextureKind;
  seed?: number;
  uvScale?: readonly [number, number];
  uvScroll?: readonly [number, number]; // texture units per second (water)
  emissive?: number; // 0 = vertex-lit, 1 = fully self-lit
  vertexColors?: boolean;
}

export function createTexture(kind: TextureKind, seed: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(generateTexture(kind, seed), TEXTURE_SIZE, TEXTURE_SIZE);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createWorldMaterial(o: WorldMaterialOptions): THREE.ShaderMaterial {
  const [su, sv] = o.uvScale ?? [1, 1];
  const [du, dv] = o.uvScroll ?? [0, 0];
  return new THREE.ShaderMaterial({
    uniforms: {
      ...worldUniforms,
      uMap: { value: createTexture(o.texture, o.seed ?? 1) },
      uUvScale: { value: new THREE.Vector2(su, sv) },
      uUvScroll: { value: new THREE.Vector2(du, dv) },
      uEmissive: { value: o.emissive ?? 0 },
    },
    vertexShader: WORLD_VERT,
    fragmentShader: WORLD_FRAG,
    vertexColors: o.vertexColors ?? false,
  });
}

/** Push this frame's FX values into the shared world uniforms. */
export function updateWorldUniforms(
  fx: FxParams,
  time: number,
  camPos: THREE.Vector3,
  glowPos: THREE.Vector3,
  res: THREE.Vector2,
): void {
  const u = worldUniforms;
  u.uTime.value = time;
  u.uRes.value.copy(res);
  u.uSnap.value = fx.snapPixels;
  u.uAffine.value = fx.affine;
  u.uDisplace.value = fx.displace;
  u.uCamPos.value.copy(camPos);
  u.uGlowPos.value.copy(glowPos);
  u.uFogNear.value = fx.fogNear;
  u.uFogFar.value = fx.fogFar;
  u.uFogAmount.value = fx.fogAmount;
}
