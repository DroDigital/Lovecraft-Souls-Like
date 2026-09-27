/**
 * The open world's own life (playtest round 18: nothing in it moved of itself), drawn over the
 * simulation: its small creatures (fauna.ts). Made and updated in one place, so the frame loop
 * (main.ts) holds one line for it. Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Game } from '../systems/components';
import type { GameAudio } from './audio/gameAudio';
import { createFauna, type Fauna } from './fauna';

export interface WorldLife {
  /** Each drawn frame, before the scene is drawn; `hidden`: under a dungeon's roof, or outside the open world. */
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
  readonly fauna: Fauna;
}

export function createWorldLife(scene: THREE.Scene, g: Game, audio: GameAudio): WorldLife {
  const fauna = createFauna(scene, g, (voice, at) => audio.cry(voice, at));
  return {
    fauna,
    update(camera, time, hidden) {
      fauna.update(camera, time, hidden);
    },
  };
}
