/**
 * The dream's breath after a fall (round 26; systems/omens.ts): where a region's horrors are gone its mist
 * thins and its stars come up, and the whole dream is a shade clearer for each great horror put down; the
 * change eases in over some seconds (a region is crossed into a clearer air, not switched to one). When the
 * last of a region's bosses falls it breathes out, in a choir, far off. Render only.
 */

import type * as THREE from 'three';
import { calmOf, reliefOf } from '../systems/omens';
import type { Game } from '../systems/components';
import type { GameAudio } from './audio/gameAudio';
import type { PostPass } from './postPass';

/** How much the mist thins and the stars come up: the region's calm, and the dream's relief (0..0.5 at the most). */
export const clearOf = (calm: number, relief: number): number => Math.min(0.5, 0.4 * calm + 0.12 * relief);

export interface OmenFx {
  update(time: number): void;
}

export function createOmenFx(g: Game, sky: THREE.Mesh, post: PostPass, audio: GameAudio): OmenFx {
  let [clear, last] = [0, -1];
  g.events.on('Exhaled', () => {
    audio.stinger('better', { gain: 0.9 });
    audio.sample('choral', { gain: 0.5, pitch: 0.9 });
  });
  return {
    update(time) {
      const dt = last < 0 ? 1 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const want = g.overworld ? clearOf(calmOf(g, g.overworld.region), reliefOf(g)) : 0;
      clear += (want - clear) * Math.min(1, dt / 4);
      sky.userData.clear = clear; // the sky reads it (sky.ts)
      const u = post.uniforms;
      u.uFog.value.x *= 1 - clear; // the mist, after this frame's was set
      u.uFogAir.value.x *= 1 - clear * 0.5;
    },
  };
}
