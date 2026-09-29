import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { housePieces } from '../src/render/houseMesh';
import { elderSignGeometry, shrineGeometry } from '../src/render/signMeshes';
import { pit, well } from '../src/render/siteMeshes';
import { SHRINE } from '../src/world/shrine';
import { worldLayout } from '../src/world/placements';
import type { BoxPart } from '../src/world/dungeonParts';
import type { Prop } from '../src/world/props';

/**
 * Faces near one another and facing the same way fight for the depth buffer once the PS1's snapping
 * moves each by up to half a pixel (round 19: windows, the Elder Sign's strokes, a pit's rim and the
 * bridges flickered as the view turned). Whatever lies over another stands at least this far off it.
 */
const APART = 0.05;

/** Each triangle of a geometry: its three corners and its facing. */
function triangles(g: THREE.BufferGeometry): { p: THREE.Vector3[]; n: THREE.Vector3 }[] {
  const pos = g.getAttribute('position');
  const index = g.getIndex();
  const count = index ? index.count : pos.count;
  const at = (i: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(pos, index ? index.getX(i) : i);
  const out: { p: THREE.Vector3[]; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < count; i += 3) {
    const p = [at(i), at(i + 1), at(i + 2)];
    const n = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0]));
    if (n.lengthSq() > 1e-12) out.push({ p, n: n.normalize() });
  }
  return out;
}

describe('no face lies over another within a hair of it (round 19)', () => {
  it("a lit window's glass: nothing before it or behind it over its pane nearer than 5 cm, facing out as it does", () => {
    const house = (seed: number): Prop => ({ kind: 'house', x: 0, y: 0, z: 0, w: 4.2, d: 3.6, h: 6, yaw: 0, seed, style: seed % 2 ? 'clapboard' : 'brick' });
    let checked = 0;
    for (let seed = 0; seed < 12; seed++) {
      const pieces = housePieces(house(seed), [1, 1, 1]);
      const others = pieces.filter((p) => p.mat !== 'pane').flatMap((p) => triangles(p.geo));
      for (const glass of pieces.filter((p) => p.mat === 'pane')) {
        const box = new THREE.Box3().setFromBufferAttribute(glass.geo.getAttribute('position') as THREE.BufferAttribute);
        const size = box.getSize(new THREE.Vector3());
        const axis = size.x < size.z ? 'x' : 'z'; // across the wall
        const out = Math.sign(box.getCenter(new THREE.Vector3())[axis]);
        const front = out > 0 ? box.max[axis] : box.min[axis];
        const [u, v] = axis === 'x' ? (['z', 'y'] as const) : (['x', 'y'] as const);
        for (const t of others) {
          if (t.n[axis] * out < 0.99) continue; // facing another way
          const c = t.p[0][axis];
          if (Math.abs(c - front) >= APART) continue;
          const over = (k: 'x' | 'y' | 'z'): boolean => Math.max(...t.p.map((q) => q[k])) > box.min[k] + 0.01 && Math.min(...t.p.map((q) => q[k])) < box.max[k] - 0.01;
          expect(over(u) && over(v), `seed ${seed}: a face ${(c - front).toFixed(3)} m off the glass`).toBe(false);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("the Elder Sign's strokes stand 5 cm proud of its stone, and their glow lies just before them", () => {
    const depth = SHRINE.stone.depth;
    const zs = (g: THREE.BufferGeometry): number[] => Array.from({ length: g.getAttribute('position').count }, (_, i) => Math.abs(g.getAttribute('position').getZ(i)));
    const strokes = Math.max(...zs(shrineGeometry().glyph));
    expect(strokes - depth / 2).toBeGreaterThanOrEqual(APART);
    expect(Math.min(...zs(shrineGeometry().glow))).toBeGreaterThan(strokes);
    const arena = elderSignGeometry(1);
    const back = new THREE.Box3().setFromBufferAttribute(arena.slab.getAttribute('position') as THREE.BufferAttribute).max.z;
    expect(Math.max(...zs(arena.glyph)) - back).toBeGreaterThan(0.02); // the slab's crown is roughened: its face is nearer 0.19
  });

  it("a pit's walls stop under the floor slabs about it; a well's rim has its inner face down to the water", () => {
    const g = pit({ x: -4, y: -12, z: -4 }, { x: 4, y: 0, z: 4 }, [1, 1, 1]);
    const ys = Array.from({ length: g.getAttribute('position').count }, (_, i) => g.getAttribute('position').getY(i));
    expect(Math.max(...ys)).toBeLessThanOrEqual(-0.3 + 1e-6);
    const [, inner] = well(0, 0, 2.75, 1, [1, 1, 1]);
    const facingIn = triangles(inner).filter((t) => {
      const mid = t.p.reduce((a, q) => a.add(q), new THREE.Vector3()).divideScalar(3);
      return Math.abs(Math.hypot(mid.x, mid.z) - 2.3) < 0.15 && t.n.x * mid.x + t.n.z * mid.z < 0;
    });
    expect(facingIn.length).toBeGreaterThan(10);
  });

  it("a bridge's planks lie over the floors' edges above them, and a hidden bridge only from brink to brink", () => {
    let decks = 0;
    for (const d of worldLayout().dungeons) {
      const boxes = d.parts.filter((p): p is BoxPart => p.shape === 'box');
      const floors = boxes.filter((p) => p.look === 'floor');
      for (const deck of boxes.filter((p) => p.look === 'deck')) {
        for (const f of floors) {
          if (deck.max.x <= f.min.x || deck.min.x >= f.max.x || deck.max.z <= f.min.z || deck.min.z >= f.max.z) continue;
          expect(deck.max.y - f.max.y).toBeGreaterThanOrEqual(0.04);
          decks++;
        }
      }
    }
    expect(decks).toBeGreaterThan(0);
    for (const piece of worldLayout().pieces.filter((p) => p.name.includes('bridge') || p.boxes.some((b) => b[5] - b[4] <= 0.4))) {
      for (const [dx, dz, hw, hd, , y1] of piece.boxes) {
        const [x0, x1, z0, z1] = [piece.x + dx - hw, piece.x + dx + hw, piece.z + dz - hd, piece.z + dz + hd];
        for (const d of worldLayout().dungeons) {
          for (const f of d.parts.filter((p): p is BoxPart => p.shape === 'box' && p.look === 'floor' && Math.abs(p.max.y - y1) < 0.01)) {
            const overlap = Math.min(x1, f.max.x) - Math.max(x0, f.min.x) > 0.01 && Math.min(z1, f.max.z) - Math.max(z0, f.min.z) > 0.01;
            expect(overlap, piece.name).toBe(false);
          }
        }
      }
    }
  });
});
