/**
 * Volumetric fog (playtest round 16), a chunk of the post pass: each pixel's ray is marched from the
 * lens to what it struck (the scene's depth) or FOG.far metres, through a low mist that pools about the
 * investigator's ground and clears above it, gathered in drifts of slow noise carried by the wind, and
 * a thin haze that reaches the lamps' height. Round 23: the mist is grey, with a hint of its realm,
 * brighter in the moon's quarter of the sky (as the sky's own haze is), and low, so the sky and the
 * upper parts of things keep their dark; the picture was washed all over in an olive haze before. The
 * world's own lights, the lantern and the nearest lamps, glow in it, each in closed form along the
 * whole ray (a few samples would miss a lamp's halo). The march's start is jittered by the picture's
 * own ordered dither, which hides the steps.
 */

import { LAMP_SLOTS } from './world';

export const FOG_GLSL = /* glsl */ `
uniform sampler2D tDepth;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec4 uFog; // the low mist: density per metre at the ground (0: none), metres it thins over, the ground's height, patchiness
uniform vec4 uFogAir; // the thin haze: density per metre, metres it thins over; how much brighter the mist is in the moon's quarter (0..1)
uniform vec3 uFogColor; // the mist's own tint
uniform vec3 uMoonDir; // toward the moon
uniform vec3 uFogDrift; // how far the wind has carried it (x, z metres), and time
uniform float uFogFar; // metres the march reaches
uniform vec2 uFogStart; // metres from the lens where the mist begins to gather, and where it is whole: the ground about the investigator stays crisp
uniform float uFogLantern; // how strongly the investigator's own lantern shines in it (the lamps' is uFogGlow)
uniform float uFogGlow; // how strongly the lights shine in it
uniform vec3 uLanternPos;
uniform vec3 uLanternColor;
uniform float uLanternRange;
uniform float uLanternDecay;
uniform vec4 uLamps[${LAMP_SLOTS}];
uniform vec3 uLampColors[${LAMP_SLOTS}];

float fogHash(vec3 i) {
  i = mod(i, 289.0);
  return fract(sin(dot(i, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

float fogNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(fogHash(i), fogHash(i + vec3(1.0, 0.0, 0.0)), f.x);
  float b = mix(fogHash(i + vec3(0.0, 1.0, 0.0)), fogHash(i + vec3(1.0, 1.0, 0.0)), f.x);
  float c = mix(fogHash(i + vec3(0.0, 0.0, 1.0)), fogHash(i + vec3(1.0, 0.0, 1.0)), f.x);
  float d = mix(fogHash(i + vec3(0.0, 1.0, 1.0)), fogHash(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}

float fogDensity(vec3 p) {
  float up = max(p.y - uFog.z, 0.0);
  float low = uFog.x * exp(-up / uFog.y);
  if (low > 1e-4) {
    vec3 q = (p - vec3(uFogDrift.x, 0.0, uFogDrift.y)) * 0.085 + vec3(0.0, uFogDrift.z * 0.015, 0.0);
    float n = fogNoise(q) * 0.62 + fogNoise(q * 2.6 + 7.3) * 0.38;
    low *= mix(1.0, smoothstep(0.28, 0.78, n) * 1.8, uFog.w);
  }
  return low + uFogAir.x * exp(-up / uFogAir.y);
}

// The mist's own light toward a direction: its tint, and more of it in the moon's quarter, less in the far one.
vec3 fogTint(vec3 dir) {
  float side = 0.5 + 0.5 * dot(normalize(dir.xz + vec2(1e-4)), normalize(uMoonDir.xz + vec2(1e-4)));
  return uFogColor * mix(1.0, 0.75 + 0.65 * side * side, uFogAir.z);
}

// The glow a light at c (colour col, reach range) casts into the mist along the ray o + d·t, t in
// [0, len], in closed form: the integral of 1 / (1 + k·r²) along the line, windowed to its reach,
// weighed by the mist's thickness at the ray's nearest point and dimmed by the mist before it.
vec3 glowAlong(vec3 o, vec3 d, float len, vec3 c, vec3 col, float range, float k) {
  vec3 oc = c - o;
  float t0 = dot(oc, d);
  float h2 = max(dot(oc, oc) - t0 * t0, 0.0);
  if (h2 >= range * range) return vec3(0.0);
  float s0 = max(-t0, -range);
  float s1 = min(len - t0, range);
  if (s1 <= s0) return vec3(0.0);
  float a = 1.0 + k * h2;
  float q = sqrt(k / a);
  float along = (atan(s1 * q) - atan(s0 * q)) / sqrt(k * a);
  vec3 near = o + d * clamp(t0, 0.0, len);
  float up = max(near.y - uFog.z, 0.0);
  float thick = uFog.x * exp(-up / uFog.y) + uFogAir.x * exp(-up / uFogAir.y);
  return col * along * thick * (1.0 - h2 / (range * range)) * exp(-(uFogAir.x + uFog.x * 0.2) * 0.6 * clamp(t0, 0.0, len));
}

// rgb: the light the mist adds along the ray; a: the share of what lies behind that shows through.
vec4 fogAlong(vec2 uv, float jitter) {
  if (uFog.x <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  vec4 view = uProjInv * vec4(uv * 2.0 - 1.0, texture(tDepth, uv).x * 2.0 - 1.0, 1.0);
  vec3 ray = (uCamWorld * vec4(view.xyz / view.w, 1.0)).xyz - uCamPos;
  float len = length(ray);
  vec3 dir = ray / max(len, 1e-4);
  float reach = min(len, uFogFar);
  float stepLen = reach / float(FOG_STEPS);
  float t = stepLen * jitter;
  float through = 1.0;
  vec3 tint = fogTint(dir);
  vec3 light = vec3(0.0);
  for (int i = 0; i < FOG_STEPS; i++) {
    float s = fogDensity(uCamPos + dir * t) * smoothstep(uFogStart.x, uFogStart.y, t);
    if (s > 1e-4) {
      float keep = exp(-s * stepLen);
      light += through * (1.0 - keep) * tint; // the mist's own light
      through *= keep;
    }
    t += stepLen;
  }
  float k = uLanternDecay * 2.0;
  light += glowAlong(uCamPos, dir, len, uLanternPos, uLanternColor * uFogLantern, uLanternRange * 1.2, k);
  for (int i = 0; i < ${LAMP_SLOTS}; i++) {
    vec4 l = uLamps[i];
    if (l.w > 0.0) light += glowAlong(uCamPos, dir, len, l.xyz, uLampColors[i] * uFogGlow, l.w, k);
  }
  return vec4(light, through);
}
`;
