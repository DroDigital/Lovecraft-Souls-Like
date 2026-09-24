/**
 * Rigid batching (Phase 6 performance pass, spec §2: at most 150 draw calls). A jointed hierarchy
 * of meshes, such as a colossus's tentacle chains, is drawn as one mesh per material. Every part stays
 * in the hierarchy as an undrawn joint, and `update` moves its vertices to where the joints now hold
 * it, relative to the root: rigid skinning on the CPU, no skeletal assets.
 */

import * as THREE from 'three';

interface Part {
  node: THREE.Object3D;
  pos: ArrayLike<number>; // rest positions, in the part's own space
  nor: ArrayLike<number> | null;
  offset: number; // first vertex in the batch
}

interface Batch {
  mesh: THREE.Mesh;
  parts: Part[];
}

export interface RigidBatch {
  readonly meshes: readonly THREE.Mesh[];
  /** Follows the joints: call after posing them. */
  update(): void;
}

const ATTRIBUTES = ['position', 'normal', 'uv', 'color'] as const;

/** Merges one material's parts: every attribute they all carry, and their indices. */
function merge(meshes: THREE.Mesh[]): THREE.BufferGeometry {
  const geos = meshes.map((m) => m.geometry);
  const names = ATTRIBUTES.filter((n) => geos.every((g) => g.getAttribute(n)));
  const out = new THREE.BufferGeometry();
  const total = geos.reduce((n, g) => n + g.getAttribute('position').count, 0);
  for (const n of names) {
    const size = geos[0].getAttribute(n).itemSize;
    const data = new Float32Array(total * size);
    let at = 0;
    for (const g of geos) {
      const a = g.getAttribute(n);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) data[(at + i) * size + k] = a.getComponent(i, k);
      at += a.count;
    }
    out.setAttribute(n, new THREE.BufferAttribute(data, size).setUsage(n === 'position' || n === 'normal' ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage));
  }
  const index: number[] = [];
  let base = 0;
  for (const g of geos) {
    const count = g.getAttribute('position').count;
    if (g.index) for (let i = 0; i < g.index.count; i++) index.push(base + g.index.getX(i));
    else for (let i = 0; i < count; i++) index.push(base + i);
    base += count;
  }
  out.setIndex(index);
  return out;
}

/** Batches every visible mesh under `root` by material; the parts stay as undrawn joints. */
export function batchRigid(root: THREE.Object3D): RigidBatch {
  const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible || Array.isArray(o.material)) return;
    const list = byMaterial.get(o.material);
    if (list) list.push(o);
    else byMaterial.set(o.material, [o]);
  });
  const batches: Batch[] = [];
  for (const [material, meshes] of byMaterial) {
    const mesh = new THREE.Mesh(merge(meshes), material);
    let offset = 0;
    const parts = meshes.map((m) => {
      const part = { node: m, pos: m.geometry.getAttribute('position').array, nor: m.geometry.getAttribute('normal')?.array ?? null, offset };
      offset += m.geometry.getAttribute('position').count;
      m.visible = false; // a joint now; the batch draws it
      return part;
    });
    batches.push({ mesh, parts });
    root.add(mesh);
  }
  const inv = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const n = new THREE.Matrix3();

  const update = (): void => {
    root.updateMatrixWorld(true);
    inv.copy(root.matrixWorld).invert();
    for (const { mesh, parts } of batches) {
      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const nor = mesh.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
      for (const p of parts) {
        const e = m.multiplyMatrices(inv, p.node.matrixWorld).elements;
        const count = p.pos.length / 3;
        for (let i = 0, o = p.offset * 3; i < count; i++, o += 3) {
          const x = p.pos[i * 3];
          const y = p.pos[i * 3 + 1];
          const z = p.pos[i * 3 + 2];
          pos.array[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
          pos.array[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          pos.array[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
        if (!nor || !p.nor) continue;
        const k = n.getNormalMatrix(m).elements;
        for (let i = 0, o = p.offset * 3; i < count; i++, o += 3) {
          const x = p.nor[i * 3];
          const y = p.nor[i * 3 + 1];
          const z = p.nor[i * 3 + 2];
          const a = k[0] * x + k[3] * y + k[6] * z;
          const b = k[1] * x + k[4] * y + k[7] * z;
          const c = k[2] * x + k[5] * y + k[8] * z;
          const len = Math.sqrt(a * a + b * b + c * c) || 1;
          nor.array[o] = a / len;
          nor.array[o + 1] = b / len;
          nor.array[o + 2] = c / len;
        }
      }
      pos.needsUpdate = true;
      if (nor) nor.needsUpdate = true;
    }
  };
  update();
  for (const { mesh } of batches) {
    // Bounds of the rest pose, grown to hold the joints' sway.
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.boundingSphere!.radius *= 1.3;
  }
  return { meshes: batches.map((b) => b.mesh), update };
}
