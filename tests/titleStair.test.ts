import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { slopeAt, STAIR, titleStair, treadAt } from '../src/world/titleStair';

describe("the title's stair (world/titleStair.ts)", () => {
  it('repeats every eight steps, so the walk down it loops without a seam', () => {
    const loop = STAIR.period * STAIR.run;
    const drop = STAIR.period * STAIR.rise;
    for (let z = -1; z > -1 - loop; z -= 0.13) {
      expect(treadAt(z - loop)).toBeCloseTo(treadAt(z) - drop);
      expect(slopeAt(z - loop)).toBeCloseTo(slopeAt(z) - drop);
    }
  });

  it("keeps a walker's hips within a step of the treads under their feet", () => {
    for (let z = -0.5; z > -20; z -= 0.07) expect(Math.abs(treadAt(z) - slopeAt(z))).toBeLessThanOrEqual(STAIR.rise / 2 + 1e-9);
  });

  it('builds treads, walls, pilasters and sconce flames', () => {
    expect(titleStair().children).toHaveLength(4);
  });

  it('lays no tread top over another: coplanar overlaps flicker once vertex snapping moves their corners (playtest round 6)', () => {
    const g = (titleStair().children[0] as THREE.Mesh).geometry;
    const [pos, index] = [g.getAttribute('position'), g.index!];
    const v = (i: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(pos, index.getX(i));
    const tops: { y: number; x: [number, number]; z: [number, number] }[] = [];
    for (let f = 0; f < index.count; f += 6) { // a box face: two triangles
      const [a, b, c] = [v(f), v(f + 1), v(f + 2)];
      if (new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize().y < 0.99) continue;
      const face = [0, 1, 2, 3, 4, 5].map((k) => v(f + k));
      const span = (k: 'x' | 'z'): [number, number] => [Math.min(...face.map((p) => p[k])), Math.max(...face.map((p) => p[k]))];
      tops.push({ y: a.y, x: span('x'), z: span('z') });
    }
    expect(tops.length).toBeGreaterThan(2 * (STAIR.to - STAIR.from) - 1); // a tread and its nosing a step
    const cover = (p: [number, number], q: [number, number]): number => Math.max(0, Math.min(p[1], q[1]) - Math.max(p[0], q[0]));
    for (let i = 0; i < tops.length; i++) {
      for (let j = i + 1; j < tops.length; j++) {
        const [p, q] = [tops[i], tops[j]];
        if (Math.abs(p.y - q.y) < 1e-4) expect(cover(p.x, q.x) * cover(p.z, q.z), `tops at ${p.y.toFixed(2)}`).toBeLessThan(1e-6);
      }
    }
  });
});
