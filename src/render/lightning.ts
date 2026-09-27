/**
 * Lightning where storms roll (playtest round 18; LIGHTNING in tuning): over Dunwich's round hills,
 * Innsmouth's sea, R'lyeh and the mountains, now and then the sky flickers white and the world with
 * it, and the thunder rolls after, later and duller the farther the strike (under a dungeon's roof,
 * only the thunder is heard). Updated each frame once the night's light is set (main.ts), it adds its
 * flash to the moon, the ambient light, the sky's haze and the mist.
 */

import type * as THREE from 'three';
import { LIGHTNING, SKY } from '../data/tuning';
import type { PostPass } from './postPass';
import { worldUniforms } from './worldMaterial';

export interface Lightning {
  update(time: number, region: string | null, hidden: boolean): void;
}

const between = ([lo, hi]: readonly [number, number]): number => lo + (hi - lo) * Math.random();

/** A strike's light `t` seconds in: three quick pulses, dying away. */
export function flicker(t: number): number {
  if (t < 0 || t >= LIGHTNING.flash) return 0;
  const pulse = t < 0.06 ? 1 : t < 0.12 ? 0.2 : t < 0.2 ? 0.75 : t < 0.27 ? 0.15 : 0.45;
  return pulse * (1 - t / LIGHTNING.flash);
}

export function createLightning(sky: THREE.Mesh, post: PostPass, thunder: (gain: number) => void): Lightning {
  const haze = (sky.material as THREE.ShaderMaterial).uniforms.uHazeColor.value as THREE.Vector3;
  let [next, struck, strength] = [NaN, -Infinity, 0];
  let rumble: { when: number; gain: number } | null = null;
  return {
    update(time, region, hidden) {
      const every = region ? LIGHTNING.every[region] : undefined;
      if (!every) next = NaN;
      else if (Number.isNaN(next)) next = time + between(every) * 0.5;
      else if (time >= next) {
        next = time + between(every);
        const far = Math.random(); // 0: overhead, 1: on the horizon
        [struck, strength] = [time, 1 - 0.65 * far];
        rumble = { when: time + LIGHTNING.delay[0] + (LIGHTNING.delay[1] - LIGHTNING.delay[0]) * far, gain: 1 - 0.6 * far };
      }
      if (rumble && time >= rumble.when) {
        thunder(rumble.gain);
        rumble = null;
      }
      const f = hidden ? 0 : flicker(time - struck) * strength;
      haze.set(...SKY.haze).multiplyScalar(1 + LIGHTNING.sky * f);
      if (f <= 0) return;
      worldUniforms.uLightColor.value.addScalar(LIGHTNING.light * f);
      worldUniforms.uAmbient.value.addScalar(LIGHTNING.light * 0.5 * f);
      post.uniforms.uFogColor.value.addScalar(LIGHTNING.mist * f);
    },
  };
}
