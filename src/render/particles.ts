/**
 * Particles (render only): dust, sparks, ichor, glowing motes and the boss attacks' effects, as one
 * instanced batch of camera-facing discs. Transparency is ordered-dithered like the sprites', so they
 * need no sorting; glowing ones are self-lit, the rest take the moon and the lantern, and all fog.
 */

import * as THREE from 'three';
import type { Rgb } from './palette';
import { LANTERN_GLSL } from './shaders/world';
import { worldUniforms } from './worldMaterial';

const CAPACITY = 1200;

export interface ParticleSpec {
  x: number;
  y: number;
  z: number;
  vx?: number; // m/s
  vy?: number;
  vz?: number;
  life: number; // seconds
  size: number; // metres across at birth...
  grow?: number; // ...times this at death
  color: Rgb;
  alpha?: number; // at birth, fading to 0
  glow?: boolean; // self-lit
  gravity?: number; // m/s² downward
  drag?: number; // per second
}

export interface Particles {
  spawn(p: ParticleSpec): void;
  /** Steps and draws them; `time` is render seconds. */
  update(time: number, camera: THREE.Camera): void;
}

const VERT = /* glsl */ `
uniform vec2 uRes;
uniform float uSnap;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uAmbient;
uniform vec3 uLightColor;
attribute vec4 aColor; // rgb, alpha
attribute float aGlow;
varying vec2 vUv;
varying vec4 vColor;
varying vec3 vLight;
varying float vFog;
${LANTERN_GLSL}
void main() {
  vec3 origin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length(instanceMatrix[0].xyz);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 wp = origin + (right * position.x + up * position.y) * s;
  vec4 vp = viewMatrix * vec4(wp, 1.0);
  vec4 clip = projectionMatrix * vp;
  if (uSnap > 0.0 && clip.w > 0.0) {
    vec2 grid = uRes * 0.5 / uSnap;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  gl_Position = clip;
  vUv = uv;
  vColor = aColor;
  vLight = aGlow > 0.5 ? vec3(1.0) : uAmbient + (uLightColor + uLanternColor * lanternAt(uLanternPos - wp)) * 0.8;
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogAmount;
varying vec2 vUv;
varying vec4 vColor;
varying vec3 vLight;
varying float vFog;
float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = vColor.a * (1.0 - smoothstep(0.35, 1.0, r));
  if (a < bayer4(gl_FragCoord.xy)) discard;
  gl_FragColor = vec4(mix(vColor.rgb * vLight, uFogColor, vFog * uFogAmount), 1.0);
}
`;

export function createParticles(scene: THREE.Scene): Particles {
  const geo = new THREE.PlaneGeometry(1, 1);
  const colors = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const glows = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aColor', colors);
  geo.setAttribute('aGlow', glows);
  const material = new THREE.ShaderMaterial({ uniforms: { ...worldUniforms }, vertexShader: VERT, fragmentShader: FRAG });
  const batch = new THREE.InstancedMesh(geo, material, CAPACITY);
  batch.frustumCulled = false;
  batch.count = 0;
  scene.add(batch);

  const live: (Required<ParticleSpec> & { age: number })[] = [];
  const m4 = new THREE.Matrix4();
  let last = -1;

  return {
    spawn(p) {
      if (live.length >= CAPACITY) live.shift();
      live.push({ vx: 0, vy: 0, vz: 0, grow: 1, alpha: 1, glow: false, gravity: 0, drag: 0, ...p, age: 0 });
    },
    update(time) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      let n = 0;
      for (let i = 0; i < live.length; i++) {
        const p = live[i];
        p.age += dt;
        if (p.age >= p.life) continue;
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vz *= k;
        p.vy = p.vy * k - p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const t = p.age / p.life;
        const size = p.size * (1 + (p.grow - 1) * t);
        batch.setMatrixAt(n, m4.makeScale(size, size, size).setPosition(p.x, p.y, p.z));
        colors.setXYZW(n, p.color[0], p.color[1], p.color[2], p.alpha * (1 - t));
        glows.setX(n, p.glow ? 1 : 0);
        live[n++] = p;
      }
      live.length = n;
      batch.count = n;
      batch.instanceMatrix.needsUpdate = true;
      colors.needsUpdate = true;
      glows.needsUpdate = true;
    },
  };
}
