/**
 * The night sky (playtest round 4): drawn first, behind everything, on a sphere about the camera.
 * Round 32: the realm's own colours (data/looks.ts): its horizon, which the land's far edge melts
 * into, rising to its zenith, a moonlit glow along the horizon, strongest on the moon's side (so far
 * roofs, trees and hills stand against it as silhouettes), stars that twinkle, slow cloud, and the
 * moon itself with its maria and halo. Round 34: the Milky Way, a band of star-dust across it; over
 * the cold realms the aurora, curtains of pale light low in the north; and now and then a falling
 * star. The post pass grades and dithers it like everything else.
 */

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform float uTime;
uniform vec3 uFogColor; // what the land fades into: below the horizon, and under a roof
uniform vec3 uHorizon; // the sky at the horizon...
uniform vec3 uZenith; // ...and overhead
uniform vec3 uMoonColor;
uniform vec3 uMoonDir;
uniform float uMoon; // the moon's radius, radians (0: none)
uniform float uStars; // density
uniform float uClouds; // cover
uniform float uHaze; // the horizon's moonlit glow
uniform float uOpen; // 0 under a roof or in a dungeon: the fog's colour alone
uniform float uWrong; // 0..1: a failing mind's stars, which crawl, crowd and flicker
uniform float uFlash; // a lightning stroke's light on the sky (lightning.ts)
uniform float uMilky; // the Milky Way's strength
uniform float uAurora; // the aurora's
uniform float uMeteors; // the share of turns (eleven seconds each) that have a falling star

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(vec3(i, 1.0));
  float b = hash(vec3(i + vec2(1.0, 0.0), 1.0));
  float c = hash(vec3(i + vec2(0.0, 1.0), 1.0));
  float d = hash(vec3(i + vec2(1.0, 1.0), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return s;
}

// The Milky Way: a soft band across the sky, broken by lanes of dust.
float milkyWay(vec3 d) {
  float off = dot(d, normalize(vec3(0.35, 0.78, -0.52))); // across the plane of the band
  float dust = fbm(vec2(d.x * 5.0 + d.y * 2.0, d.z * 5.0 - d.y * 3.0) * 1.6);
  return exp(-off * off / 0.04) * (0.3 + 0.9 * smoothstep(0.3, 0.8, dust));
}

// The aurora: curtains of cold light hung low in the north, swaying, brighter toward their tops.
vec3 aurora(vec3 d, float t) {
  float az = atan(d.x, d.z);
  float band = smoothstep(0.04, 0.22, d.y) * (1.0 - smoothstep(0.42, 0.75, d.y)) * (0.5 + 0.5 * cos(az - 0.5));
  float rays = fbm(vec2(az * 7.0 + t * 0.05, t * 0.03));
  float sway = sin(az * 3.0 + t * 0.22 + 3.0 * fbm(vec2(az * 2.0, t * 0.07)));
  float curtain = smoothstep(0.4, 0.95, rays * 0.8 + 0.3 * sway + 0.25) * band;
  return mix(vec3(0.25, 0.78, 0.95), vec3(0.78, 0.9, 1.0), smoothstep(0.1, 0.55, d.y)) * curtain;
}

// A falling star: a bright head and a tail across the upper sky, once in a while (a turn of eleven seconds, a share of them).
float meteor(vec3 d, float t) {
  float id = floor(t / 11.0);
  float k = (t - id * 11.0) / 0.9; // 0..1 over the streak
  if (k > 1.0 || hash(vec3(id, 7.0, 3.0)) > 0.5 * uMeteors) return 0.0;
  vec3 s = normalize(vec3(hash(vec3(id, 1.0, 2.0)) * 2.0 - 1.0, 0.5 + 0.4 * hash(vec3(id, 2.0, 5.0)), hash(vec3(id, 3.0, 1.0)) * 2.0 - 1.0));
  vec3 v = normalize(vec3(hash(vec3(id, 4.0, 2.0)) - 0.5, -0.3, hash(vec3(id, 5.0, 4.0)) - 0.5));
  vec3 head = normalize(s + v * (0.4 * k));
  vec3 tail = normalize(s + v * (0.4 * max(k - 0.4, 0.0)));
  vec3 e = head - tail;
  float u = clamp(dot(d - tail, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
  float line = 1.0 - smoothstep(0.0008, 0.0035, length(d - (tail + e * u)));
  return line * mix(0.2, 1.0, u) * sin(3.14159 * k);
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 m = normalize(uMoonDir);
  float toward = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), normalize(m.xz + 1e-4)); // 1 on the moon's side
  float rise = max(h, 0.0);
  float glow = exp(-rise * 7.0) * (0.35 + 0.65 * toward * toward);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.85, rise), 0.7));
  col += uMoonColor * (0.16 * uHaze) * glow; // the moon's quarter shines low on the sky

  float lift = smoothstep(0.0, 0.18, h); // cloud and stars thin out toward the horizon
  vec2 cp = d.xz / (rise + 0.12) * 0.9 + vec2(uTime * 0.006, uTime * 0.0025);
  float cloud = smoothstep(0.42, 0.78, fbm(cp)) * uClouds * lift;

  float turn = uTime * 0.035 * uWrong; // the stars crawl about the sky, and are not where they were
  vec3 sd = vec3(d.x * cos(turn) - d.z * sin(turn), d.y, d.x * sin(turn) + d.z * cos(turn));
  vec3 cell = floor(sd * 230.0);
  float s = hash(cell);
  float star = step(1.0 - 0.006 * uStars * (1.0 + 2.2 * uWrong), s) * (0.35 + 0.65 * hash(cell + 3.1));
  float twinkle = 0.6 + 0.4 * sin(uTime * (1.3 + 2.5 * hash(cell + 7.7) + 4.0 * uWrong) + s * 60.0);
  vec3 starColor = mix(vec3(0.78, 0.8, 0.82), vec3(0.86, 0.7, 0.95), step(0.85, hash(cell + 9.3)) * uWrong); // and some are the wrong colour
  col += starColor * star * twinkle * lift * (1.0 - cloud);

  float a = acos(clamp(dot(d, m), -1.0, 1.0));
  float clear = lift * (1.0 - cloud) * smoothstep(0.0, 0.2, h);
  col += vec3(0.55, 0.6, 0.78) * milkyWay(d) * 0.14 * uMilky * clear * (1.0 - 0.8 * exp(-a * 2.5)); // the moon washes it out near itself
  col += aurora(d, uTime) * 0.42 * uAurora * clear;
  col += vec3(1.0, 0.97, 0.9) * meteor(d, uTime) * 0.95 * clear;
  if (uMoon > 0.0) {
    vec3 t1 = normalize(cross(m, vec3(0.0, 1.0, 0.0)));
    vec3 t2 = cross(t1, m);
    vec2 mp = vec2(dot(d, t1), dot(d, t2)) / uMoon;
    float maria = 0.8 + 0.2 * smoothstep(0.35, 0.7, vnoise(mp * 2.2 + 4.0));
    float disc = 1.0 - smoothstep(uMoon * 0.93, uMoon, a);
    vec3 moon = uMoonColor * maria * (1.0 - 0.22 * min(dot(mp, mp), 1.0));
    col = mix(col, moon, disc * (1.0 - 0.75 * cloud));
    col += uMoonColor * 0.16 * exp(-max(a - uMoon, 0.0) * 10.0) * (1.0 - disc); // the halo
  }
  vec3 cloudCol = mix(mix(uHorizon, uZenith, 0.4) * 0.9, uMoonColor * 0.4, exp(-a * 3.0) * step(0.001, uMoon)); // silvered near the moon
  col = mix(col, cloudCol, cloud * 0.85);
  col += vec3(0.8, 0.85, 1.0) * uFlash * (0.5 + 0.5 * exp(-rise * 3.0));
  if (h < 0.0) col = uFogColor;
  gl_FragColor = vec4(mix(uFogColor, col, uOpen), 1.0);
}
`;
