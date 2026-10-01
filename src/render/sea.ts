/**
 * The sea (round 30: a flat plane, a texture sliding over it): a surface of waves (seaWaves.ts) in
 * four nested rings of grid, fine at the investigator's feet and coarse at the horizon, each ring
 * kept on whole cells so the water never swims as they walk; lit by what is above it: the sky
 * (fogged at the horizon, deeper overhead) in the glancing angle, the moon in a path of glitter, the
 * lamps and the lantern on the swell near them; white where a crest breaks, and where the water
 * runs up the shore (world material `shore`). The wind raises it (`SEA.chop`: weather, realm).
 * Colours are display sRGB, as everything: the sea is dark, as ever. Render only.
 */

import * as THREE from 'three';
import { WORLD } from '../data/tuning';
import { AMP_SUM, WAVES_GLSL } from './seaWaves';
import { LAMPS_GLSL, LANTERN_GLSL, NOISE_GLSL, SPACE_GLSL } from './shaders/world';
import { worldUniforms } from './worldMaterial';

/** How hard the wind drives the sea: 1 as it lies, raised by weather and by the realm (worldLife.ts). */
export const SEA = { chop: { value: 1 } };

const VERT = /* glsl */ `
${SPACE_GLSL}
uniform float uChop;
uniform float uSeaLevel;
uniform float uFogNear;
uniform float uFogFar;
${WAVES_GLSL}
varying vec3 vWorld;
varying vec3 vN;
varying float vHigh; // 0..1: how near a crest
varying float vFog;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 w = seaWave(wp.xz);
  float mean = 0.5 * ${(AMP_SUM * 0.35).toFixed(5)};
  wp.y = uSeaLevel + (w.x - mean) * uChop;
  vN = normalize(vec3(-w.y * uChop, 1.0, -w.z * uChop));
  vHigh = clamp(w.x / ${AMP_SUM.toFixed(5)} * 1.7, 0.0, 1.0);
  vWorld = wp.xyz;
  wp.xyz = displace(wp.xyz);
  vec4 vp = viewMatrix * wp;
  gl_Position = snap(projectionMatrix * vp);
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uCamPos;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uTime;
uniform float uChop;
varying vec3 vWorld;
varying vec3 vN;
varying float vHigh;
varying float vFog;
${LANTERN_GLSL}
${LAMPS_GLSL}
${NOISE_GLSL}

// Small ripples, two layers sliding across each other, as a gradient: the wind on the swell.
vec2 ripple(vec2 p, float t) {
  vec2 a = p * 0.9 + vec2(t * 0.35, t * 0.21);
  vec2 b = p * 2.3 + vec2(-t * 0.5, t * 0.43);
  float e = 0.35;
  vec2 ga = vec2(vnoise(a + vec2(e, 0.0)) - vnoise(a - vec2(e, 0.0)), vnoise(a + vec2(0.0, e)) - vnoise(a - vec2(0.0, e)));
  vec2 gb = vec2(vnoise(b + vec2(e, 0.0)) - vnoise(b - vec2(e, 0.0)), vnoise(b + vec2(0.0, e)) - vnoise(b - vec2(0.0, e)));
  return ga * 0.5 + gb * 0.3;
}

void main() {
  vec3 view = uCamPos - vWorld;
  float dist = length(view);
  vec3 v = view / max(dist, 0.001);
  float near = 1.0 - smoothstep(14.0, 60.0, dist); // ripples are a near thing: far off they would only shimmer at this resolution
  vec2 r = ripple(vWorld.xz, uTime) * (0.28 + 0.2 * uChop) * near;
  vec3 n = normalize(vN + vec3(r.x, 0.0, r.y));
  float cosv = max(dot(n, v), 0.0);
  float fres = 0.04 + 0.96 * pow(1.0 - cosv, 4.0); // from above it is deep and dark; at a glance it is a mirror

  // What it mirrors: the horizon's haze, deepening overhead; the moon, as a path.
  vec3 rd = reflect(-v, n);
  vec3 horizon = uFogColor * 1.5 + uAmbient * 0.6;
  vec3 zenith = uFogColor * 0.25 + uAmbient * 0.5;
  vec3 sky = mix(horizon, zenith, pow(clamp(rd.y, 0.0, 1.0), 0.45));
  float toMoon = max(dot(rd, normalize(uLightDir)), 0.0);
  vec3 moon = uLightColor * (pow(toMoon, 260.0) * 3.2 + pow(toMoon, 22.0) * 0.28);
  vec3 mirror = sky * 1.25 + moon;

  // The deep, and the body of the swell lit by what shines on it.
  vec3 deep = vec3(0.028, 0.055, 0.062) + uAmbient * vec3(0.16, 0.26, 0.26);
  float slope = 0.5 + 0.5 * dot(n, normalize(uLightDir)); // the swell's faces turned to the moon are lit, those turned away dark
  vec3 body = deep * (0.3 + 1.5 * slope) * (0.75 + 0.6 * vHigh) + uLightColor * vec3(0.05, 0.1, 0.09) * slope * slope + vec3(0.02, 0.06, 0.05) * pow(1.0 - cosv, 2.0) * vHigh; // a crest lets light through
  vec3 lamp = lampLight(vWorld, n, 0.0) * 0.45 + uLanternColor * lanternFalloff(length(uLanternPos - vWorld)) * 0.5;
  vec3 col = mix(body, mirror, fres) + lamp * (0.25 + 0.75 * fres) * vec3(0.9, 0.95, 0.95);

  // Foam: white where a crest breaks, torn into lace by noise that drifts with the swell.
  float lace = vnoise(vWorld.xz * 1.1 + vec2(uTime * 0.25, -uTime * 0.18)) * 0.6 + vnoise(vWorld.xz * 3.1 - uTime * 0.4) * 0.4;
  float streak = vnoise(vec2(dot(vWorld.xz, vec2(0.94, 0.34)) * 0.42, dot(vWorld.xz, vec2(-0.34, 0.94)) * 1.9 + uTime * 0.12)); // drawn out along the crests, not in blotches
  float foam = smoothstep(0.82 - 0.1 * (uChop - 1.0), 1.0, vHigh + 0.3 * (lace - 0.5)) * smoothstep(0.52, 0.78, streak) * near;
  vec3 white = (uAmbient * 1.6 + uLightColor * 0.4 + lamp) * vec3(0.7, 0.76, 0.74);
  col = mix(col, white, clamp(foam, 0.0, 0.6));

  gl_FragColor = vec4(mix(col, uFogColor, vFog * uFogAmount), 1.0);
}
`;

const LEVELS = 4;
const CELLS = 48;
const BASE = 1.6; // metres: the finest ring's cell

/** A square ring of grid, `CELLS` cells across of `cell` metres, without the middle `hole` metres either way (0: whole). */
function ring(cell: number, hole: number): THREE.BufferGeometry {
  const n = CELLS + 1;
  const half = (CELLS * cell) / 2;
  const pos: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pos.push(i * cell - half, 0, j * cell - half);
  const index: number[] = [];
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) {
      const [cx, cz] = [(i + 0.5) * cell - half, (j + 0.5) * cell - half];
      if (hole > 0 && Math.abs(cx) < hole && Math.abs(cz) < hole) continue;
      const a = j * n + i;
      index.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  return geo;
}

export interface Sea {
  readonly group: THREE.Group;
  /** Keeps the rings under (x, z), each on whole cells of its own. */
  update(x: number, z: number): void;
}

export function createSea(): Sea {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...worldUniforms,
      uChop: SEA.chop,
      uSeaLevel: { value: WORLD.seaLevel },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2, // the coarser rings lie a little behind the finer where they overlap
  });
  const group = new THREE.Group();
  const rings = Array.from({ length: LEVELS }, (_, k) => {
    const cell = BASE * 2 ** k;
    const mesh = new THREE.Mesh(ring(cell, k === 0 ? 0 : CELLS * BASE * 2 ** (k - 1) * 0.5 * 0.9), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    group.add(mesh);
    return { mesh, step: cell * 2 };
  });
  return {
    group,
    update(x, z) {
      for (const r of rings) r.mesh.position.set(Math.round(x / r.step) * r.step, 0, Math.round(z / r.step) * r.step);
    },
  };
}
