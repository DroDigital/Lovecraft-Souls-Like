/**
 * Azathoth (spec §3E): blind and invulnerable. It hears: each noise the investigator makes carries
 * so far (a shot furthest, then sprinting, dodging, striking, walking; standing still or creeping
 * behind a guard, nothing), and where it was heard, a moment later, the court erupts. The fight is
 * not won by damage but by outlasting the piping: its health bar is the song, draining, and when the
 * song ends it slumbers; the Court's Elder Sign then offers two of the endings (endings.ts).
 */

import type { Entity } from '../../core/ecs';
import { distXZ } from '../../core/geom';
import { AZATHOTH } from '../../data/tuning';
import { startMove } from '../actions';
import type { Fight, Game } from '../components';
import { spawnPool } from '../hazards';
import type { Signature } from '../signatures';

/** How far the investigator's noise carries this step, in metres. */
export function noise(g: Game): number {
  const a = g.ecs.c.actor.get(g.player.id)!;
  const m = g.ecs.c.mover.get(g.player.id)!;
  const hear = AZATHOTH.hear;
  if (a.move === 'shoot') return hear.shot;
  if (g.player.sprinting) return hear.sprint;
  if (a.move === 'roll' || a.move === 'backstep') return hear.dodge;
  if (a.move?.startsWith('light') || a.move?.startsWith('heavy')) return hear.attack;
  return Math.hypot(m.vx, m.vz) > 0.5 && !g.player.blockHeld ? hear.walk : 0;
}

function blast(g: Game, e: Entity, f: Fight): void {
  const b = AZATHOTH.blast;
  spawnPool(g, e, 'enemy', { x: f.sig.bx, z: f.sig.bz }, { radius: b.radius, life: b.life, tick: b.tick, damage: b.damage });
}

/** The piping ends, and it slumbers. */
function slumber(g: Game, e: Entity): void {
  const h = g.ecs.c.health.get(e)!;
  [h.floor, h.hp] = [undefined, 0];
  startMove(g.ecs.c.actor.get(e)!, 'death');
  g.events.emit('Died', { entity: e, killer: g.player.id, at: { ...g.ecs.c.transform.get(e)!.pos } });
  g.events.emit('Title', { text: 'THE PIPING FADES · AZATHOTH SLUMBERS' });
}

export const AZATHOTH_SIGNATURE: Signature = {
  engage: (_g, _e, f) => void (f.sig.left = AZATHOTH.survive),
  step(g, e, f) {
    const h = g.ecs.c.health.get(e)!;
    [h.ward, h.floor] = [0, 1];
    f.sig.left = Math.max(0, f.sig.left - 1);
    h.hp = Math.max(1, (h.max * f.sig.left) / AZATHOTH.survive);
    if (f.sig.left === 0) return slumber(g, e);
    if (f.sig.blastIn > 0 && --f.sig.blastIn === 0) blast(g, e, f);
    if (f.sig.rest > 0) return void f.sig.rest--;
    const pp = g.ecs.c.transform.get(g.player.id)!.pos;
    const gap = distXZ(g.ecs.c.transform.get(e)!.pos, pp) - (g.ecs.c.body.get(e)?.radius ?? 0);
    if (gap > noise(g)) return;
    Object.assign(f.sig, { blastIn: AZATHOTH.windup, bx: pp.x, bz: pp.z, rest: AZATHOTH.windup + AZATHOTH.rest });
    g.events.emit('Notice', { text: 'IT HEARS YOU' });
  },
  reset: (g, e) => void (g.ecs.c.health.get(e)!.floor = undefined),
  status: (_g, _e, f) => `THE PIPING · ${Math.ceil(f.sig.left / 60)} s`,
};
