/**
 * Creature billboards (spec §2): instanced quads that turn about the vertical axis to face the
 * camera, Doom-style, sampling the sprite atlas. They share the world's vertex snapping, light
 * (ambient, moon and lantern, without normals) and fog. Atlas alpha marks lit pixels (1) and
 * self-lit pixels (glow markings ~0.63, eye glints ~0.82); transparency is dithered. Self-lit eyes and
 * markings fade into the dark beyond a short distance, so a creature is not spotted from afar by its
 * eyes. Output alpha can mark (the Colour Out of Space) a hue outside the palette that the post pass
 * leaves alone (see post.ts).
 */

import { LANTERN_GLSL } from './world';

export const SPRITE_VERT = /* glsl */ `
uniform vec2 uRes;
uniform float uSnap;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uAmbient;
uniform vec3 uLightColor;
uniform float uCharacterLight;

attribute vec4 aCell; // u0, v0 (top), u1, v1 (bottom)
attribute vec4 aInfo; // flash, opacity, flip, outside the palette

varying vec2 vUv;
varying vec3 vLight;
varying float vFog;
varying float vDist;
varying float vFlash;
varying float vOpacity;
varying float vOutside;
${LANTERN_GLSL}
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
  vLight = uAmbient + (uLightColor + uLanternColor * lanternAt(uLanternPos - wp)) * uCharacterLight;
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  vDist = -vp.z;
  vFlash = aInfo.x;
  vOpacity = aInfo.y;
  vOutside = aInfo.w;
}
`;

export const SPRITE_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uMarkCharacters;
uniform float uTime;
uniform vec2 uEyeRange; // metres over which self-lit eyes and markings sink into the dark

varying vec2 vUv;
varying vec3 vLight;
varying float vFog;
varying float vDist;
varying float vFlash;
varying float vOpacity;
varying float vOutside;

float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}

void main() {
  vec4 t = texture(uAtlas, vUv);
  if (t.a < 0.3 || vOpacity < bayer4(gl_FragCoord.xy)) discard;
  bool glow = t.a < 0.9;
  vec3 col = glow ? t.rgb : t.rgb * vLight;
  col = mix(col, vec3(1.0), vFlash);
  float fog = vFog * uFogAmount;
  if (vOutside > 0.5) {
    // A colour no palette holds: every hue at once, crawling over it, bright wherever it is lit.
    vec3 hue = 0.5 + 0.5 * cos(6.2832 * (uTime * 0.23 + dot(t.rgb, vec3(1.7, -0.9, 0.6)) + vec3(0.0, 0.33, 0.67)));
    gl_FragColor = vec4(hue * (0.55 + 0.45 * dot(col, vec3(0.3333))), uMarkCharacters > 0.5 ? 0.31 : 1.0);
    return;
  }
  if (glow) fog = max(fog, smoothstep(uEyeRange.x, uEyeRange.y, vDist));
  gl_FragColor = vec4(mix(col, uFogColor, fog), 1.0);
}
`;
