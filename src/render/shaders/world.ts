/**
 * World material GLSL (spec §2): Gouraud vertex lighting (ambient, moon, glow), the player's lantern
 * per pixel with a smooth falloff, PS1 vertex snapping, affine texture wobble (uv·w passed through,
 * divided per fragment), world-space texture variation (so no ground repeats), fog fading to
 * near-black, sanity-driven non-Euclidean vertex displacement, and the eldritch bodies' wrongness
 * (shaders/eldritch.ts).
 */

import { ELDRITCH_FRAG, ELDRITCH_VERT } from './eldritch';

/**
 * The player's lantern (world and sprite shaders): inverse-square decay, windowed smoothly to nothing
 * at its range, so the pool of light fades naturally instead of ending at an edge.
 */
export const LANTERN_GLSL = /* glsl */ `
uniform vec3 uLanternPos;
uniform vec3 uLanternColor;
uniform float uLanternRange;
uniform float uLanternDecay;

float lanternFalloff(float d) {
  float x = clamp(d / max(uLanternRange, 0.001), 0.0, 1.0);
  float x2 = x * x;
  float win = 1.0 - x2 * x2;
  return win * win / (1.0 + uLanternDecay * d * d);
}

float lanternAt(vec3 toLamp) {
  return lanternFalloff(length(toLamp));
}
`;

/** Cheap value noise over the world, for texture variation. */
export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

export const WORLD_VERT = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
uniform float uSnap;
uniform float uDisplace;
uniform vec3 uCamPos;
uniform float uDispAmp;
uniform float uDispFreq;
uniform float uDispSafe;
uniform float uDispFull;
uniform float uTwist;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uGlowPos;
uniform vec3 uGlowColor;
uniform float uGlowRange;
uniform float uFogNear;
uniform float uFogFar;
uniform float uEmissive;
uniform vec2 uUvScale;
uniform vec2 uUvScroll;

attribute float aSplat; // the second ground texture's share (roads, paths); 0 where a mesh has none
${ELDRITCH_VERT}

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying vec3 vTint;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFog;
varying float vSplat;

// Non-Euclidean distortion. Nothing moves near the camera, so combat stays readable.
vec3 displace(vec3 wp) {
  vec3 rel = wp - uCamPos;
  float d = length(rel.xz);
  float w = smoothstep(uDispSafe, uDispFull, d) * uDisplace;
  if (w <= 0.0) return wp;
  float f = uDispFreq;
  wp += w * uDispAmp * vec3(
    sin(wp.y * f * 1.7 + wp.z * f + uTime * 1.3),
    0.5 * sin(wp.x * f + wp.z * f * 0.8 + uTime * 0.9),
    sin(wp.x * f * 1.3 + wp.y * f * 1.9 + uTime * 1.1));
  float a = w * uTwist * sin(uTime * 0.21 + d * 0.05);
  rel = wp - uCamPos;
  wp.xz = uCamPos.xz + mat2(cos(a), sin(a), -sin(a), cos(a)) * rel.xz;
  return wp;
}

void main() {
  vLocal = position / max(uBodyScale, 0.001);
  vec4 wp = modelMatrix * vec4(uEldritch > 0.0 ? writhe(position, normal) : position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  vWorld = wp.xyz;
  wp.xyz = displace(wp.xyz);

  vec4 vp = viewMatrix * wp;
  vec4 clip = projectionMatrix * vp;
  if (uSnap > 0.0 && clip.w > 0.0) {
    vec2 grid = uRes * 0.5 / uSnap;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  gl_Position = clip;

  vec2 uv0 = uv * uUvScale + uUvScroll * uTime;
  vUv = uv0;
  vUvw = vec3(uv0 * clip.w, clip.w);

  vec3 light = uAmbient + uLightColor * max(dot(wn, uLightDir), 0.0);
  vec3 toGlow = uGlowPos - wp.xyz;
  float gd = length(toGlow);
  float fall = clamp(1.0 - gd / uGlowRange, 0.0, 1.0);
  light += uGlowColor * fall * fall * (0.35 + 0.65 * max(dot(wn, toGlow / max(gd, 0.001)), 0.0));
  vec3 tint = vec3(1.0);
#ifdef USE_COLOR
  tint = color;
#endif
  vTint = tint;
  vLight = mix(light, vec3(1.0), uEmissive) * tint;
  vNormal = wn;
  vSplat = aSplat;
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
}
`;

export const WORLD_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uMap2;
uniform float uAffine;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uCharacter;
uniform float uCharacterLight;
uniform float uLanternFacing;
uniform float uEmissive;
uniform float uVary; // world-space tone variation (0: none)
uniform float uBomb; // 1: a second, turned sample blends in by a noise mask, so organic ground never repeats
uniform float uHasMap2; // 1: uMap2 blends in by vSplat (roads)

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying vec3 vTint;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFog;
varying float vSplat;
${LANTERN_GLSL}
${NOISE_GLSL}
${ELDRITCH_FRAG}
vec3 sampleMap(sampler2D map, vec2 uv) {
  vec3 t = texture(map, uv).rgb;
  if (uBomb > 0.5) {
    vec2 uv2 = mat2(0.0, 1.0, -1.0, 0.0) * uv * 0.83 + vec2(0.37, 0.71);
    float m = smoothstep(0.38, 0.62, vnoise(vWorld.xz * 0.09 + 11.0));
    t = mix(t, texture(map, uv2).rgb, m);
  }
  return t;
}

void main() {
  // WebGL2 has no noperspective: uv·w / w interpolates affinely, like the PS1.
  vec2 uv = mix(vUv, vUvw.xy / vUvw.z, uAffine);
  vec3 tex = sampleMap(uMap, uv);
  if (uHasMap2 > 0.5 && vSplat > 0.01) {
    float edge = vSplat + 0.35 * (vnoise(vWorld.xz * 0.9) - 0.5);
    tex = mix(tex, texture(uMap2, uv).rgb, smoothstep(0.35, 0.65, edge));
  }
  if (uVary > 0.0) {
    float n = 0.6 * vnoise(vWorld.xz * 0.045) + 0.4 * vnoise(vWorld.xz * 0.23 + 5.0);
    tex *= 1.0 + uVary * (n - 0.5) * 0.8;
  }
  // The lantern, per pixel: a smooth pool, brightest at the investigator. Characters take a fixed
  // share of it (no N·L, like sprites), so their values hold as they turn.
  vec3 toLamp = uLanternPos - vWorld;
  float ld = length(toLamp);
  float facing = mix(1.0, max(dot(normalize(vNormal), toLamp / max(ld, 0.001)), 0.0), uLanternFacing);
  vec3 lamp = uLanternColor * lanternFalloff(ld) * mix(facing, uCharacterLight, min(uCharacter, 1.0)) * (1.0 - uEmissive) * vTint;
  vec3 col = eldritch(tex * (vLight + lamp));
  gl_FragColor = vec4(mix(col, uFogColor, vFog * uFogAmount), 1.0);
}
`;
