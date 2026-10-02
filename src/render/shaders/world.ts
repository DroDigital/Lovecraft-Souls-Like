/**
 * World material GLSL (spec §2): Gouraud vertex lighting (ambient, moon, glow), the player's lantern
 * and the world's nearest lamps per pixel with a smooth falloff, PS1 vertex snapping, affine texture wobble (uv·w passed through,
 * divided per fragment, held within a few texels of the true mapping), world-space texture variation (so no ground repeats), fog fading to
 * near-black, sanity-driven non-Euclidean vertex displacement, and the eldritch bodies' wrongness
 * (shaders/eldritch.ts).
 */

import { PANE_GLSL } from '../paneLife';
import { LAMPS_GLSL, LANTERN_GLSL, NOISE_GLSL, SPACE_GLSL } from './common';
import { ELDRITCH_FRAG, ELDRITCH_VERT } from './eldritch';
import { SHADOW_GLSL } from './shadow';

export { LAMP_SLOTS, LAMPS_GLSL, LANTERN_GLSL, NOISE_GLSL, SPACE_GLSL } from './common';

export const WORLD_VERT = /* glsl */ `
${SPACE_GLSL}
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uGlowPos;
uniform vec3 uGlowColor;
uniform float uGlowRange;
uniform float uFogNear;
uniform float uFogFar;
uniform float uEmissive;
uniform vec2 uUvScale;
uniform vec2 uUvScroll;

attribute float aSplat; // the second ground texture's share (roads, paths); 0 where a mesh has none
#ifdef SWAY
attribute float aSway; // metres this vertex is blown at the height of a gust: nothing at a trunk's foot, most at the tip of a bough or a blade (round 34)
uniform float uWind;
#endif
#ifdef PANES
attribute float aPane; // a lit window's seed (paneLife.ts; round 18)
attribute vec2 aPaneUv; // and where on its glass a point is, 0..1 (round 35)
varying vec2 vPaneUv;
varying float vPane;
#endif
${ELDRITCH_VERT}

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying vec3 vMoon; // the moon's share of vLight, which a shadow takes (shaders/shadow.ts; round 34)
varying vec3 vTint;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFog;
varying float vSplat;

void main() {
  vLocal = position / max(uBodyScale, 0.001);
  vec4 wp = modelMatrix * vec4(uEldritch > 0.0 ? writhe(position, normal) : position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  vWorld = wp.xyz;
#ifdef PANES
  vPane = aPane;
  vPaneUv = aPaneUv;
#endif
#ifdef SWAY
  float gust = 0.5 + 0.5 * sin(uTime * 0.31 + wp.x * 0.045 - wp.z * 0.03); // gusts roll across the land...
  float flutter = 0.5 * sin(uTime * 1.7 + wp.x * 0.9 + wp.z * 0.7) + 0.25 * sin(uTime * 2.9 + wp.z * 1.3); // ...and shiver in it
  wp.xz += aSway * uWind * (0.3 + 0.7 * gust + 0.3 * flutter) * vec2(0.85, 0.5); // after vWorld: lit and shadowed where it stands, drawn where the wind has it
#endif
  wp.xyz = displace(wp.xyz);

  vec4 vp = viewMatrix * wp;
  vec4 clip = snap(projectionMatrix * vp);
  gl_Position = clip;

  vec2 uv0 = uv * uUvScale + uUvScroll * uTime;
  vUv = uv0;
  vUvw = vec3(uv0 * clip.w, clip.w);

  vec3 moon = uLightColor * max(dot(wn, uLightDir), 0.0);
  vec3 light = uAmbient + moon;
  vec3 toGlow = uGlowPos - wp.xyz;
  float gd = length(toGlow);
  float fall = clamp(1.0 - gd / uGlowRange, 0.0, 1.0);
  light += uGlowColor * fall * fall * (0.35 + 0.65 * max(dot(wn, toGlow / max(gd, 0.001)), 0.0));
  vec3 tint = vec3(1.0);
#ifdef USE_COLOR
  tint = color;
#endif
  vTint = tint;
  vLight = mix(light, vec3(1.0), uEmissive) * tint;
  vMoon = moon * (1.0 - uEmissive) * tint;
  vNormal = wn;
  vSplat = aSplat;
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
}
`;

export const WORLD_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uMap2;
uniform sampler2D uMap3;
uniform float uAffine;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uCharacter;
uniform float uMarkCharacters; // 1: a character's pixels carry alpha 0.75, which the post pass keeps the colour of (round 34)
uniform float uCharacterLight;
uniform float uLanternSelf; // the investigator's share of their own lantern
uniform float uSelfMax; // the brightest anything lights the investigator
uniform float uLanternFacing;
uniform float uEmissive;
uniform float uVary; // world-space tone variation (0: none)
uniform float uBomb; // 1: a second, turned sample blends in by a noise mask, so organic ground never repeats
uniform float uHasMap2; // 1: uMap2 blends in by vSplat (roads)
uniform float uSeaLevel;
uniform float uWet; // how soaked the ground is, 0..1 (weather.ts; round 34)
uniform vec3 uLightColor;
uniform float uHasMap3; uniform vec2 uPatch; // 1: uMap3 is laid over the ground in patches of the land's own noise, from uPatch.x, softly over uPatch.y (round 32: a field is not one ground)

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying vec3 vMoon;
varying vec3 vTint;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFog;
varying float vSplat;
uniform vec3 uLightDir;
${LANTERN_GLSL}
${LAMPS_GLSL}
${NOISE_GLSL}
${SHADOW_GLSL}
${ELDRITCH_FRAG}
#ifdef PANES
varying float vPane;
varying vec2 vPaneUv;
${PANE_GLSL}
#endif
// Mip levels come from the true mapping's gradients (gx, gy), so none jumps along a face's diagonal.
vec3 sampleMap(sampler2D map, vec2 uv, vec2 gx, vec2 gy) {
  vec3 t = textureGrad(map, uv, gx, gy).rgb;
  if (uBomb > 0.5) {
    mat2 turn = mat2(0.0, 1.0, -1.0, 0.0) * 0.83;
    vec2 uv2 = turn * uv + vec2(0.37, 0.71);
    float m = smoothstep(0.38, 0.62, vnoise(vWorld.xz * 0.09 + 11.0));
    t = mix(t, textureGrad(map, uv2, turn * gx, turn * gy).rgb, m);
  }
  return t;
}

// The PS1's affine mapping (WebGL2 has no noperspective: uv·w / w interpolates affinely), held
// within uAffine texels of the true mapping: far faces keep their wobble, but a large face up close
// only shivers instead of shearing and swelling as the view turns.
vec2 affineUv(vec2 texels) {
  vec2 off = (vUvw.xy / vUvw.z - vUv) * texels;
  float len = length(off);
  return vUv + off * (min(len, uAffine) / max(len, 1e-4)) / texels;
}

uniform float uClipY;
void main() {
  if (vWorld.y < uClipY) discard; // under the sea's surface, in the mirrored scene (reflection.ts; round 35)
  vec2 uv = affineUv(vec2(textureSize(uMap, 0)));
  vec2 gx = dFdx(vUv);
  vec2 gy = dFdy(vUv);
  vec3 tex = sampleMap(uMap, uv, gx, gy);
  if (uHasMap2 > 0.5 && vSplat > 0.01) {
    float edge = vSplat + 0.35 * (vnoise(vWorld.xz * 0.9) - 0.5);
    tex = mix(tex, textureGrad(uMap2, uv, gx, gy).rgb, smoothstep(0.35, 0.65, edge));
  }
  if (uHasMap3 > 0.5) {
    float pn = 0.5 * vnoise(vWorld.xz * 0.045 + 17.0) + 0.3 * vnoise(vWorld.xz * 0.13 + 3.0) + 0.2 * vnoise(vWorld.xz * 0.5), pm = smoothstep(uPatch.x, uPatch.x + uPatch.y, pn) * (1.0 - smoothstep(0.1, 0.5, vSplat)); // never over a road
    if (pm > 0.01) tex = mix(tex, textureGrad(uMap3, uv * 0.9 + vec2(0.31, 0.57), gx * 0.9, gy * 0.9).rgb, pm);
  }
  if (uVary > 0.0) {
    float n = 0.45 * vnoise(vWorld.xz * 0.018 + 2.0) + 0.35 * vnoise(vWorld.xz * 0.06) + 0.2 * vnoise(vWorld.xz * 0.3 + 5.0);
    tex *= 1.0 + uVary * (n - 0.5) * 0.9;
    tex *= 1.0 + uVary * vec3(0.16, 0.02, -0.18) * (vnoise(vWorld.xz * 0.012 + 40.0) - 0.5); // drier and warmer here, damper and cooler there: no field is one colour
  }
  // The lantern, per pixel: a smooth pool, brightest at the investigator. Characters take a fixed
  // share of it (no N·L, like sprites), so their values hold as they turn; the investigator takes less
  // of their own, which hangs at their hip, and whatever lights them is held below uSelfMax, so their
  // face never outshines the flame they carry (its own light is emissive, so never held).
  vec3 toLamp = uLanternPos - vWorld;
  float ld = length(toLamp);
  vec3 n = normalize(vNormal);
  float pud = 0.0; // rain has soaked the ground: all that stands under the sky is darker for it, and flat ground holds puddles in the heaviest (round 34)
  if (uWet > 0.01 && uEmissive < 0.5 && uCharacter < 0.5) {
    float pn = 0.55 * vnoise(vWorld.xz * 0.19 + 7.0) + 0.3 * vnoise(vWorld.xz * 0.55 + 1.0) + 0.15 * vnoise(vWorld.xz * 1.7);
    float thr = 0.78 - 0.17 * uWet; // they shrink as the ground dries, and are not there in a light rain
    pud = smoothstep(thr, thr + 0.06, pn) * smoothstep(0.86, 0.97, n.y);
    tex *= 1.0 - uWet * (0.1 + 0.16 * n.y) - 0.3 * pud;
  }
  float facing = mix(1.0, max(dot(n, toLamp / max(ld, 0.001)), 0.0), uLanternFacing);
  float self = uCharacter > 1.5 ? 1.0 : 0.0;
  float share = uCharacterLight * mix(1.0, uLanternSelf, self);
  float character = min(uCharacter, 1.0);
  vec3 lamp = uLanternColor * lanternFalloff(ld) * mix(facing, share, character) * mix(1.0, lanternLit(vWorld, n), uLShadow.x * (1.0 - self)); // what stands between a point and the lantern takes its light (round 34)
  lamp += lampLight(vWorld, n, uLanternFacing * (1.0 - character)) * mix(1.0, uCharacterLight, character); // the world's lamps, fires and windows
  lamp *= (1.0 - uEmissive) * vTint;
  vec3 lit = vLight - vMoon * (1.0 - moonLit(vWorld, n, max(dot(n, uLightDir), 0.0))) * uShadow.x + lamp; // what stands between a point and the moon takes the moon's light
  float peak = max(max(lit.r, lit.g), max(lit.b, 0.001));
  lit *= mix(1.0, min(1.0, uSelfMax / peak), self * max(1.0 - uEmissive, 0.0));
  tex = mix(tex, vec3(1.0), 0.6 * uEmissive); // a lit thing shines through its texture
  vec3 col = eldritch(tex * lit);
  if (pud > 0.01) { // a puddle throws back the lamps, the sky and the moon at a glancing look, and rings where the drops fall
    vec3 v = normalize(cameraPosition - vWorld);
    float mirror = (0.1 + 0.9 * pow(1.0 - max(v.y, 0.0), 4.0)) * 0.6;
    float glint = pow(max(dot(reflect(-v, vec3(0.0, 1.0, 0.0)), uLightDir), 0.0), 24.0);
    vec2 cell = floor(vWorld.xz * 1.6);
    float t = uTime * 0.8 + hash12(cell) * 3.0, beat = floor(t), age = fract(t); // a drop in a cell's turn, not in every turn, and each time elsewhere in it
    vec2 drop = (cell + 0.2 + 0.6 * vec2(hash12(cell + beat * 7.3), hash12(cell + beat * 3.7 + 9.0))) / 1.6;
    float ring = step(0.4, hash12(cell * 1.7 + beat * 5.1)) * smoothstep(0.1, 0.0, abs(length(vWorld.xz - drop) * 1.6 - age * 0.5)) * (1.0 - age);
    col = mix(col, uFogColor * vec3(0.8, 0.9, 1.0) + uLightColor * glint * 1.5, mirror * pud);
    col += (lamp * 1.1 + vec3(0.2, 0.22, 0.25) * ring) * pud;
  }
#ifdef PANES
  col *= paneLit(vPane, uTime) * paneFigure(vPane, uTime, vPaneUv); // lived behind: put out now and then, dimmed as someone passes, and now and then someone seen
#endif
#ifdef SHORE
  {
    float h = vWorld.y - uSeaLevel;
    // The water runs up the shore and slips back: the waterline breathes about a quarter of a metre.
    float surge = 0.22 + 0.2 * sin(uTime * 0.55 + vWorld.x * 0.07 + vWorld.z * 0.05) + 0.07 * sin(uTime * 1.3 + vWorld.z * 0.2);
    float wet = 1.0 - smoothstep(surge, surge + 0.55, h); // the ground the water has just left, darker
    col *= mix(1.0, 0.6, wet * step(-0.8, h));
    float lace = vnoise(vWorld.xz * 1.8 + vec2(uTime * 0.15, 0.0)) * 0.65 + vnoise(vWorld.xz * 5.0 - uTime * 0.3) * 0.35;
    float line = 1.0 - smoothstep(0.0, 0.22, abs(h - surge - 0.08));
    float foam = line * smoothstep(0.42, 0.7, lace) * step(-0.4, h);
    col = mix(col, min(lit, vec3(1.2)) * vec3(0.9, 0.95, 0.93) * 1.1, clamp(foam, 0.0, 0.7));
  }
#endif
  gl_FragColor = vec4(mix(col, uFogColor, vFog * uFogAmount), uCharacter > 0.5 && uMarkCharacters > 0.5 ? 0.75 : 1.0);
}
`;
