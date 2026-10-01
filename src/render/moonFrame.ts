/**
 * The frame of the moon's shadow map (round 34): where the orthographic camera that draws it stands and
 * how it is turned, for a moon in direction `toMoon` and a map over `focus`. Its position is held to the
 * map's own texel grid across the moon's rays (not to the world's), so as the investigator walks the
 * shadows slide with the ground and do not shimmer. Pure.
 */

import * as THREE from 'three';

export interface MoonFrame {
  position: THREE.Vector3;
  up: THREE.Vector3; // the map's y
  right: THREE.Vector3; // the map's x
}

const SKY = new THREE.Vector3(0, 1, 0);

/** `toMoon` is unit; the camera stands `depth / 2` toward the moon from `focus`, its x and y snapped to `texel`. */
export function moonFrame(toMoon: THREE.Vector3, focus: THREE.Vector3, texel: number, depth: number): MoonFrame {
  const ref = Math.abs(toMoon.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : SKY; // a moon straight overhead has no "up" to hold the map by
  const right = new THREE.Vector3().crossVectors(ref, toMoon).normalize();
  const up = new THREE.Vector3().crossVectors(toMoon, right).normalize();
  const u = Math.round(focus.dot(right) / texel) * texel;
  const v = Math.round(focus.dot(up) / texel) * texel;
  const position = right.clone().multiplyScalar(u).addScaledVector(up, v).addScaledVector(toMoon, focus.dot(toMoon) + depth / 2);
  return { position, up, right };
}
