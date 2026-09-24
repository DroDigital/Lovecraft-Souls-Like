/** Phase 6 performance pass: the spec §2 budgets that can be checked without a GPU. */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyOverride, ENTITIES } from '../src/data/registry';
import { FX, RENDER, WORLD } from '../src/data/tuning';
import { buildAssembly } from '../src/render/assemblies';
import { batchRigid } from '../src/render/rigidBatch';
import { travel } from '../src/systems/checkpoints';
import { createWorldGame } from '../src/systems/game';
import { worldLayout } from '../src/world/placements';
import { run } from './worldHelpers';

const draws = (root: THREE.Object3D): number => {
  let n = 0;
  root.traverseVisible((o) => void (o instanceof THREE.Mesh && n++));
  return n;
};

describe('draw calls (at most 150 a frame)', () => {
  it('every colossus draws in at most three calls, however many segments it has', () => {
    const looks = ENTITIES.flatMap((d) => [d, ...[d.eldritchVariant, d.bossVariant].filter((o) => o !== undefined).map((o) => applyOverride(d, o))]);
    const colossi = looks.filter((d) => d.assembly);
    expect(colossi.length).toBeGreaterThanOrEqual(9);
    for (const d of colossi) {
      const a = buildAssembly(d.assembly!, 7);
      a.animate(1.2, 0.8, 0.3);
      expect(draws(a.root), d.id).toBeLessThanOrEqual(3);
    }
  });

  it('a batch puts every vertex where its joint holds it', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    const joint = new THREE.Group();
    joint.position.set(0, 2, 0);
    root.add(joint, new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2).translate(0, 0.5, 0), material);
    joint.add(arm);
    root.position.set(5, 0, -3); // the root's own placement is the batch mesh's, not baked in
    const batch = batchRigid(root);
    expect(batch.meshes).toHaveLength(1);
    expect(draws(root)).toBe(1);
    joint.rotation.z = Math.PI / 2;
    batch.update();
    const pos = batch.meshes[0].geometry.getAttribute('position');
    const offset = 0; // depth first: the arm on its joint comes before the body box
    const expected = new THREE.Vector3();
    const src = arm.geometry.getAttribute('position');
    for (let i = 0; i < src.count; i++) {
      expected.fromBufferAttribute(src, i).applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).add(new THREE.Vector3(0, 2, 0));
      expect(pos.getX(offset + i)).toBeCloseTo(expected.x, 5);
      expect(pos.getY(offset + i)).toBeCloseTo(expected.y, 5);
      expect(pos.getZ(offset + i)).toBeCloseTo(expected.z, 5);
    }
  });
});

describe('AI and view distance', () => {
  it('never more than 60 creatures awake, at any Elder Sign in the world', () => {
    const g = createWorldGame();
    for (const s of worldLayout().signs) {
      g.overworld!.discovered.add(s.id);
      travel(g, s.id);
      run(g, 5);
      expect(g.overworld!.alive.size, s.id).toBeLessThanOrEqual(WORLD.maxActive);
    }
  });

  it('sees about 80 m: the fog closes before the far plane, which lies within the streamed chunks', () => {
    expect(FX.fogFar[0]).toBeGreaterThanOrEqual(75);
    expect(FX.fogFar[0]).toBeLessThanOrEqual(RENDER.far);
    expect(RENDER.far).toBeLessThanOrEqual(WORLD.chunk * (WORLD.load + 0.5));
  });
});
