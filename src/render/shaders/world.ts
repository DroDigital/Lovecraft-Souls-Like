/**
 * World material GLSL (spec §2): Gouraud vertex lighting (ambient, moon, glow), the player's lantern
 * and the world's nearest lamps per pixel with a smooth falloff, PS1 vertex snapping, affine texture wobble (uv·w passed through,
 * divided per fragment, held within a few texels of the true mapping), world-space texture variation (so no ground repeats), fog fading to
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

/**
 * The world's lamps (playtest round 5, render/worldLights.ts): the nearest street lamps, fires,
 * torches and lit windows as point lights, each windowed to nothing at its range like the lantern.
 * `facing` weighs N·L (0 for characters and sprites, which take the light whole).
 */
export const LAMP_SLOTS = 12;
export const LAMPS_GLSL = /* glsl */ `
uniform vec4 uLamps[${LAMP_SLOTS}]; // position, range (0: dark)
uniform vec3 uLampColors[${LAMP_SLOTS}]; // colour × strength
vec3 lampLight(vec3 p, vec3 n, float facing) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${LAMP_SLOTS}; i++) {
    vec4 l = uLamps[i];
    if (l.w <= 0.0) continue;
    vec3 to = l.xyz - p;
    float d = length(to);
    float x = clamp(d / l.w, 0.0, 1.0);
    float x2 = x * x;
    float win = 1.0 - x2 * x2;
    float face = mix(1.0, max(dot(n, to / max(d, 0.001)), 0.0), facing);
    sum += uLampColors[i] * win * win / (1.0 + uLanternDecay * d * d) * face; // the lantern's own falloff
  }
  return sum;
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

/**
 * Where a world point is drawn (world materials and the Elder Signs' glow): the sanity-driven
 * non-Euclidean displacement, and PS1 vertex snapping of clip positions to the low-res pixel grid.
 */
export const SPACE_GLSL = /* glsl */ `
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

vec4 snap(vec4 clip) {
  if (uSnap > 0.0 && clip.w > 0.0) {
    vec2 grid = uRes * 0.5 / uSnap;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  return clip;
}
`;

export const WORLD_VERT = /* glsl */ `
${SPACE_GLSL}
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

void main() {
  vLocal = position / max(uBodyScale, 0.001);
  vec4 wp = modelMatrix * vec4(uEldritch > 0.0 ? writhe(position, normal) : position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  vWorld = wp.xyz;
  wp.xyz = displace(wp.xyz);

  vec4 vp = viewMatrix * wp;
  vec4 clip = snap(projectionMatrix * vp);
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
uniform float uLanternSelf; // the investigator's share of their own lantern
uniform float uSelfMax; // the brightest anything lights the investigator
uniform float uLanternFacing;
uniform vec3 uRimColor; // characters' edge light
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
${LAMPS_GLSL}
${NOISE_GLSL}
${ELDRITCH_FRAG}
// Mip levels come from the true mapping's gradients (gx, gy), so none jumps along a face's diagonal.
vec3 sampleMap(sampler2D map, vec2 uv, vec2 gx, vec2 gy) {
  vec3 t = textureGrad(map, uv, gx, gy).rgb;
  if (uBomb > 0.5) {
    mat2 turn = mat2(0.0, 1.0, -1.0, 0.0) * 0.83;
    vec2 uv2 = turn * uv + vec2(0.37, 0.71);
    float m = smoothstep(0.38, 0.62, vnoise(vWorld.xz * 0.09 + 11.0));
    t = mix(t, textureGrad(map, uv2, turn * gx, turn * gy).rgb, m);
  }
  return t;
}

// The PS1's affine mapping (WebGL2 has no noperspective: uv·w / w interpolates affinely), held
// within uAffine texels of the true mapping: far faces keep their wobble, but a large face up close
// only shivers instead of shearing and swelling as the view turns.
vec2 affineUv(vec2 texels) {
  vec2 off = (vUvw.xy / vUvw.z - vUv) * texels;
  float len = length(off);
  return vUv + off * (min(len, uAffine) / max(len, 1e-4)) / texels;
}

void main() {
  vec2 uv = affineUv(vec2(textureSize(uMap, 0)));
  vec2 gx = dFdx(vUv);
  vec2 gy = dFdy(vUv);
  vec3 tex = sampleMap(uMap, uv, gx, gy);
  if (uHasMap2 > 0.5 && vSplat > 0.01) {
    float edge = vSplat + 0.35 * (vnoise(vWorld.xz * 0.9) - 0.5);
    tex = mix(tex, textureGrad(uMap2, uv, gx, gy).rgb, smoothstep(0.35, 0.65, edge));
  }
  if (uVary > 0.0) {
    float n = 0.6 * vnoise(vWorld.xz * 0.045) + 0.4 * vnoise(vWorld.xz * 0.23 + 5.0);
    tex *= 1.0 + uVary * (n - 0.5) * 0.8;
  }
  // The lantern, per pixel: a smooth pool, brightest at the investigator. Characters take a fixed
  // share of it (no N·L, like sprites), so their values hold as they turn; the investigator takes less
  // of their own, which hangs at their hip, and whatever lights them is held below uSelfMax, so their
  // face never outshines the flame they carry (its own light is emissive, so never held).
  vec3 toLamp = uLanternPos - vWorld;
  float ld = length(toLamp);
  vec3 n = normalize(vNormal);
  float facing = mix(1.0, max(dot(n, toLamp / max(ld, 0.001)), 0.0), uLanternFacing);
  float self = uCharacter > 1.5 ? 1.0 : 0.0;
  float share = uCharacterLight * mix(1.0, uLanternSelf, self);
  float character = min(uCharacter, 1.0);
  vec3 lamp = uLanternColor * lanternFalloff(ld) * mix(facing, share, character);
  lamp += lampLight(vWorld, n, uLanternFacing * (1.0 - character)) * mix(1.0, uCharacterLight, character); // the world's lamps, fires and windows
  lamp *= (1.0 - uEmissive) * vTint;
  vec3 lit = vLight + lamp;
  if (character > 0.0) { // form (playtest round 7): a soft light from above, and a cold rim where the body turns from the eye
    float edge = 1.0 - max(dot(n, normalize(cameraPosition - vWorld)), 0.0);
    lit = lit * (0.82 + 0.36 * clamp(0.5 + 0.5 * n.y, 0.0, 1.0)) + uRimColor * edge * edge * (1.0 - uEmissive) * vTint;
  }
  float peak = max(max(lit.r, lit.g), max(lit.b, 0.001));
  lit *= mix(1.0, min(1.0, uSelfMax / peak), self * max(1.0 - uEmissive, 0.0));
  tex = mix(tex, vec3(1.0), 0.6 * uEmissive); // a lit thing shines through its texture
  vec3 col = eldritch(tex * lit);
  gl_FragColor = vec4(mix(col, uFogColor, vFog * uFogAmount), 1.0);
}
`;
