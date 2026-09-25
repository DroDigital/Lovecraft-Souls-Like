/**
 * Colossal bosses as low-poly primitive assemblies (spec §2), built from their AssemblyRecipe:
 * a lathed body (or a mound of lathes, or a congeries of spheres), segment-chain tentacles that
 * sway, membranous wings, and eyes. Animated procedurally; no skeletal assets. The parts are batched
 * into one mesh per material (rigidBatch.ts), so a colossus costs a few draw calls.
 */

import * as THREE from 'three';
import { createRng } from '../core/rng';
import type { AssemblyRecipe } from '../data/schema';
import { tint } from './meshKit';
import { beyond, halo } from './eldritch';
import { batchRigid } from './rigidBatch';
import { ANOMALY, CREATURE_COLORS, scaleRgb, type Rgb } from './palette';
import { createWorldMaterial } from './worldMaterial';

export interface Assembly {
  root: THREE.Group;
  materials: THREE.ShaderMaterial[];
  /** `lash` 0..1 makes the tentacles strike; `lean` tips the body forward. */
  animate(time: number, lash: number, lean: number): void;
}

/** Textures average about half brightness; tints are doubled so a part shows its palette colour (as figures do). */
const TEXTURE_GAIN = 2;

/** Body outline, bottom to top: (radius, height) as fractions of the assembly's height. */
const PROFILE: readonly (readonly [number, number])[] = [
  [0.02, 0],
  [0.26, 0.02],
  [0.3, 0.16],
  [0.24, 0.34],
  [0.32, 0.5],
  [0.3, 0.62],
  [0.18, 0.7],
  [0.24, 0.78],
  [0.2, 0.92],
  [0.02, 1],
];

/** `wrongness` (eldritch.ts): how far the body refuses to hold its shape, by its place in the Mythos. */
export function buildAssembly(r: AssemblyRecipe, seed = 1, wrongness = 0): Assembly {
  const rng = createRng(seed);
  const pal = CREATURE_COLORS[r.palette];
  const h = r.scale;
  const root = new THREE.Group();
  const materials: THREE.ShaderMaterial[] = [];
  const mat = (emissive = 0): THREE.ShaderMaterial => {
    const m = createWorldMaterial({ texture: 'flesh', seed: seed + 3, uvScale: [3, 3], emissive, vertexColors: true, character: 'creature', eldritch: wrongness, bodyScale: h });
    materials.push(m);
    return m;
  };
  const skin = mat();
  const add = (geo: THREE.BufferGeometry, c: Rgb, m = skin, parent: THREE.Object3D = root): THREE.Mesh => {
    const mesh = new THREE.Mesh(tint(geo, scaleRgb(c, TEXTURE_GAIN)), m);
    parent.add(mesh);
    return mesh;
  };
  const lathe = (w: number, k: number): THREE.BufferGeometry =>
    new THREE.LatheGeometry(PROFILE.map(([x, y]) => new THREE.Vector2(x * h * w, y * h * k)), 9);

  const body = new THREE.Group();
  root.add(body);
  if (r.body === 'lathe') add(lathe(1, 1), pal.mid, skin, body);
  if (r.body === 'mound') {
    for (let i = 0; i < 6; i++) {
      const lump = add(lathe(0.9 + rng() * 0.6, 0.35 + rng() * 0.3), i % 2 ? pal.light : pal.mid, skin, body);
      lump.position.set((rng() - 0.5) * h * 0.5, 0, (rng() - 0.5) * h * 0.5);
    }
  }
  const spheres: THREE.Mesh[] = [];
  if (r.body === 'spheres') {
    const glow = mat(0.8);
    const tints = [ANOMALY[r.glow ?? 'green'], ANOMALY.purple, pal.light];
    for (let i = 0; i < (r.spheres ?? 12); i++) {
      const s = add(new THREE.IcosahedronGeometry(h * (0.08 + rng() * 0.1), 1), tints[i % tints.length], glow, body);
      s.position.set((rng() - 0.5) * h * 0.7, h * (0.25 + rng() * 0.6), (rng() - 0.5) * h * 0.7);
      s.userData.baseY = s.position.y;
      spheres.push(s);
    }
  }

  const eyeMat = mat(1);
  const eyeColor = r.glow ? ANOMALY[r.glow] : scaleRgb(pal.light, 1.1);
  for (let i = 0; i < (r.eyes ?? 0); i++) {
    const e = add(new THREE.IcosahedronGeometry(h * 0.025, 0), eyeColor, eyeMat, body);
    const a = (rng() - 0.5) * 1.6;
    const y = r.body === 'mound' ? 0.2 + rng() * 0.25 : 0.72 + rng() * 0.18;
    e.position.set(Math.sin(a) * h * 0.22, h * y, Math.cos(a) * h * 0.22);
  }

  const wings: THREE.Group[] = [];
  for (let i = 0; i < (r.wings ?? 0); i++) {
    const side = i % 2 ? 1 : -1;
    const pivot = new THREE.Group();
    pivot.position.set(side * h * 0.18, h * 0.66, -h * 0.12);
    const shape = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * h * 0.55, h * 0.3, -h * 0.1),
      new THREE.Vector3(side * h * 0.4, -h * 0.25, -h * 0.05),
    ]);
    shape.setIndex([0, 1, 2, 0, 2, 1]);
    shape.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 1, 1, 0], 2));
    shape.computeVertexNormals();
    add(shape, pal.dark, skin, pivot);
    root.add(pivot);
    wings.push(pivot);
  }

  const chains: { base: THREE.Group; joints: THREE.Group[]; phase: number }[] = [];
  const n = r.tentacles ?? 0;
  for (let i = 0; i < n; i++) {
    const a = r.body === 'mound' ? (i / n) * Math.PI * 2 : ((i / Math.max(1, n - 1)) - 0.5) * 1.6;
    const base = new THREE.Group();
    const y = r.body === 'mound' ? h * 0.12 : h * (0.6 + 0.08 * Math.cos(i));
    base.position.set(Math.sin(a) * h * 0.2, y, Math.cos(a) * h * 0.2);
    base.rotation.set(r.body === 'mound' ? 1.2 : 2.3, a, 0, 'YXZ');
    root.add(base);
    const joints: THREE.Group[] = [];
    let parent: THREE.Object3D = base;
    const seg = (h * (r.body === 'mound' ? 0.5 : 0.55)) / 6;
    for (let k = 0; k < 6; k++) {
      const joint = new THREE.Group();
      joint.position.y = k === 0 ? 0 : seg;
      parent.add(joint);
      const rad = h * 0.028 * (1 - k / 7);
      add(new THREE.CylinderGeometry(rad * 0.75, rad, seg, 6).translate(0, seg / 2, 0), k % 2 ? pal.mid : pal.dark, skin, joint);
      joints.push(joint);
      parent = joint;
    }
    chains.push({ base, joints, phase: rng() * Math.PI * 2 });
  }

  const rings: THREE.Group[] = [];
  if (beyond(wrongness)) { // an outer god's shards, lit like its eyes (so no draw of their own)
    const ring = halo(h, rng, TEXTURE_GAIN);
    ring.rings.forEach((g, i) => g.add(new THREE.Mesh(ring.geos[i], eyeMat)));
    root.add(ring.root);
    rings.push(...ring.rings);
  }

  const batch = batchRigid(root); // one draw per material, not one per segment
  return {
    root,
    materials,
    animate(time, lash, lean) {
      body.scale.y = 1 + 0.015 * Math.sin(time * 0.9);
      root.rotation.x = lean * 0.25;
      for (const w of wings) w.rotation.z = Math.sin(time * 0.7) * 0.25 * Math.sign(w.position.x);
      for (const [i, s] of spheres.entries()) s.position.y = (s.userData.baseY as number) + Math.sin(time * 0.8 + i) * h * 0.02;
      for (const g of rings) g.rotation.y = time * (g.userData.speed as number);
      for (const c of chains) {
        c.joints.forEach((j, k) => {
          const sway = Math.sin(time * 1.3 + c.phase + k * 0.8) * (0.18 + lash * 0.4);
          j.rotation.set(sway - lash * 0.25, 0, Math.cos(time * 0.9 + c.phase + k) * 0.15);
        });
      }
      batch.update();
    },
  };
}
