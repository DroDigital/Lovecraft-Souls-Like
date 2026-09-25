/**
 * How a blow taken reads, without making the investigator blink (render only): the screen's edge
 * darkens toward red on the side the blow came from (the post pass's uHurt), and the camera jolts.
 * The health bar's draining chip is the HUD's half (hud.ts).
 */

import * as THREE from 'three';
import { HURT } from '../data/tuning';
import type { Game } from '../systems/components';
import type { PostPass } from './postPass';

export interface HurtFx {
  /** Sets the post pass's wound and jolts the camera; `time` is render seconds. */
  update(post: PostPass, camera: THREE.Camera, time: number): void;
}

export function createHurtFx(g: Game): HurtFx {
  let strength = 0;
  let at = -Infinity;
  const dir = new THREE.Vector2(0, -1);
  let pending = false;
  g.events.on('Hit', (e) => {
    if (e.target !== g.player.id || e.damage <= 0 || e.outcome === 'blocked' || e.outcome === 'dodged') return;
    const max = g.ecs.c.health.get(g.player.id)?.max ?? 100;
    const k = Math.min(1, e.damage / (max / 3));
    strength = Math.max(strength * 0.5, (HURT.strength[0] + (HURT.strength[1] - HURT.strength[0]) * k) * (e.lingering ? 0.5 : 1));
    const me = g.ecs.c.transform.get(g.player.id)?.pos;
    const from = g.ecs.c.transform.get(e.attacker)?.pos;
    if (me && from) {
      const [dx, dz] = [from.x - me.x, from.z - me.z];
      const yaw = g.camera.yaw;
      const x = dx * -Math.cos(yaw) + dz * Math.sin(yaw); // along the camera's right
      const y = dx * Math.sin(yaw) + dz * Math.cos(yaw); // along its forward: the top of the screen
      if (Math.hypot(x, y) > 1e-3) dir.set(x, y).normalize();
    }
    pending = true;
  });
  return {
    update(post, camera, time) {
      if (pending) [at, pending] = [time, false];
      const fade = Math.max(0, 1 - (time - at) / HURT.seconds);
      const k = strength * fade * fade;
      post.uniforms.uHurt.value.set(k, dir.x, dir.y, 0);
      if (k > 0.01) {
        const j = HURT.shake * k;
        camera.position.x += (Math.random() - 0.5) * j;
        camera.position.y += (Math.random() - 0.5) * j;
        camera.position.z += (Math.random() - 0.5) * j;
      }
    },
  };
}
