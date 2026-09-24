/** World materials: one shared uniform set (updated once per frame) + a procedural texture each. */

import * as THREE from 'three';
import { FX, GRADE, LANTERN, LIGHT, type Vec3 } from '../data/tuning';
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
  uLanternPos: { value: new THREE.Vector3() },
  uLanternColor: { value: new THREE.Vector3() }, // black: off until a scene lights it (lantern.ts)
  uLanternRange: { value: LANTERN.range },
  uLanternHard: { value: LANTERN.hard },
  uLanternDecay: { value: LANTERN.decay },
  uLanternRagged: { value: LANTERN.ragged },
  uLanternFacing: { value: LANTERN.facing },
  uCharacterLight: { value: LIGHT.character },
  uMarkCharacters: { value: 0 }, // 1: characters mark alpha for the post pass's rim; 0 keeps direct-to-canvas renders opaque
  uRimNear: { value: GRADE.rimFade[0] },
  uRimFar: { value: GRADE.rimFade[1] },
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
  character?: 'player' | 'creature'; // gets the post pass's rim light (the two kinds are rimmed against each other too)
}

const textures = new Map<string, THREE.DataTexture>();

/** One shared texture per (kind, seed). Nearest mip of nearest texel: crisp up close, no moiré far away. */
export function createTexture(kind: TextureKind, seed: number): THREE.DataTexture {
  const key = `${kind}:${seed}`;
  const cached = textures.get(key);
  if (cached) return cached;
  const tex = new THREE.DataTexture(generateTexture(kind, seed), TEXTURE_SIZE, TEXTURE_SIZE);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  textures.set(key, tex);
  return tex;
}

/** `userData.emissive` keeps the base emissive level, so hit flashes can add to it and fade back. */
export function createWorldMaterial(o: WorldMaterialOptions): THREE.ShaderMaterial {
  const [su, sv] = o.uvScale ?? [1, 1];
  const [du, dv] = o.uvScroll ?? [0, 0];
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...worldUniforms,
      uMap: { value: createTexture(o.texture, o.seed ?? 1) },
      uUvScale: { value: new THREE.Vector2(su, sv) },
      uUvScroll: { value: new THREE.Vector2(du, dv) },
      uEmissive: { value: o.emissive ?? 0 },
      uCharacter: { value: o.character === 'player' ? 2 : o.character ? 1 : 0 },
    },
    vertexShader: WORLD_VERT,
    fragmentShader: WORLD_FRAG,
    vertexColors: o.vertexColors ?? false,
  });
  material.userData.emissive = o.emissive ?? 0;
  return material;
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
