import * as THREE from 'three';
import { faces, type Face } from './depthAudit';
import { FaceGrid, judge, pos } from './rayAudit';

/**
 * The view-ray audit (rayAudit.ts) for a thing that stands alone: a prop, a house, a shrine. It is
 * seen from about it, from ring after ring of spots at a man's height and above, each ray aimed at a
 * point within it; the ground (y = 0 in its own frame) hides what lies below.
 */

export interface Part {
  tag: string; // what it is (`kind`, or `house/roof`)
  tex: string; // its material
  geo: THREE.BufferGeometry;
}

export interface ObjectFinding {
  kind: 'back' | 'fight';
  key: string;
  at: string;
}

/** A fixed scatter in [0, 1): the same rays every run. */
const hash = (i: number): number => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** What the eye meets wrongly of a thing seen from all about, by kind of find (one line of each, counted). */
export function auditObject(parts: readonly Part[], { rings = [1.3, 2.4], azimuths = 9, targets = 90 } = {}): ObjectFinding[] {
  const all: Face[] = parts.flatMap((p, i) => faces(p.geo, `${p.tex}:${p.tag}@part#${i}`, p.tex));
  if (!all.length) return [];
  const grid = new FaceGrid(all);
  const box = grid.bounds;
  const [c, size] = [box.getCenter(new THREE.Vector3()), box.getSize(new THREE.Vector3())];
  const reach = size.length();
  const goal: THREE.Vector3[] = [];
  for (let i = 0; i < targets; i++) goal.push(new THREE.Vector3(box.min.x + hash(i * 3) * size.x, Math.max(0.05, box.min.y) + hash(i * 3 + 1) * (box.max.y - Math.max(0.05, box.min.y)), box.min.z + hash(i * 3 + 2) * size.z));
  const out = new Map<string, ObjectFinding & { n: number }>();
  const heights = [0.6, 1.7, size.y * 0.5 + 0.5, size.y * 1.3 + 1];
  for (const ring of rings) {
    for (let a = 0; a < azimuths; a++) {
      for (const y of heights) {
        const az = ((a + 0.31) / azimuths) * Math.PI * 2;
        const r = reach * ring + 3;
        const from = new THREE.Vector3(c.x + Math.sin(az) * r, y, c.z + Math.cos(az) * r);
        for (const to of goal) {
          const dir = to.clone().sub(from).normalize();
          const ground = dir.y < 0 ? -from.y / dir.y : Infinity; // where the ray meets the ground: what lies past is under it
          const hits = grid.cast(from, dir, Math.min(ground, reach * ring * 3 + 10), 3).filter((h) => h.t < ground - 1e-3);
          const wrong = judge(hits, from, dir);
          if (!wrong) continue;
          const k = `${wrong.kind} ${wrong.key}`;
          const e = out.get(k);
          if (e) e.n++;
          else out.set(k, { kind: wrong.kind, key: wrong.key, at: `${wrong.at} (seen from ${pos(from)})`, n: 1 });
        }
      }
    }
  }
  return [...out.values()].map(({ n, ...f }) => ({ ...f, key: `${f.key} (${n} rays)` }));
}
