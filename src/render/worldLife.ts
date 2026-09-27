/**
 * The open world's own life (playtest round 18: nothing in it moved of itself), drawn over the
 * simulation: its small creatures (fauna.ts), what crosses its sky (skyLife.ts), the lightning where
 * storms roll (lightning.ts), and the glimmer of things worth finding (glints.ts). Made and updated
 * in one place, so the frame loop (main.ts) holds a line for it. Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Game } from '../systems/components';
import type { GameAudio } from './audio/gameAudio';
import { createFauna, type Fauna } from './fauna';
import { createGlints } from './glints';
import { createLightning } from './lightning';
import type { PostPass } from './postPass';
import { createSkyLife } from './skyLife';
import type { SpriteAtlas } from './sprites/atlas';

export interface WorldLife {
  /** Each drawn frame, once the night's light is set; `enclosed`: under a dungeon's roof. */
  update(camera: THREE.Camera, time: number, enclosed: boolean): void;
  readonly fauna: Fauna;
}

export interface LifeParts {
  sky: THREE.Mesh; // the sky dome, whose haze the lightning brightens
  post: PostPass; // the post pass, whose mist it lights
  sheet: { atlas: SpriteAtlas; texture: THREE.Texture }; // the creatures' sprites, for the great winged things
}

export function createWorldLife(scene: THREE.Scene, g: Game, audio: GameAudio, parts: LifeParts): WorldLife {
  const fauna = createFauna(scene, g, (voice, at) => audio.cry(voice, at));
  const sky = createSkyLife(scene, g, fauna, parts.sheet, (voice, at) => audio.cry(voice, at, 1.4));
  const lightning = createLightning(parts.sky, parts.post, (gain) => audio.far('thunder', gain));
  const glints = createGlints(scene, g);
  return {
    fauna,
    update(camera, time, enclosed) {
      const outside = !enclosed && !!g.overworld;
      fauna.update(camera, time, !outside);
      sky.update(camera, time, !outside);
      lightning.update(time, g.overworld?.region ?? null, !outside);
      glints.update(camera.position, time, !g.overworld);
    },
  };
}
