/**
 * A short crossfade between poses (render only: poses.ts stays a pure function of the move). When a
 * figure's move or guard changes, its joints ease from the pose last drawn into the new one over a
 * moment, so a swing called off by the guard, a blow cut short by a stagger, a chain's next strike
 * or a guard raised mid-stride turns into the next pose instead of jumping to it.
 */

import * as THREE from 'three';
import type { Figure } from './figures';

const SECONDS = 0.12;
const target = new THREE.Quaternion();

export interface PoseBlend {
  /** Before posing: a new move or guard starts a crossfade from the pose last drawn. */
  watch(move: string | null, guard: boolean, time: number): void;
  /** After posing: eases the new pose in. */
  apply(time: number): void;
}

export function createPoseBlend(f: Figure): PoseBlend {
  const joints = [f.body, f.torso, f.head, f.armR, f.armL, f.elbowR, f.elbowL, f.handR, f.handL, f.legR, f.legL, f.kneeR, f.kneeL, f.footR, f.footL, ...f.skirt];
  const from = joints.map(() => new THREE.Quaternion());
  let [was, guarded] = [null as string | null, false];
  let [hip, at, last] = [f.hip, -Infinity, -Infinity];
  return {
    watch(move, guard, time) {
      if (move !== was || guard !== guarded) {
        joints.forEach((j, i) => from[i].copy(j.quaternion));
        [hip, at] = [f.body.position.y, last]; // from the frame last drawn, so the change shows at once
      }
      [was, guarded, last] = [move, guard, time];
    },
    apply(time) {
      const t = Math.max(0, (time - at) / SECONDS);
      if (t >= 1) return;
      const k = t * t * (3 - 2 * t);
      joints.forEach((j, i) => {
        target.copy(j.quaternion);
        j.quaternion.copy(from[i]).slerp(target, k); // the shorter way round, a roll's full turn included
      });
      f.body.position.y = hip + (f.body.position.y - hip) * k;
    },
  };
}
