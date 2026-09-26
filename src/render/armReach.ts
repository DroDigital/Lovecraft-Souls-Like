/**
 * Two-bone reach for an arm (playtest round 13, the heavy blows): the hand is put at a point in the
 * torso's frame with the blade pointing a given way, the elbow bending toward a pole. Shoulder,
 * elbow and wrist are set as quaternions, so a sweep can be written as where the hand goes rather
 * than as angles on each joint.
 */

import * as THREE from 'three';

export type Vec = readonly [number, number, number];

const S = new THREE.Vector3();
const T = new THREE.Vector3();
const P = new THREE.Vector3();
const E = new THREE.Vector3();
const toE = new THREE.Vector3();
const toT = new THREE.Vector3();
const bx = new THREE.Vector3();
const by = new THREE.Vector3();
const bz = new THREE.Vector3();
const M = new THREE.Matrix4();
const qArm = new THREE.Quaternion();
const qElbow = new THREE.Quaternion();
const qWant = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);

/** A frame whose −y is `down` and whose +z leans toward `ahead`. */
function frameOf(down: THREE.Vector3, ahead: THREE.Vector3, out: THREE.Quaternion): THREE.Quaternion {
  by.copy(down).normalize().negate();
  bz.copy(ahead).addScaledVector(by, -ahead.dot(by));
  if (bz.lengthSq() < 1e-8) bz.set(0, 0, 1).addScaledVector(by, -by.z);
  bz.normalize();
  bx.crossVectors(by, bz);
  M.makeBasis(bx, by, bz);
  return out.setFromRotationMatrix(M);
}

export interface Limb {
  arm: THREE.Object3D; // at the shoulder, in the torso's frame
  elbow: THREE.Object3D; // `upper` below the shoulder
  hand: THREE.Object3D; // `fore` below the elbow
  upper: number;
  fore: number;
}

/**
 * Reaches `limb` for `hand` (torso frame), the elbow toward `pole`; the hand's −y (the blade) along
 * `blade`, its +z (the edge) as near `edge` as it can be.
 */
export function reach(limb: Limb, hand: Vec, blade: Vec, pole: Vec, edge: Vec = [0, 1, 0]): void {
  const { upper: a, fore: b } = limb;
  S.copy(limb.arm.position);
  T.set(...hand).sub(S);
  const d = Math.min(Math.max(T.length(), Math.abs(a - b) + 1e-3), (a + b) * 0.995);
  T.setLength(d);
  P.set(...pole);
  const along = T.clone().normalize();
  P.addScaledVector(along, -P.dot(along));
  if (P.lengthSq() < 1e-8) P.set(0, -1, 0).addScaledVector(along, -along.y);
  P.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  E.copy(along).multiplyScalar(cosA * a).addScaledVector(P, sinA * a); // the elbow, from the shoulder
  toE.copy(E);
  toT.copy(T).sub(E);
  frameOf(toE, toT, qArm); // the upper arm down to the elbow; the forearm folds toward its +z
  limb.arm.quaternion.copy(qArm);
  const bend = toE.angleTo(toT);
  qElbow.setFromAxisAngle(X, -bend);
  limb.elbow.quaternion.copy(qElbow);
  frameOf(new THREE.Vector3(...blade), new THREE.Vector3(...edge), qWant); // the hand as wanted, in the torso's frame
  limb.hand.quaternion.copy(qArm.multiply(qElbow).invert().multiply(qWant));
}
