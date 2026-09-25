/**
 * Everything that makes a boss's attacks readable (render only, spec §3E): the ground telegraphs,
 * the beams and the attack particles, updated together each frame. Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Game } from '../systems/components';
import { createAttackFx } from './attackFx';
import { createBeams } from './beams';
import { createDecals } from './decals';
import type { Particles } from './particles';
import { createTelegraphs } from './telegraphs';

export interface BossFx {
  update(alpha: number, time: number, camera: THREE.Camera): void;
}

export function createBossFx(scene: THREE.Scene, g: Game, particles: Particles): BossFx {
  const telegraphs = createTelegraphs(g, createDecals(scene));
  const beams = createBeams(scene, g);
  const fx = createAttackFx(g, particles);
  return {
    update(alpha, time, camera) {
      telegraphs.update(alpha, time);
      beams.update(alpha, time, camera);
      fx.update(alpha);
    },
  };
}
