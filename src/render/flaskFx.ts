/**
 * A flask of lamp oil, seen (round 29: it flew as the same spinning shard as a horror's bolt and
 * landed as a crawling disc): a bottle of brown glass tumbling through the air with its rag alight,
 * trailing embers and smoke; where it lands a flash, a ball of fire thrown up, a ring of flame run
 * out along the ground, glass flung off and a puff of smoke; and while the oil burns tongues of
 * flame, embers and smoke rise off it, a glow breathes over it, and all of it dies down as the
 * oil is spent. Render only: it reads the bolts and fire pools of the simulation.
 */

import * as THREE from 'three';
import type { Entity } from '../core/ecs';
import { FLASK } from '../data/fxTuning';
import type { Game } from '../systems/components';
import { createHalos } from './halos';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, tint } from './meshKit';
import type { Particles } from './particles';
import { createWorldMaterial } from './worldMaterial';

const rgb = (c: readonly number[], k = 1): [number, number, number] => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** A bottle: a belly, a shoulder, a neck, and a stopper of rag. */
const bottle = (): THREE.BufferGeometry => {
  const glass = rgb(FLASK.colour.glass);
  return mergeGeometries([box(0.13, 0.17, 0.13, 0, 0, 0, glass), box(0.1, 0.05, 0.1, 0, 0.11, 0, glass), box(0.05, 0.1, 0.05, 0, 0.19, 0, glass), box(0.07, 0.05, 0.07, 0, 0.26, 0, [0.72, 0.62, 0.45])]);
};

export interface FlaskFx {
  update(alpha: number, time: number): void;
}

export function createFlaskFx(scene: THREE.Scene, g: Game, particles: Particles): FlaskFx {
  const flasks = new THREE.InstancedMesh(bottle(), createWorldMaterial({ texture: 'water', emissive: 0.45, vertexColors: true }), FLASK.capacity);
  const rags = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.11, 0), createWorldMaterial({ texture: 'cloth', emissive: 1, vertexColors: true }), FLASK.capacity);
  tint(rags.geometry, rgb(FLASK.colour.core));
  for (const m of [flasks, rags]) {
    m.frustumCulled = false;
    scene.add(m);
  }
  const halos = createHalos(24, 0.5);
  scene.add(halos.mesh);
  const seen = new Map<Entity, { life0: number }>(); // fire pools already burst
  const flashes: { x: number; y: number; z: number; r: number; t0: number }[] = [];
  let last = -1;
  let seed = 13;
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spread = (k: number): number => (rand() - 0.5) * 2 * k;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const [at, size, up] = [new THREE.Vector3(), new THREE.Vector3(1, 1, 1), new THREE.Vector3(0, 0.26, 0)];

  const flame = (x: number, y: number, z: number, vx: number, vy: number, vz: number, s: number, life: number): void =>
    particles.spawn({ x, y, z, vx, vy, vz, life, size: s, grow: 0.35, color: mix(FLASK.colour.flame, FLASK.colour.core, rand() * rand()), alpha: 0.95, glow: true, drag: 1.2 });
  const smoke = (x: number, y: number, z: number, s: number, life: number): void =>
    particles.spawn({ x, y, z, vx: spread(0.25), vy: 0.7 + rand() * 0.6, vz: spread(0.25), life, size: s, grow: 3, color: rgb(FLASK.colour.smoke), alpha: 0.28, drag: 0.5 });

  /** Where a flask has landed: the burst. */
  function burst(x: number, y: number, z: number, r: number, time: number): void {
    const b = FLASK.burst;
    flashes.push({ x, y: y + 0.4, z, r: r * 2.6, t0: time });
    for (let i = 0; i < b.fire; i++) {
      const a = rand() * Math.PI * 2;
      const s = 1.2 + rand() * 3.4;
      flame(x, y + 0.2, z, Math.cos(a) * s * 0.7, 2.2 + rand() * 3.4, Math.sin(a) * s * 0.7, 0.9 + rand() * 0.8, 0.5 + rand() * 0.45);
    }
    for (let i = 0; i < b.ring; i++) {
      const a = (i / b.ring) * Math.PI * 2 + rand() * 0.2;
      const s = (r * 1.15) / 0.5;
      flame(x + Math.cos(a) * 0.3, y + 0.15, z + Math.sin(a) * 0.3, Math.cos(a) * s, 0.25 + rand() * 0.4, Math.sin(a) * s, 0.75 + rand() * 0.4, 0.55);
    }
    for (let i = 0; i < b.shards; i++) {
      const a = rand() * Math.PI * 2;
      const s = 2.5 + rand() * 5;
      particles.spawn({ x, y: y + 0.25, z, vx: Math.cos(a) * s, vy: 3 + rand() * 4.5, vz: Math.sin(a) * s, life: 0.7 + rand() * 0.4, size: 0.07 + rand() * 0.06, grow: 1, color: rgb(FLASK.colour.glass, 1.4), alpha: 1, gravity: 14, drag: 0.2 });
    }
    for (let i = 0; i < b.smoke; i++) smoke(x + spread(r * 0.4), y + 0.4, z + spread(r * 0.4), 0.4 + rand() * 0.3, 1 + rand() * 0.8);
  }

  return {
    update(alpha, time) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const c = g.ecs.c;
      halos.begin();
      // Flasks in flight: the bottle, its rag, and what it leaves behind.
      let n = 0;
      for (const [id, b] of c.bolt) {
        const tr = c.transform.get(id);
        if (!b.pool?.fire || b.faction !== 'player' || !tr || n >= FLASK.capacity) continue;
        at.set(tr.prev.x + (tr.pos.x - tr.prev.x) * alpha, tr.prev.y + (tr.pos.y - tr.prev.y) * alpha, tr.prev.z + (tr.pos.z - tr.prev.z) * alpha);
        axis.set(b.vel.z, 0.2, -b.vel.x).normalize(); // tumbles end over end along its flight
        q.setFromAxisAngle(axis, time * 13 + id);
        flasks.setMatrixAt(n, m4.compose(at, q, size));
        const rag = up.clone().applyQuaternion(q).add(at);
        rags.setMatrixAt(n, m4.compose(rag, q, size.setScalar(0.8 + 0.4 * Math.sin(time * 40 + id))));
        size.setScalar(1);
        n++;
        halos.put(rag.x, rag.y, rag.z, 1.1 + 0.2 * Math.sin(time * 31 + id), FLASK.colour.flame, 0.7);
        for (let k = dt * FLASK.trail.embers; k > 0; k--) if (k >= 1 || rand() < k) particles.spawn({ x: rag.x + spread(0.05), y: rag.y + spread(0.05), z: rag.z + spread(0.05), vx: -b.vel.x * 0.1 + spread(0.4), vy: 0.2 + rand() * 0.6, vz: -b.vel.z * 0.1 + spread(0.4), life: 0.35 + rand() * 0.3, size: 0.15 + rand() * 0.08, grow: 0.3, color: mix(FLASK.colour.flame, FLASK.colour.core, rand()), alpha: 1, glow: true, drag: 2 });
        for (let k = dt * FLASK.trail.smoke; k > 0; k--) if (k >= 1 || rand() < k) smoke(rag.x, rag.y, rag.z, 0.14 + rand() * 0.1, 0.6 + rand() * 0.4);
      }
      for (const m of [flasks, rags]) {
        m.count = n;
        m.instanceMatrix.needsUpdate = true;
      }
      // Fire pools: the burst when one begins, then its flames while it burns.
      for (const [id, h] of c.hazard) {
        if (!h.fire) continue;
        const p = c.transform.get(id)?.pos;
        if (!p) continue;
        let s = seen.get(id);
        if (!s) {
          seen.set(id, (s = { life0: Math.max(1, h.life) }));
          burst(p.x, p.y, p.z, h.radius, time);
        }
        const dying = Math.min(1, h.life / (s.life0 * FLASK.fire.fade)); // 1 while it burns fully, falling to 0 as the oil is spent
        const area = h.radius * h.radius;
        for (let k = dt * FLASK.fire.tongues * area * dying; k > 0; k--) {
          if (k < 1 && rand() >= k) continue;
          const [a, d] = [rand() * Math.PI * 2, Math.sqrt(rand()) * h.radius * 0.95];
          const x = p.x + Math.cos(a) * d;
          const z = p.z + Math.sin(a) * d;
          flame(x, p.y + 0.1, z, spread(0.15), 1.2 + rand() * 1.3 - d * 0.1, spread(0.15), (0.75 + rand() * 0.7) * (1 - 0.4 * (d / h.radius)), 0.5 + rand() * 0.4);
        }
        for (let k = dt * FLASK.fire.embers * area * dying; k > 0; k--) if (k >= 1 || rand() < k) particles.spawn({ x: p.x + spread(h.radius * 0.8), y: p.y + 0.3, z: p.z + spread(h.radius * 0.8), vx: spread(0.5), vy: 1.6 + rand() * 1.8, vz: spread(0.5), life: 0.8 + rand() * 0.7, size: 0.1, grow: 0.3, color: rgb(FLASK.colour.core), alpha: 1, glow: true, drag: 0.8 });
        for (let k = dt * FLASK.fire.smoke * area; k > 0; k--) if (k >= 1 || rand() < k) smoke(p.x + spread(h.radius * 0.6), p.y + 0.8, p.z + spread(h.radius * 0.6), 0.3, 1.1 + rand() * 0.6);
        const flicker = 0.85 + 0.15 * Math.sin(time * 17 + id) * Math.sin(time * 7.3 + id * 2);
        halos.put(p.x, p.y + 0.6, p.z, h.radius * FLASK.fire.glow * flicker, FLASK.colour.flame, 0.6 * dying * flicker);
      }
      for (const id of seen.keys()) if (!c.hazard.has(id)) seen.delete(id);
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const k = (time - f.t0) / FLASK.burst.flash;
        if (k >= 1) flashes.splice(i, 1);
        else halos.put(f.x, f.y, f.z, f.r * (0.6 + 0.6 * k), FLASK.colour.core, 1.7 * (1 - k) * (1 - k));
      }
      halos.end();
    },
  };
}
