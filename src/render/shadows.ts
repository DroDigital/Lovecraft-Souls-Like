/**
 * Blob shadows (render only): a soft dark disc on the ground under every body that stands in the
 * world — the investigator, the people met, creatures and colossi — so nothing floats. Ordered-
 * dithered like the particles; a hovering creature's shadow shrinks and fades with its height.
 * Read-only on the simulation.
 */

import * as THREE from 'three';
import type { Entity } from '../core/ecs';
import { isAbsent, isUnseen, type Game } from '../systems/components';
import { worldUniforms } from './worldMaterial';

const CAPACITY = 96;
const LIFT = 0.04; // metres above the ground
const DARK = 0.55; // how dark at its heart

const VERT = /* glsl */ `
uniform float uFogNear;
uniform float uFogFar;
attribute float aAlpha;
varying vec2 vP;
varying float vAlpha;
varying float vFog;
void main() {
  vP = position.xz;
  vAlpha = aAlpha;
  vec4 vp = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  gl_Position = projectionMatrix * vp;
}
`;

const FRAG = /* glsl */ `
varying vec2 vP;
varying float vAlpha;
varying float vFog;
float bayer4(vec2 p) {
  const float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  ivec2 q = ivec2(mod(p, 4.0));
  return (m[q.x + q.y * 4] + 0.5) / 16.0;
}
void main() {
  float r = length(vP);
  float a = vAlpha * (1.0 - smoothstep(0.35, 1.0, r)) * (1.0 - vFog);
  if (a < bayer4(gl_FragCoord.xy)) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

export interface Shadows {
  update(alpha: number): void;
}

export function createShadows(scene: THREE.Scene, g: Game): Shadows {
  const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const alphas = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aAlpha', alphas);
  const material = new THREE.ShaderMaterial({ uniforms: { ...worldUniforms }, vertexShader: VERT, fragmentShader: FRAG, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const batch = new THREE.InstancedMesh(geo, material, CAPACITY);
  batch.frustumCulled = false;
  batch.count = 0;
  scene.add(batch);
  const m4 = new THREE.Matrix4();
  const c = g.ecs.c;

  /** Whether a body casts one: standing in the world, not hidden, not a prop. */
  const casts = (id: Entity): boolean => {
    const model = c.model.get(id);
    return !!model && !model.startsWith('fx:') && !isAbsent(g, id) && !isUnseen(g, id) && c.brain.get(id)?.state !== 'hidden' && !c.dead.has(id);
  };

  return {
    update(alpha) {
      let n = 0;
      for (const [id, body] of c.body) {
        if (n >= CAPACITY || !casts(id)) continue;
        const tr = c.transform.get(id);
        if (!tr) continue;
        const x = tr.prev.x + (tr.pos.x - tr.prev.x) * alpha;
        const z = tr.prev.z + (tr.pos.z - tr.prev.z) * alpha;
        const hover = c.brain.get(id)?.def.params.hover ?? 0;
        const k = 1 / (1 + hover * 0.5);
        const r = body.radius * 1.7 * k;
        batch.setMatrixAt(n, m4.makeScale(r, 1, r).setPosition(x, g.world.ground(x, z) + LIFT, z));
        alphas.setX(n++, DARK * k);
      }
      batch.count = n;
      batch.instanceMatrix.needsUpdate = true;
      alphas.needsUpdate = true;
    },
  };
}
