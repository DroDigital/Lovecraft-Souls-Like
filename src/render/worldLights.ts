/**
 * The world's lights (playtest round 5): every street lamp, fire, torch and lit window that the
 * chunk and dungeon builders report (propMeshes.ts, siteMeshes.ts) is a light spot. Each frame the
 * nearest become the shader's point lights (LAMPS_GLSL), easing to nothing toward the edge of the
 * chosen set so none pops as another takes its place; flames waver. Every spot within reach also
 * wears a soft additive halo, drawn a little toward the eye so the wall it hangs on does not cut it,
 * and fading less than the fog does, so lights glow through the dark as lights should. The
 * investigator's lantern wears one too.
 */

import * as THREE from 'three';
import { LIGHTS, type LightKind } from '../data/tuning';
import { LAMP_SLOTS } from './shaders/world';
import { worldUniforms } from './worldMaterial';

export interface LightSpot {
  x: number;
  y: number;
  z: number;
  kind: LightKind;
}

export interface WorldLights {
  readonly halos: THREE.Mesh;
  add(key: number, spots: readonly LightSpot[]): void;
  remove(key: number): void;
  /** Lights the world about the camera at `eye`; `lantern` (the investigator's flame, as drawn) wears its halo (null: none). */
  update(eye: THREE.Vector3, time: number, lantern: THREE.Vector3 | null): void;
}

const MAX_HALOS = 400;

const HALO_VERT = /* glsl */ `
attribute vec4 aHalo; // centre, radius
attribute vec3 aHaloColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uHaloFog;
varying vec2 vQ;
varying vec3 vCol;
void main() {
  vec4 mv = viewMatrix * vec4(aHalo.xyz, 1.0);
  float d = length(mv.xyz);
  mv.xyz *= max(0.0, 1.0 - aHalo.w * 0.8 / max(d, 0.001));
  mv.xy += position.xy * aHalo.w * 2.0;
  gl_Position = projectionMatrix * mv;
  vQ = position.xy * 2.0;
  float fog = clamp((d - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  vCol = aHaloColor * (1.0 - fog * uHaloFog);
}
`;

const HALO_FRAG = /* glsl */ `
varying vec2 vQ;
varying vec3 vCol;
void main() {
  float r = length(vQ);
  if (r >= 1.0) discard;
  float a = 1.0 - r;
  gl_FragColor = vec4(vCol * a * a, 1.0);
}
`;

/** A flame's waver: about 1, by `amount`, its own rhythm for each spot. */
function waver(s: LightSpot, amount: number, time: number): number {
  if (amount <= 0) return 1;
  const phase = Math.abs(Math.sin(s.x * 12.9898 + s.z * 78.233)) * 40;
  return 1 + amount * (0.6 * Math.sin(time * 7.3 + phase) + 0.4 * Math.sin(time * 13.1 + phase * 0.37));
}

export function createWorldLights(): WorldLights {
  const spots = new Map<number, readonly LightSpot[]>();
  const geo = new THREE.InstancedBufferGeometry();
  geo.copy(new THREE.PlaneGeometry(1, 1) as unknown as THREE.InstancedBufferGeometry);
  const halo = new THREE.InstancedBufferAttribute(new Float32Array(MAX_HALOS * 4), 4);
  const tint = new THREE.InstancedBufferAttribute(new Float32Array(MAX_HALOS * 3), 3);
  halo.setUsage(THREE.DynamicDrawUsage);
  tint.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aHalo', halo);
  geo.setAttribute('aHaloColor', tint);
  geo.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    uniforms: { uFogNear: worldUniforms.uFogNear, uFogFar: worldUniforms.uFogFar, uHaloFog: { value: LIGHTS.haloFog } },
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const halos = new THREE.Mesh(geo, material);
  halos.frustumCulled = false;
  const near: { s: LightSpot; d: number }[] = [];
  return {
    halos,
    add(key, list) {
      if (list.length) spots.set(key, list);
    },
    remove(key) {
      spots.delete(key);
    },
    update(eye, time, lantern) {
      near.length = 0;
      for (const list of spots.values()) {
        for (const s of list) {
          const d = Math.hypot(s.x - eye.x, s.y - eye.y, s.z - eye.z);
          if (d < LIGHTS.haloReach) near.push({ s, d });
        }
      }
      near.sort((a, b) => a.d - b.d);
      const reach = Math.min(LIGHTS.reach, near[LAMP_SLOTS]?.d ?? Infinity); // the next in line is at nothing
      const lamps = worldUniforms.uLamps.value;
      const colors = worldUniforms.uLampColors.value;
      for (let i = 0; i < LAMP_SLOTS; i++) {
        const n = near[i];
        const k = n ? LIGHTS.kinds[n.s.kind] : null;
        const weight = n && k ? 1 - THREE.MathUtils.smoothstep(n.d, reach * 0.7, reach) : 0;
        if (!n || !k || weight <= 0) {
          lamps[i].w = 0;
          continue;
        }
        lamps[i].set(n.s.x, n.s.y, n.s.z, k.range);
        colors[i].set(...k.color).multiplyScalar(k.strength * weight * waver(n.s, k.flicker, time));
      }
      let count = 0;
      const put = (x: number, y: number, z: number, radius: number, c: readonly number[], gain: number): void => {
        halo.setXYZW(count, x, y, z, radius);
        tint.setXYZ(count, c[0] * gain, c[1] * gain, c[2] * gain);
        count++;
      };
      if (lantern) put(lantern.x, lantern.y, lantern.z, LIGHTS.lantern.halo, LIGHTS.lantern.color, LIGHTS.lantern.haloGain * waver({ x: 0, y: 0, z: 0, kind: 'torch' }, 0.05, time));
      for (const { s } of near) {
        if (count >= MAX_HALOS) break;
        const k = LIGHTS.kinds[s.kind];
        put(s.x, s.y, s.z, k.halo, k.color, k.haloGain * waver(s, k.flicker, time));
      }
      geo.instanceCount = count;
      halo.needsUpdate = true;
      tint.needsUpdate = true;
    },
  };
}
