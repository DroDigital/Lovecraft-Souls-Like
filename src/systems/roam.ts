/**
 * An idle foe's own life in the open world (playtest round 18: every creature stood at its post like
 * a statue until it saw the investigator, so nothing in the world moved of itself): now and then it
 * ambles to a spot within its archetype's `roam` of its post, lingers there looking about, and ambles
 * on. What it glimpses on the way stirs it as ever (perception.ts); hunting done, it goes home and
 * takes up its rounds again. A spot it cannot reach (a wall between) it gives up on in good time.
 * Pure: no Three.js.
 */

import { distXZ, type XZ } from '../core/geom';
import { AI, SIM } from '../data/tuning';
import type { Brain, Game, Mover, Transform } from './components';
import { walk } from './tactics';

const ARRIVE = 0.6; // metres: there

/** How long it lingers, in frames. */
const linger = (g: Game): number => Math.round((AI.linger[0] + (AI.linger[1] - AI.linger[0]) * g.rng()) * SIM.hz);

/** One step of an idle foe's rounds about `post`, within `radius` of it. */
export function roam(g: Game, br: Brain, m: Mover, tr: Transform, post: XZ, radius: number): void {
  if (br.roamTo) {
    const left = (br.roamFor = (br.roamFor ?? 0) - 1);
    if (distXZ(tr.pos, br.roamTo) > ARRIVE && left > 0) return walk(m, tr.pos, br.roamTo, br.speed * AI.amble);
    br.roamTo = null;
    br.lookIn = linger(g);
    m.face = tr.yaw + (g.rng() - 0.5) * 2.4; // there: it looks about
    return;
  }
  if ((br.lookIn = (br.lookIn ?? 0) - 1) > 0) return;
  const [a, r] = [g.rng() * Math.PI * 2, radius * Math.sqrt(g.rng())];
  br.roamTo = { x: post.x + Math.sin(a) * r, z: post.z + Math.cos(a) * r };
  br.roamFor = Math.round((distXZ(tr.pos, br.roamTo) / Math.max(0.1, br.speed * AI.amble) + 2) * SIM.hz); // a blocked stroll ends in good time
}
