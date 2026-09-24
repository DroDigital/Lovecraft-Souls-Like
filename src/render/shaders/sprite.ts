/**
 * Creature billboards (spec §2): instanced quads that turn about the vertical axis to face the
 * camera, Doom-style, sampling the sprite atlas. They share the world's vertex snapping and fog.
 * Atlas alpha marks lit pixels (1) and self-lit glow markings (~0.63); transparency is dithered.
 */

export const SPRITE_VERT = /* glsl */ `
uniform vec2 uRes;
uniform float uSnap;
uniform float uFogNear;
uniform float uFogFar;

attribute vec4 aCell; // u0, v0 (top), u1, v1 (bottom)
attribute vec4 aInfo; // flash, opacity, flip, unused

varying vec2 vUv;
varying float vFog;
varying float vFlash;
varying float vOpacity;

void main() {
  vec3 origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float w = length(instanceMatrix[0].xyz);
  float h = length(instanceMatrix[1].xyz);
  vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
  vec3 wp = origin + right * position.x * w + vec3(0.0, position.y * h, 0.0);
  vec4 vp = viewMatrix * vec4(wp, 1.0);
  vec4 clip = projectionMatrix * vp;
  if (uSnap > 0.0 && clip.w > 0.0) {
    vec2 grid = uRes * 0.5 / uSnap;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  gl_Position = clip;
  float u = aInfo.z > 0.5 ? 1.0 - uv.x : uv.x;
  vUv = vec2(mix(aCell.x, aCell.z, u), mix(aCell.y, aCell.w, 1.0 - uv.y));
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  vFlash = aInfo.x;
  vOpacity = aInfo.y;
}
`;

export const SPRITE_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uLight;

varying vec2 vUv;
varying float vFog;
varying float vFlash;
varying float vOpacity;

float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}

void main() {
  vec4 t = texture(uAtlas, vUv);
  if (t.a < 0.3 || vOpacity < bayer4(gl_FragCoord.xy)) discard;
  bool glow = t.a < 0.9;
  vec3 col = glow ? t.rgb : t.rgb * uLight;
  col = mix(col, vec3(1.0), vFlash);
  gl_FragColor = vec4(mix(col, uFogColor, vFog * uFogAmount * (glow ? 0.5 : 1.0)), 1.0);
}
`;
