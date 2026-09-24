/**
 * Yog-Sothoth (spec §3E): the iridescent spheres its arena raises are gates. Touch one and you are
 * through, at the next; and every little while the arena itself leaps, throwing the investigator
 * through a sphere at random. Pure: no Three.js.
 */

import type { Entity } from '../../core/ecs';
import { distXZ } from '../../core/geom';
import { YOG } from '../../data/tuning';
import type { Fight, Game } from '../components';
import type { Signature } from '../signatures';

const COOL = 45; // frames after passing through before a sphere takes the investigator again

export const spheresOf = (g: Game, f: Fight): Entity[] => f.props.filter((p) => g.ecs.c.prop.get(p)?.kind === 'sphere');

const leapIn = (g: Game): number => YOG.leap[0] + Math.floor(g.rng() * (YOG.leap[1] - YOG.leap[0] + 1));

/** Out of the sphere `to`, a step toward the arena's heart. */
function through(g: Game, e: Entity, f: Fight, to: Entity): void {
  const at = g.ecs.c.transform.get(to)!.pos;
  const [dx, dz] = [f.arena.x - at.x, f.arena.z - at.z];
  const d = Math.hypot(dx, dz) || 1;
  const tr = g.ecs.c.transform.get(g.player.id)!;
  const [x, z] = [at.x + (dx / d) * (YOG.touch + 1), at.z + (dz / d) * (YOG.touch + 1)];
  tr.pos = { x, y: g.world.ground(x, z), z };
  tr.prev = { ...tr.pos };
  f.sig.cool = COOL;
  g.events.emit('Rewired', { entity: e });
}

export const YOG_SIGNATURE: Signature = {
  engage: (g, _e, f) => void (f.sig.leapIn = leapIn(g)),
  step(g, e, f) {
    const spheres = spheresOf(g, f);
    if (!spheres.length) return;
    if (f.sig.cool > 0) f.sig.cool--;
    const pp = g.ecs.c.transform.get(g.player.id)!.pos;
    const k = spheres.findIndex((s) => distXZ(g.ecs.c.transform.get(s)!.pos, pp) <= YOG.touch);
    if (k >= 0 && !(f.sig.cool > 0)) return through(g, e, f, spheres[(k + 1) % spheres.length]);
    if (--f.sig.leapIn > 0) return;
    f.sig.leapIn = leapIn(g);
    through(g, e, f, spheres[Math.floor(g.rng() * spheres.length)]);
  },
};
