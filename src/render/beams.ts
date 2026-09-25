/**
 * Beams (render only): a sweeping beam while it sweeps, and the flash of a boss's beam as it fires,
 * as camera-facing ribbons along their segments with a white-hot core fading out to a coloured
 * glow (dithered, self-lit). Driven by the sweeping moves and the Shot event. Read-only on the simulation.
 */

import * as THREE from 'three';
import type { V3 } from '../core/geom';
import { moveDef } from '../systems/actions';
import { isAbsent, type Game } from '../systems/components';
import { beamLine } from '../systems/strikes';
import { ANOMALY, type Rgb } from './palette';
import { worldUniforms } from './worldMaterial';

const CAPACITY = 24;
const FLASH = 0.22; // seconds a fired beam lingers

export interface Beams {
  update(alpha: number, time: number, camera: THREE.Camera): void;
}

const VERT = /* glsl */ `
uniform float uFogNear;
uniform float uFogFar;
attribute vec4 aColor;
attribute float aAcross; // -1..1 across the ribbon
varying vec4 vColor;
varying float vAcross;
varying float vFog;
void main() {
  vColor = aColor;
  vAcross = aAcross;
  vec4 vp = viewMatrix * vec4(position, 1.0);
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  gl_Position = projectionMatrix * vp;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogAmount;
varying vec4 vColor;
varying float vAcross;
varying float vFog;
float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}
void main() {
  float d = abs(vAcross);
  float core = 1.0 - smoothstep(0.1, 0.35, d);
  float a = vColor.a * max(core, 0.7 * (1.0 - d));
  if (a < bayer4(gl_FragCoord.xy)) discard;
  vec3 c = mix(vColor.rgb, vec3(1.0, 0.98, 0.9), core);
  gl_FragColor = vec4(mix(c, uFogColor, vFog * uFogAmount * 0.5), 1.0);
}
`;

export function createBeams(scene: THREE.Scene, g: Game): Beams {
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(CAPACITY * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.BufferAttribute(new Float32Array(CAPACITY * 4 * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const across = new THREE.BufferAttribute(new Float32Array(CAPACITY * 4).map((_, i) => (i % 2 === 0 ? -1 : 1)), 1);
  const index: number[] = [];
  for (let i = 0; i < CAPACITY; i++) index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3);
  geo.setAttribute('position', pos);
  geo.setAttribute('aColor', col);
  geo.setAttribute('aAcross', across);
  geo.setIndex(index);
  const material = new THREE.ShaderMaterial({ uniforms: { ...worldUniforms }, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const flashes: { from: V3; to: V3; at: number; color: Rgb }[] = [];
  let now = 0;
  g.events.on('Shot', ({ shooter, from, to }) => {
    if (shooter !== g.player.id) flashes.push({ from: { ...from }, to: { ...to }, at: now, color: ANOMALY.green });
  });

  const eye = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const side = new THREE.Vector3();
  const view = new THREE.Vector3();
  let n = 0;
  const ribbon = (a: V3, b: V3, width: number, color: Rgb, alpha: number): void => {
    if (n >= CAPACITY) return;
    dir.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    view.set((a.x + b.x) / 2 - eye.x, (a.y + b.y) / 2 - eye.y, (a.z + b.z) / 2 - eye.z);
    side.crossVectors(dir, view).normalize().multiplyScalar(width / 2);
    const k = n * 4;
    pos.setXYZ(k, a.x - side.x, a.y - side.y, a.z - side.z);
    pos.setXYZ(k + 1, a.x + side.x, a.y + side.y, a.z + side.z);
    pos.setXYZ(k + 2, b.x - side.x, b.y - side.y, b.z - side.z);
    pos.setXYZ(k + 3, b.x + side.x, b.y + side.y, b.z + side.z);
    for (let i = 0; i < 4; i++) col.setXYZW(k + i, color[0], color[1], color[2], alpha);
    n++;
  };

  return {
    update(alpha, time, camera) {
      now = time;
      eye.setFromMatrixPosition(camera.matrixWorld);
      n = 0;
      for (const [id, a] of g.ecs.c.actor) {
        const sw = moveDef(a)?.sweep;
        if (!sw || a.frame < sw.window[0] || a.frame >= sw.window[1] || isAbsent(g, id)) continue;
        const { from, to } = beamLine(g, id, sw, a.frame + alpha);
        const flicker = 0.85 + 0.15 * Math.sin(time * 70 + id);
        ribbon(from, to, 0.9 * sw.width + 0.5, ANOMALY.green, flicker);
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const t = (time - f.at) / FLASH;
        if (t >= 1 || t < 0) {
          flashes.splice(i, 1);
          continue;
        }
        ribbon(f.from, f.to, 0.9 * (1 - t) + 0.2, f.color, 1 - t * t);
      }
      geo.setDrawRange(0, n * 6);
      pos.needsUpdate = true;
      col.needsUpdate = true;
    },
  };
}
