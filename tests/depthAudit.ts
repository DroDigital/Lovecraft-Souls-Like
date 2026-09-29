import * as THREE from 'three';

/**
 * The faces of a geometry, for the view audits (rayAudit.ts, objectAudit.ts): two faces facing the
 * same way and lying near one another fight for the depth buffer once the PS1's snapping has moved
 * each by up to half a pixel (round 6's stair, round 19's windows and pit rims, round 21's brick
 * walls): whichever the snapping puts in front shows, in wedges and streaks that change as the view
 * turns.
 */

export interface Face {
  p: THREE.Vector3[]; // the three corners
  n: THREE.Vector3;
  area: number;
  tag: string; // what it belongs to
  tex: string; // its texture (or whatever else tells surfaces apart)
  luma: number; // how light its vertex colours are
}

/** Each triangle of `g` (moved by `m`), with its facing. */
export function faces(g: THREE.BufferGeometry, tag: string, tex = '', m?: THREE.Matrix4): Face[] {
  const pos = g.getAttribute('position');
  const col = g.getAttribute('color');
  const index = g.getIndex();
  const count = index ? index.count : pos.count;
  const at = (i: number): THREE.Vector3 => {
    const v = new THREE.Vector3().fromBufferAttribute(pos, index ? index.getX(i) : i);
    return m ? v.applyMatrix4(m) : v;
  };
  const out: Face[] = [];
  for (let i = 0; i + 2 < count; i += 3) {
    const p = [at(i), at(i + 1), at(i + 2)];
    const n = new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0]));
    const area = n.length() / 2;
    const luma = col ? [0, 1, 2].reduce((s, k) => s + col.getX(index ? index.getX(i + k) : i + k) + col.getY(index ? index.getX(i + k) : i + k) + col.getZ(index ? index.getX(i + k) : i + k), 0) / 9 : 1;
    if (area > 1e-6) out.push({ p, n: n.normalize(), area, tag, tex, luma });
  }
  return out;
}
