/**
 * Columns of pale light over the Elder Signs not yet found (round 26: what was worth walking to was
 * only seen from thirty metres): a thin violet column stands over each through the dark, to be seen
 * across a field and steered by, brightening a little as it breathes. They are not in the fog's way: they
 * rise above it. Gone at once (fading over two seconds) when the sign is found, and from within thirty
 * metres of it, where the sign's own glow takes over. Render only.
 */

import * as THREE from 'three';
import { SURVEY } from '../data/tuning';
import type { Game } from '../systems/components';
import { worldLayout } from '../world/placements';

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = `uniform vec3 uColor; uniform float uAlpha; uniform float uTime; varying vec2 vUv;
void main() {
  float side = smoothstep(0.5, 0.05, abs(vUv.x - 0.5));
  float rise = pow(1.0 - vUv.y, 1.25) * smoothstep(0.0, 0.04, vUv.y);
  float breath = 0.78 + 0.22 * sin(uTime * 1.4 + vUv.y * 6.0);
  gl_FragColor = vec4(uColor, uAlpha * 0.32 * side * rise * breath);
}`;

/** How much of a column shows at `distance` metres: nothing past SURVEY.beacon.see, rising as it nears, nothing again within SURVEY.beacon.near. */
export function beaconAlpha(distance: number): number {
  const { see, near } = SURVEY.beacon;
  const far = Math.min(1, Math.max(0, (see - distance) / (see * 0.35)));
  const close = Math.min(1, Math.max(0, (distance - near) / near));
  return far * close;
}

export interface Beacons {
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
}

export function createBeacons(scene: THREE.Scene, g: Game): Beacons {
  const { height, width } = SURVEY.beacon;
  const geo = new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0);
  const signs = worldLayout().signs.filter((s) => !s.dream);
  const uTime = { value: 0 };
  const meshes = signs.map((s) => {
    const alpha = { value: 0 };
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector3(0.74, 0.62, 1) }, uAlpha: alpha, uTime },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    mesh.position.set(s.x, s.y - 1, s.z);
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { s, mesh, alpha };
  });
  let last = -1;
  return {
    update(camera, time, hidden) {
      const dt = last < 0 ? 1 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      uTime.value = time;
      const found = g.overworld?.discovered;
      for (const b of meshes) {
        const d = Math.hypot(b.s.x - camera.position.x, b.s.z - camera.position.z);
        const want = hidden || !g.overworld || found?.has(b.s.id) ? 0 : beaconAlpha(d);
        b.alpha.value += (want - b.alpha.value) * Math.min(1, dt / 2);
        b.mesh.visible = b.alpha.value > 0.01;
        if (b.mesh.visible) b.mesh.rotation.y = Math.atan2(camera.position.x - b.s.x, camera.position.z - b.s.z); // it faces the lens
      }
    },
  };
}
