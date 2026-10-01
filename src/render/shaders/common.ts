/**
 * The pieces of GLSL the world, sprite, sea and sign shaders share (split from world.ts, round 34): the
 * player's lantern, the world's lamps, cheap value noise, and where a world point is drawn (the
 * sanity-driven displacement and the PS1's vertex snapping).
 */

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
  // Many lights at once (a corridor of torches, a hall's braziers) would add up past white and wash the walls to cream (round 31): the sum is eased toward a ceiling.
  float peak = max(max(sum.r, sum.g), sum.b);
  return sum / (1.0 + 0.55 * peak);
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
uniform float uLean;

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
  float h = max(0.0, wp.y - (uCamPos.y - 1.6)); // round 26: what stands tall leans in toward whoever is losing their mind, its top the most
  wp.xz -= normalize(rel.xz + vec2(1e-4)) * w * uLean * h * h;
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
