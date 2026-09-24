/**
 * The single fullscreen post pass (spec §2): sanity warp (UV ripple + chromatic split),
 * split-tone grade with colour isolation, the characters' 1-px rim light, palette quantisation
 * with 4×4 Bayer dithering. It renders at the low-res size; the browser upscales the canvas
 * nearest-neighbour. Scene alpha marks characters: creatures 0..0.25, the player 0.5..0.75 (rising
 * as their rim fades out with distance), a hue outside the palette (the Colour Out of Space) ~0.31,
 * which is neither graded nor quantised, everything else 1.
 */

export const POST_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const POST_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime;
uniform float uCrush;
uniform float uRipple;
uniform float uChroma;
uniform float uIsolate;
uniform float uDesat;
uniform float uAnomalyProximity;
uniform float uAnomalyStress;
uniform float uHueWidth;
uniform float uMinSat;
uniform vec3 uCold;
uniform vec3 uWarm;
uniform vec2 uSplit;
uniform vec3 uRimColor;
uniform vec2 uRimAmount; // player, creatures
uniform vec2 uRimBackdrop;
uniform vec3 uAnomalyHues;
uniform float uQuantize;
uniform float uDither;
uniform vec3 uPalette[PALETTE_SIZE];

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

// 1. Grade and colour isolation: split toning (cold grey-green shadows and fog, warm bone/sepia
// lights) everywhere except anomaly hues, which anomalyProximity boosts.
vec3 isolate(vec3 c) {
  vec3 hsv = rgb2hsv(c);
  float near = max(max(hueNear(hsv.x, uAnomalyHues.x), hueNear(hsv.x, uAnomalyHues.y)),
                   hueNear(hsv.x, uAnomalyHues.z));
  float mask = near * smoothstep(uMinSat, uMinSat + 0.15, hsv.y) * smoothstep(0.03, 0.1, hsv.z);
  float l = dot(c, LUMA);
  vec3 graded = mix(c, l * mix(uCold, uWarm, smoothstep(uSplit.x, uSplit.y, l)), uDesat);
  float boost = clamp(uAnomalyProximity + uAnomalyStress, 0.0, 1.0);
  vec3 vivid = clamp(mix(vec3(l), c, 1.0 + boost) * (1.0 + 0.6 * boost), 0.0, 1.0);
  return mix(graded, vivid, mask);
}

// 0 = world, 1 = creature, 2 = the player, 3 = outside the palette.
float kindOf(float a) {
  return a > 0.875 ? 0.0 : a > 0.375 ? 2.0 : a > 0.28 ? 3.0 : 1.0;
}

// 2. Rim light: a character pixel whose left, right or upper neighbour is backdrop or the other kind
// of character, and not clearly brighter, gets a pale edge (creatures a stronger one). It fades out
// with distance, so far creatures read as silhouettes and eye glints.
vec3 rim(vec3 col, vec4 centre, vec2 uv, vec2 px) {
  float kind = kindOf(centre.a);
  if (kind == 0.0 || kind == 3.0) return col;
  float l = dot(centre.rgb, LUMA);
  float edge = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 n = texture(tScene, uv + (i == 0 ? vec2(-px.x, 0.0) : i == 1 ? vec2(px.x, 0.0) : vec2(0.0, px.y)));
    if (kindOf(n.a) != kind) edge = max(edge, 1.0 - smoothstep(uRimBackdrop.x, uRimBackdrop.y, dot(n.rgb, LUMA) - l));
  }
  float near = 1.0 - 4.0 * (kind == 2.0 ? centre.a - 0.5 : centre.a);
  return mix(col, uRimColor, (kind == 2.0 ? uRimAmount.x : uRimAmount.y) * near * edge);
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
    if (dist < bestD) {
      bestD = dist;
      best = uPalette[i];
    }
  }
  return best;
}

void main() {
  float size = 1.0 + uCrush;
  vec2 cell = floor(gl_FragCoord.xy / size);
  vec2 uv = (cell + 0.5) * size / uRes;

  // 4. Sanity warp: UV ripple and chromatic split, scaled by (1 - sanity/100).
  vec2 c = uv - 0.5;
  float r = length(c);
  uv += uRipple * vec2(sin(uv.y * 29.0 + uTime * 2.3), sin(uv.x * 21.0 - uTime * 1.7));
  uv += uRipple * 0.7 * (c / max(r, 1e-4)) * sin(r * 38.0 - uTime * 3.1);
  vec2 split = uChroma * (0.4 + r) * vec2(cos(uTime * 0.7), sin(uTime * 0.9));

  vec4 centre = texture(tScene, uv);
  if (kindOf(centre.a) == 3.0) {
    gl_FragColor = vec4(centre.rgb, 1.0); // outside the palette: no grade, no quantising
    return;
  }
  vec3 a = texture(tScene, uv + split).rgb;
  vec3 b = centre.rgb;
  vec3 e = texture(tScene, uv - split).rgb;
  if (uIsolate > 0.5) {
    a = isolate(a);
    b = isolate(b);
    e = isolate(e);
  }
  vec3 col = rim(vec3(a.r, b.g, e.b), centre, uv, size / uRes);
  if (uQuantize > 0.5) col = quantize(col, cell);
  gl_FragColor = vec4(col, 1.0);
}
`;
