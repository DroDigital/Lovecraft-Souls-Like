/**
 * The single fullscreen post pass (spec §2): sanity warp (UV ripple + chromatic split),
 * the realm's gradient-map grade (round 32) with colour isolation, palette quantisation with 4×4 Bayer dithering, and a red
 * vignette on the side a blow came from, near death (round 23) a dark red edge that swells with the
 * heart and a colour that drains, and (round 22) a failing mind's soft focus at the edges of sight. It renders at the low-res size; the browser upscales the canvas nearest-neighbour. Scene alpha below 0.5 marks a hue outside the palette (the Colour Out of
 * Space), which is neither graded nor quantised. Round 16: volumetric fog (fog.ts) lies between the lens
 * and the scene, marched against the scene's depth.
 */

import { FOG_GLSL } from './fog';

export const POST_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const POST_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime;
uniform float uRipple;
uniform float uChroma;
uniform float uIsolate;
uniform float uDesat;
uniform float uAnomalyProximity;
uniform float uAnomalyStress;
uniform float uHueWidth;
uniform float uMinSat;
uniform vec3 uInk; // the realm's grade (data/looks.ts): four colours, each normalised to its own brightness, that the picture's darks, shadows, middle and lights are pushed toward
uniform vec3 uShade;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec4 uHurt; // the investigator's recent wound: x strength, yz the screen direction it came from
uniform vec2 uFaint; // near death: x how red the edge of the picture is, y how much of its colour the picture has lost
uniform float uStone; // a petrifying gaze (round 25): 0..1 to stone, which the colour drains to, the edges close in grey, and past half the picture cracks
uniform float uBlur; // low-res pixels the edges blur by
uniform vec3 uAnomalyHues;
uniform float uQuantize;
uniform float uDither;
uniform float uGamma; // 1 / the brightness setting: below 1 lifts the dark
uniform vec3 uPalette[PALETTE_SIZE];
${FOG_GLSL}

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 rgb2hsv(vec3 c) {
  vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, k.wz), vec4(c.gb, k.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}

float hueNear(float h, float target) {
  float d = abs(h - target);
  d = min(d, 1.0 - d);
  return 1.0 - smoothstep(uHueWidth * 0.5, uHueWidth, d);
}

// The realm's grade at brightness l (render/realmPalette.ts mirrors it): a gradient map over four stops.
vec3 gradeTint(float l) {
  vec3 t = mix(uInk, uShade, smoothstep(0.0, 0.08, l));
  t = mix(t, uMid, smoothstep(0.08, 0.35, l));
  return mix(t, uHigh, smoothstep(0.35, 0.8, l));
}

// 1. Grade and colour isolation (round 32: each realm's own gradient map, not the one cold-to-warm
// split of all of them) everywhere except anomaly hues, which anomalyProximity boosts.
vec3 isolate(vec3 c) {
  vec3 hsv = rgb2hsv(c);
  float near = max(max(hueNear(hsv.x, uAnomalyHues.x), hueNear(hsv.x, uAnomalyHues.y)),
                   hueNear(hsv.x, uAnomalyHues.z));
  float mask = near * smoothstep(uMinSat, uMinSat + 0.15, hsv.y) * smoothstep(0.03, 0.1, hsv.z);
  float l = dot(c, LUMA);
  vec3 graded = mix(c, l * gradeTint(l), uDesat);
  float boost = clamp(uAnomalyProximity + uAnomalyStress, 0.0, 1.0);
  vec3 vivid = clamp(mix(vec3(l), c, 1.0 + boost) * (1.0 + 0.6 * boost), 0.0, 1.0);
  return mix(graded, vivid, mask);
}

// 2. A wound: the screen's edge darkens toward red, most on the side the blow came from.
vec3 hurt(vec3 col, vec2 uv) {
  if (uHurt.x <= 0.0) return col;
  vec2 c = uv - 0.5;
  float edge = smoothstep(0.25, 0.75, length(c * vec2(1.0, 0.8)) * 1.35);
  float side = 0.55 + 0.45 * max(0.0, dot(normalize(c + 1e-4), uHurt.yz));
  float k = clamp(uHurt.x * edge * side, 0.0, 0.85);
  return mix(col, vec3(0.28, 0.02, 0.03) * (0.5 + dot(col, LUMA)), k);
}

// 2a. Near death (round 23): the edge of the picture stays a dark red that swells with the heart, and the colour drains.
vec3 faint(vec3 col, vec2 uv) {
  if (uFaint.x <= 0.0 && uFaint.y <= 0.0) return col;
  float l = dot(col, LUMA);
  col = mix(col, vec3(l), uFaint.y);
  float edge = smoothstep(0.18, 0.8, length((uv - 0.5) * vec2(1.0, 0.8)) * 1.35);
  return mix(col, vec3(0.3, 0.02, 0.03) * (0.4 + l), clamp(uFaint.x * edge, 0.0, 0.75));
}

// 2a'. Turning to stone (round 25: the gaze was a bar and then death): the colour drains to the grey of stone, the
// edges close in pale, and past half the picture cracks, so it is a rule the eye learns and not a surprise.
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 stone(vec3 col, vec2 uv) {
  if (uStone <= 0.0) return col;
  float l = dot(col, LUMA);
  vec3 grey = vec3(0.56, 0.55, 0.52) * (0.35 + 0.9 * l);
  col = mix(col, grey, clamp(uStone * 1.15, 0.0, 1.0));
  vec2 c = (uv - 0.5) * vec2(1.0, 0.8);
  float edge = smoothstep(0.85 - 0.7 * uStone, 1.05 - 0.45 * uStone, length(c) * 1.6);
  col = mix(col, vec3(0.62, 0.61, 0.58) * (0.5 + l), clamp(edge * uStone, 0.0, 0.8));
  vec2 w = uv * vec2(9.0, 6.0) + 3.1;
  w += 0.45 * vec2(vnoise(w * 2.3), vnoise(w * 2.3 + 7.7)); // bent, so the lines fork and kink instead of looping
  float ridge = 1.0 - abs(vnoise(w) * 2.0 - 1.0); // a line wandering across the picture...
  float fine = 1.0 - abs(vnoise(vec2(w.y * 1.9 + 11.0, w.x * 2.1)) * 2.0 - 1.0); // ...and a finer one across it
  float crack = max(smoothstep(0.965, 0.992, ridge), 0.8 * smoothstep(0.972, 0.994, fine));
  crack *= smoothstep(0.45, 0.62, uStone) * (0.35 + 0.65 * smoothstep(0.1, 0.6, length(c)));
  return mix(col, vec3(0.04, 0.04, 0.05), clamp(crack, 0.0, 0.9));
}

// 2b. A failing mind (round 22): the edges of sight lose their focus (never the middle of the picture).
float edgeOf(vec2 uv) {
  return smoothstep(0.28, 0.78, length((uv - 0.5) * vec2(1.0, 0.82)) * 1.45);
}

// 3. Palette quantisation with 4x4 Bayer dithering.
float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
                                3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0 - 0.5;
}

vec3 quantize(vec3 c, vec2 cell) {
  c += bayer4(cell) * uDither;
  vec3 best = uPalette[0];
  float bestD = 1e9;
  for (int i = 0; i < PALETTE_SIZE; i++) {
    vec3 d = c - uPalette[i];
    float dist = dot(d * d, vec3(0.3, 0.5, 0.2));
    if (i >= ANOMALY_FROM && i < ANOMALY_TO) dist += 0.006; // an anomaly's colour is matched only by a pixel nearly its own (a warm pool on cold snow once snapped to green and pink)
    if (dist < bestD) {
      bestD = dist;
      best = uPalette[i];
    }
  }
  return best;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 uv = (cell + 0.5) / uRes;

  // 4. Sanity warp: UV ripple and chromatic split, scaled by (1 - sanity/100).
  vec2 c = uv - 0.5;
  float r = length(c);
  uv += uRipple * vec2(sin(uv.y * 29.0 + uTime * 2.3), sin(uv.x * 21.0 - uTime * 1.7));
  uv += uRipple * 0.7 * (c / max(r, 1e-4)) * sin(r * 38.0 - uTime * 3.1);
  vec2 split = uChroma * (0.4 + r) * vec2(cos(uTime * 0.7), sin(uTime * 0.9));

  vec4 centre = texture(tScene, uv);
  if (centre.a < 0.5) {
    gl_FragColor = vec4(pow(centre.rgb, vec3(uGamma)), 1.0); // outside the palette: no grade, no quantising
    return;
  }
  vec3 a = texture(tScene, uv + split).rgb;
  vec3 b = centre.rgb;
  vec3 e = texture(tScene, uv - split).rgb;
  float soft = uBlur * edgeOf(uv); // the edges of sight lose their focus
  if (soft > 0.05) {
    vec2 o = vec2(soft) / uRes;
    vec3 s = 0.25 * (texture(tScene, uv + vec2(o.x, 0.0)).rgb + texture(tScene, uv - vec2(o.x, 0.0)).rgb + texture(tScene, uv + vec2(0.0, o.y)).rgb + texture(tScene, uv - vec2(0.0, o.y)).rgb);
    float k = min(1.0, soft);
    b = mix(b, s, k * 0.7);
    a = mix(a, b, k);
    e = mix(e, b, k);
  }
  if (uIsolate > 0.5) {
    a = isolate(a);
    b = isolate(b);
    e = isolate(e);
  }
  vec4 fog = fogAlong(uv, bayer4(cell) + 0.5); // the mist between the lens and the scene (round 16)
  vec3 col = pow(stone(faint(hurt(vec3(a.r, b.g, e.b) * fog.a + fog.rgb, uv), uv), uv), vec3(uGamma));
  if (uQuantize > 0.5) col = quantize(col, cell);
  gl_FragColor = vec4(col, 1.0);
}
`;
