/** World materials: one shared uniform set (updated once per frame) + a procedural texture each. */

import * as THREE from 'three';
import { FX, LANTERN, LIGHT, type Vec3 } from '../data/tuning';
import type { FxParams } from './fx';
import { ANOMALY } from './palette';
import { WORLD_FRAG, WORLD_VERT } from './shaders/world';
import { generateTexture, TEXTURE_SIZE, UV_PER_TEXTURE, type TextureKind } from './textures';

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
  uLanternDecay: { value: LANTERN.decay },
  uLanternFacing: { value: LANTERN.facing },
  uCharacterLight: { value: LIGHT.character },
  uEyeRange: { value: new THREE.Vector2(...LIGHT.eyes) },
  uMarkCharacters: { value: 0 }, // 1: the Colour's sprite marks alpha for the post pass; 0 keeps direct-to-canvas renders opaque
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
  character?: 'player' | 'creature'; // takes a fixed share of the lantern without N·L, so its values hold as it turns
  vary?: number; // world-space tone variation, 0..1 (ground and walls), so repeats do not show
  bomb?: boolean; // blend a turned second sample by a noise mask: organic textures never repeat
  texture2?: TextureKind; // a second texture blended in by the geometry's aSplat attribute (roads)
  eldritch?: number; // 0..1: how far the body refuses to hold its shape (shaders/eldritch.ts)
  bodyScale?: number; // metres: the body's height, which that is measured in
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
  const k = 1 / UV_PER_TEXTURE; // geometry UVs count 64 texels to the unit
  const [su, sv] = (o.uvScale ?? [1, 1]).map((x) => x * k);
  const [du, dv] = (o.uvScroll ?? [0, 0]).map((x) => x * k);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...worldUniforms,
      uMap: { value: createTexture(o.texture, o.seed ?? 1) },
      uMap2: { value: createTexture(o.texture2 ?? o.texture, o.seed ?? 1) },
      uHasMap2: { value: o.texture2 ? 1 : 0 },
      uVary: { value: o.vary ?? 0 },
      uBomb: { value: o.bomb ? 1 : 0 },
      uUvScale: { value: new THREE.Vector2(su, sv) },
      uUvScroll: { value: new THREE.Vector2(du, dv) },
      uEmissive: { value: o.emissive ?? 0 },
      uCharacter: { value: o.character === 'player' ? 2 : o.character ? 1 : 0 },
      uEldritch: { value: o.eldritch ?? 0 },
      uBodyScale: { value: o.bodyScale ?? 1 },
      uGhost: { value: 0 },
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
