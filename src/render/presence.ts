/**
 * What a colossus does to the ground and the air about it (round 26: scale was seen, never felt): the nearer
 * one stands, the more the world trembles, and from time to time a low rumble is heard under everything; each
 * blow of its own that lands on the ground is a jolt in the camera, a ring of dust thrown up and a boom, and a
 * rain of grit from above when it is close; a quake (its racing ring) is harder. Everything scales by how near
 * the investigator is, so a fight at its foot shakes and one seen from afar only rumbles. Render only: it reads
 * the simulation and moves the camera a little (the Screen shake setting scales it, feel.ts).
 */

import type * as THREE from 'three';
import type { Entity } from '../core/ecs';
import { ZONES } from '../data/bossTuning';
import { moveDef } from '../systems/actions';
import { isAbsent, type Game } from '../systems/components';
import type { GameAudio } from './audio/gameAudio';
import { FEEL } from './feel';
import type { Particles } from './particles';

/** How present a colossus is to someone `edge` metres from its body: 1 at its foot, 0 at 1.5 of its heights away. */
export const presenceOf = (edge: number, height: number): number => Math.min(1, Math.max(0, 1 - Math.max(0, edge) / (height * 1.5)));

/** The jolt `since` seconds after a blow, `strength` metres to begin with: a few hard shudders, dying away. */
export const jolt = (strength: number, since: number): number => (since < 0 || since > 1 ? 0 : strength * (1 - since) ** 2 * Math.cos(since * 38));

const HUM = 0.03; // metres of constant trembling at a colossus's foot
const DUST = [0.42, 0.4, 0.36] as const;
const GRIT = [0.3, 0.29, 0.27] as const;

export interface Presence {
  /** Each drawn frame: trembles the camera, and lets loose what a landing blow throws up. */
  update(camera: THREE.Camera, time: number): void;
}

export function createPresence(g: Game, particles: Particles, audio: GameAudio): Presence {
  let [lastFrame, rumbleAt, jolted, at, clock] = [-1, 0, 0, -Infinity, 0];
  const colossi = (): Entity[] => {
    const out: Entity[] = [];
    for (const [e, b] of g.ecs.c.body) if (b.height >= ZONES.height && !isAbsent(g, e) && (g.ecs.c.health.get(e)?.hp ?? 0) > 0 && g.ecs.c.actor.has(e)) out.push(e);
    return out;
  };
  const edgeOf = (e: Entity): number => {
    const [p, me] = [g.ecs.c.transform.get(e)!.pos, g.ecs.c.transform.get(g.player.id)!.pos];
    return Math.hypot(p.x - me.x, p.z - me.z) - g.ecs.c.body.get(e)!.radius;
  };
  /** A landing blow's jolt, dust and boom, by how near it is. */
  function land(e: Entity, time: number, strength: number): void {
    const [p, b] = [g.ecs.c.transform.get(e)!.pos, g.ecs.c.body.get(e)!];
    const k = presenceOf(edgeOf(e), b.height);
    if (k <= 0.02) return;
    if (strength * k > jolted) [jolted, at] = [strength * k, time];
    const n = Math.round(6 + 16 * k);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = b.radius * (0.7 + 0.5 * Math.random());
      particles.spawn({ x: p.x + Math.sin(a) * r, y: p.y + 0.2, z: p.z + Math.cos(a) * r, vx: Math.sin(a) * 1.6, vy: 0.6 + Math.random() * 1.4, vz: Math.cos(a) * 1.6, life: 1.6 + Math.random(), size: 0.7 + Math.random() * 1.4, grow: 2.4, color: DUST, alpha: 0.5, gravity: -0.1, drag: 1.1 });
    }
    audio.sample('boom', { gain: 0.35 + 0.65 * k, pitch: 0.55 + 0.15 * Math.random() });
  }
  g.events.on('Quaked', ({ by }) => void (g.ecs.c.transform.has(by) && land(by, clock, 0.3)));
  return {
    update(camera, time) {
      clock = time;
      if (!g.overworld && !g.ecs.c.fight.size) return;
      const list = colossi();
      let near = 0;
      for (const e of list) near = Math.max(near, presenceOf(edgeOf(e), g.ecs.c.body.get(e)!.height));
      if (g.frame !== lastFrame) {
        lastFrame = g.frame;
        for (const e of list) {
          const a = g.ecs.c.actor.get(e)!;
          const hit = moveDef(a)?.hit;
          if (hit && a.frame === hit.window[0]) land(e, time, 0.12); // the blow comes down
        }
      }
      if (near > 0.05 && time >= rumbleAt) { // a low rumble under everything, sooner the nearer
        rumbleAt = time + 7 - 4.5 * near + 3 * Math.random();
        audio.sample('rumble', { gain: 0.1 + 0.55 * near, pitch: 0.7 + 0.2 * Math.random() });
      }
      if (near > 0.5 && Math.random() < 0.05 * near) { // grit shaken from above
        const p = camera.position;
        particles.spawn({ x: p.x + (Math.random() - 0.5) * 12, y: p.y + 4 + Math.random() * 3, z: p.z + (Math.random() - 0.5) * 12, vy: -1, life: 1.6, size: 0.12, grow: 1, color: GRIT, alpha: 0.8, gravity: 6, drag: 0.2 });
      }
      const shake = (HUM * near * near * (0.6 + 0.4 * Math.sin(time * 37)) + jolt(jolted, time - at)) * FEEL.shake;
      if (Math.abs(shake) > 1e-4) {
        camera.position.x += shake * Math.sin(time * 71);
        camera.position.y += shake * Math.cos(time * 53);
      }
    },
  };
}
