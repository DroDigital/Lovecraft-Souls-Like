/**
 * The night sky (playtest round 4): drawn first, behind everything, on a sphere about the camera.
 * The fog's colour at and below the horizon (so the land's far edge melts into it), a moonlit haze
 * rising off the horizon, strongest on the moon's side (so far roofs, trees and hills stand against
 * it as silhouettes), stars that twinkle, slow cloud, and the moon itself with its maria and halo.
 * The post pass grades and dithers it like everything else.
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
uniform vec3 uFogColor;
uniform vec3 uHazeColor;
uniform vec3 uMoonColor;
uniform vec3 uMoonDir;
uniform float uMoon; // the moon's radius, radians (0: none)
uniform float uStars; // density
uniform float uClouds; // cover
uniform float uHaze; // the horizon's moonlit glow
uniform float uOpen; // 0 under a roof or in a dungeon: the fog's colour alone

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

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 m = normalize(uMoonDir);
  float toward = 0.5 + 0.5 * dot(normalize(d.xz + 1e-4), normalize(m.xz + 1e-4)); // 1 on the moon's side
  float rise = max(h, 0.0);
  float glow = exp(-rise * 7.0) * (0.35 + 0.65 * toward * toward);
  vec3 col = mix(uFogColor * 0.45, uFogColor + uHazeColor * uHaze, glow);

  float lift = smoothstep(0.0, 0.18, h); // cloud and stars thin out toward the horizon
  vec2 cp = d.xz / (rise + 0.12) * 0.9 + vec2(uTime * 0.006, uTime * 0.0025);
  float cloud = smoothstep(0.42, 0.78, fbm(cp)) * uClouds * lift;

  vec3 cell = floor(d * 230.0);
  float s = hash(cell);
  float star = step(1.0 - 0.006 * uStars, s) * (0.35 + 0.65 * hash(cell + 3.1));
  float twinkle = 0.6 + 0.4 * sin(uTime * (1.3 + 2.5 * hash(cell + 7.7)) + s * 60.0);
  col += vec3(0.78, 0.8, 0.82) * star * twinkle * lift * (1.0 - cloud);

  float a = acos(clamp(dot(d, m), -1.0, 1.0));
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
  vec3 cloudCol = mix(uFogColor * 0.9, uMoonColor * 0.3, exp(-a * 3.0) * step(0.001, uMoon)); // silvered near the moon
  col = mix(col, cloudCol, cloud * 0.85);
  if (h < 0.0) col = uFogColor;
  gl_FragColor = vec4(mix(uFogColor, col, uOpen), 1.0);
}
`;
