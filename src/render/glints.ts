/**
 * Things worth finding catch the eye (playtest round 18: the tomes, notes, caches, vials and arms
 * lying about the world were small and dark, and found only underfoot): each one not yet taken wears
 * a faint warm glimmer that breathes, with now and then a brighter twinkle, seen through the fog
 * from some thirty metres. One batch of halos.
 */

import type * as THREE from 'three';
import type { Game } from '../systems/components';
import { createHalos } from './halos';

const REACH = 32; // metres
const GLINT = [1, 0.88, 0.6] as const;

export interface Glints {
  update(eye: THREE.Vector3, time: number, hidden: boolean): void;
}

export function createGlints(scene: THREE.Scene, g: Game): Glints {
  const halos = createHalos(32, 0.35);
  scene.add(halos.mesh);
  return {
    update(eye, time, hidden) {
      halos.begin();
      for (const [e, t] of hidden ? [] : g.ecs.c.tome) {
        const p = g.ecs.c.dead.has(e) ? undefined : g.ecs.c.transform.get(e)?.pos;
        if (!p || Math.hypot(p.x - eye.x, p.z - eye.z) > REACH) continue;
        const phase = ((e * 0.618) % 1) * Math.PI * 2;
        const breath = 0.5 + 0.5 * Math.sin(time * 2 + phase);
        const twinkle = Math.max(0, Math.sin(time * 0.9 + phase * 3)) ** 24; // a brief bright glint now and then
        const lift = t.note || t.echoes || t.vial || t.rounds ? 0.45 : 1.15; // over a note or a cache on the ground; over a tome on its lectern
        halos.put(p.x, p.y + lift, p.z, 0.3 + 0.35 * twinkle, GLINT, 0.35 + 0.3 * breath + 1.2 * twinkle);
      }
      halos.end();
    },
  };
}
