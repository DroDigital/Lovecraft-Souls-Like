/**
 * Soft additive halos (playtest round 5; shared since round 8): camera-facing discs, brightest at
 * their middle, drawn a little toward the eye so the surface a glow sits on does not cut it, and
 * fading less than the fog does, so lights glow through the dark as lights should. The world's
 * lamps wear them (worldLights.ts), and so do creatures' eyes (creatureViews.ts). One instanced batch
 * each: fill it with `put` between `begin` and `end` every frame.
 */

import * as THREE from 'three';
import { worldUniforms } from './worldMaterial';

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

export interface Halos {
  readonly mesh: THREE.Mesh;
  /** Starts this frame's halos. */
  begin(): void;
  /** A halo at (x, y, z), `radius` metres, of colour `rgb` × `gain`; false once the batch is full. */
  put(x: number, y: number, z: number, radius: number, rgb: ArrayLike<number>, gain: number): boolean;
  /** Shows this frame's halos. */
  end(): void;
}

/** `fog`: the share of the fog the halos fade by (1: as much as the world). */
export function createHalos(capacity: number, fog: number): Halos {
  const geo = new THREE.InstancedBufferGeometry();
  geo.copy(new THREE.PlaneGeometry(1, 1) as unknown as THREE.InstancedBufferGeometry);
  const halo = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  const tint = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  halo.setUsage(THREE.DynamicDrawUsage);
  tint.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aHalo', halo);
  geo.setAttribute('aHaloColor', tint);
  geo.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    uniforms: { uFogNear: worldUniforms.uFogNear, uFogFar: worldUniforms.uFogFar, uHaloFog: { value: fog } },
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  let count = 0;
  return {
    mesh,
    begin() {
      count = 0;
    },
    put(x, y, z, radius, rgb, gain) {
      if (count >= capacity) return false;
      halo.setXYZW(count, x, y, z, radius);
      tint.setXYZ(count, rgb[0] * gain, rgb[1] * gain, rgb[2] * gain);
      count++;
      return true;
    },
    end() {
      geo.instanceCount = count;
      halo.needsUpdate = true;
      tint.needsUpdate = true;
    },
  };
}
