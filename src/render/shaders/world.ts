/**
 * World material GLSL (spec §2): Gouraud vertex lighting (ambient, moon, glow, the player's
 * lantern), PS1 vertex snapping, affine texture wobble (uv·w passed through, divided per
 * fragment), fog fading to near-black, and sanity-driven non-Euclidean vertex displacement.
 * With uMarkCharacters on, alpha marks characters for the post pass's rim light (see post.ts); 1 elsewhere.
 */

/**
 * The player's lantern (world and sprite shaders): inverse-square decay inside its reach, and an
 * edge band (hard × range to range) whose distance wanders with the angle around the lantern.
 */
export const LANTERN_GLSL = /* glsl */ `
uniform vec3 uLanternPos;
uniform vec3 uLanternColor;
uniform float uLanternRange;
uniform float uLanternHard;
uniform float uLanternDecay;
uniform float uLanternRagged;

float lanternDecay(float d) {
  return 1.0 / (1.0 + uLanternDecay * d * d);
}

// Where a point sits in the edge band: <= 0 fully in the light, >= 1 beyond it.
float lanternEdge(vec3 toLamp) {
  vec2 h = toLamp.xz;
  float a = dot(h, h) > 1e-6 ? atan(h.y, h.x) : 0.0;
  float wander = 0.5 * sin(3.0 * a + 1.7) + 0.3 * sin(7.0 * a + 0.4) + 0.2 * sin(11.0 * a + 2.9);
  float d = length(toLamp) * (1.0 + uLanternRagged * wander);
  return (d - uLanternRange * uLanternHard) / (uLanternRange * (1.0 - uLanternHard));
}

// Smooth reach, for surfaces that do not dither the edge (sprites).
float lanternAt(vec3 toLamp) {
  return lanternDecay(length(toLamp)) * (1.0 - smoothstep(0.0, 1.0, lanternEdge(toLamp)));
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
uniform float uLanternFacing;
uniform float uCharacter;
uniform float uCharacterLight;
uniform float uRimNear;
uniform float uRimFar;
uniform float uFogNear;
uniform float uFogFar;
uniform float uEmissive;
uniform vec2 uUvScale;
uniform vec2 uUvScroll;

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying vec3 vLamp;
varying float vLampEdge;
varying float vFog;
varying float vRim;
${LANTERN_GLSL}
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
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * normal);
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
  vLight = mix(light, vec3(1.0), uEmissive) * tint;
  // The lantern goes separately: the fragment shader dithers its edge band. Characters take a fixed
  // share of it (no N·L, like sprites), so their values hold as they turn.
  vec3 toLamp = uLanternPos - wp.xyz;
  float ld = length(toLamp);
  float facing = mix(1.0, max(dot(wn, toLamp / max(ld, 0.001)), 0.0), uLanternFacing);
  vLamp = uLanternColor * lanternDecay(ld) * mix(facing, uCharacterLight, min(uCharacter, 1.0)) * (1.0 - uEmissive) * tint;
  vLampEdge = lanternEdge(toLamp);
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  vRim = 1.0 - smoothstep(uRimNear, uRimFar, -vp.z);
}
`;

export const WORLD_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uAffine;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uCharacter;
uniform float uMarkCharacters;

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying vec3 vLamp;
varying float vLampEdge;
varying float vFog;
varying float vRim;

float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}

void main() {
  // WebGL2 has no noperspective: uv·w / w interpolates affinely, like the PS1.
  vec2 uv = mix(vUv, vUvw.xy / vUvw.z, uAffine);
  // Across the lantern's edge band each pixel is either lit or dark, thinning out in an ordered dither.
  float lamp = step(bayer4(gl_FragCoord.xy), 1.0 - smoothstep(0.0, 1.0, vLampEdge));
  vec3 col = texture(uMap, uv).rgb * (vLight + vLamp * lamp);
  float fog = vFog * uFogAmount;
  float mark = (uCharacter > 1.5 ? 0.5 : 0.0) + 0.25 * (1.0 - vRim);
  gl_FragColor = vec4(mix(col, uFogColor, fog), uCharacter * uMarkCharacters > 0.5 ? mark : 1.0);
}
`;
