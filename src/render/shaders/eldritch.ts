/**
 * How far a body refuses to hold its shape (render only): `uEldritch`, 0 for an ordinary creature
 * up to 1 for an outer god (see render/eldritch.ts). Colossi (world shader): the skin writhes in slow
 * travelling waves, an oily sheen of the anomaly hues crawls over it, patches of it open onto a
 * starry void from the great old ones up, and an outer god's body will not stay where it is, bands
 * of it sliding aside and snapping back. An echo of a body (`uGhost`) is dithered away in part.
 * Sprites: rows slip sideways now and then, the darkest pixels open onto the void, and a faint
 * double lags beside the body.
 */

export const ELDRITCH_VERT = /* glsl */ `
uniform float uEldritch;
uniform float uBodyScale; // metres: the body's height, which the effect is measured in
varying vec3 vLocal;

vec3 writhe(vec3 p, vec3 n) {
  vec3 l = p / max(uBodyScale, 0.001);
  float wave = 0.6 * sin(l.y * 9.0 - uTime * 1.7 + 2.0 * sin(l.x * 7.0 + uTime * 0.6)) + 0.4 * sin(l.x * 11.0 + l.z * 8.0 + uTime * 1.1);
  p += n * wave * 0.03 * uEldritch * uBodyScale;
  float wrong = max(uEldritch - 0.6, 0.0) * 2.5;
  if (wrong > 0.0) {
    float band = floor(l.y * 6.0 + 0.5 * sin(uTime * 0.37));
    float beat = floor(uTime * 1.3 + band * 0.37);
    float on = step(0.7, fract(sin(band * 12.9898 + beat * 78.233) * 43758.5453));
    p.x += on * wrong * 0.07 * uBodyScale * sin(band * 3.1 + uTime * 4.0);
    p.z += on * wrong * 0.05 * uBodyScale * cos(band * 2.3 + uTime * 3.0);
  }
  return p;
}
`;

/** The void seen through a body: near-black with a slow bruise of colour and twinkling stars, fixed to the screen. */
export const VOID_GLSL = /* glsl */ `
vec3 voidAt(vec2 frag, float t) {
  vec2 sp = floor(frag / 2.0);
  float star = step(0.975, hash12(sp)) * (0.5 + 0.5 * sin(t * 2.0 + hash12(sp + 3.1) * 40.0));
  return mix(vec3(0.015, 0.0, 0.03), vec3(0.09, 0.0, 0.13), vnoise(sp * 0.05 + t * 0.05)) + star * vec3(0.95, 0.9, 1.0);
}
`;

export const ELDRITCH_FRAG = /* glsl */ `
uniform float uTime;
uniform float uEldritch;
uniform float uGhost;
varying vec3 vLocal;
${VOID_GLSL}
float ghostBayer(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}

vec3 eldritch(vec3 col) {
  if (uGhost > 0.0 && uGhost > ghostBayer(gl_FragCoord.xy)) discard;
  if (uEldritch <= 0.0) return col;
  float t = uTime;
  float s = sin(vLocal.y * 21.0 + vLocal.x * 13.0 - vLocal.z * 7.0 + t * 0.9);
  vec3 hue = 0.5 + 0.5 * cos(6.2832 * (s * 0.25 + t * 0.05 + vec3(0.0, 0.33, 0.67)));
  col += hue * smoothstep(0.55, 1.0, s) * 0.22 * uEldritch;
  float n = 0.6 * vnoise(vLocal.xy * 5.0 + vec2(t * 0.11, -t * 0.07)) + 0.4 * vnoise(vLocal.zy * 9.0 - t * 0.13);
  float edge = 0.8 - 0.25 * uEldritch;
  float hole = smoothstep(edge, edge + 0.05, n) * step(0.5, uEldritch);
  return mix(col, voidAt(gl_FragCoord.xy, t), hole);
}
`;
