/**
 * Cthulhu (spec §3E): it cannot be killed; no blow takes its last hit point. When the Alert comes
 * (its last phase's arena change), E at her side takes the helm and she drives straight at it, the
 * investigator riding her deck, untouchable. The bows strike and it bursts; then it reforms, and
 * R'lyeh sinks, taking Cthulhu down with it (its death throes are the sinking). Pure: no Three.js.
 */

import type { Entity } from '../../core/ecs';
import { distXZ, yawOf } from '../../core/geom';
import { CTHULHU, SIM } from '../../data/tuning';
import { startMove } from '../actions';
import type { Fight, Game } from '../components';
import type { Signature } from '../signatures';

const shipOf = (g: Game, f: Fight): Entity | undefined => f.props.find((p) => g.ecs.c.prop.get(p)?.kind === 'ship');

/** One step of the voyage: the Alert and her helmsman close on Cthulhu; near enough, the bows strike. */
function sail(g: Game, e: Entity, f: Fight, ship: Entity): void {
  const c = g.ecs.c;
  const st = c.transform.get(ship)!;
  const at = c.transform.get(e)!.pos;
  const d = distXZ(st.pos, at);
  const step = Math.min(CTHULHU.sail / SIM.hz, Math.max(0, d - 1));
  st.prev = { ...st.pos };
  st.yaw = st.prevYaw = yawOf(at.x - st.pos.x, at.z - st.pos.z);
  st.pos = { x: st.pos.x + Math.sin(st.yaw) * step, y: st.pos.y, z: st.pos.z + Math.cos(st.yaw) * step };
  const pt = c.transform.get(g.player.id)!;
  pt.prev = { ...pt.pos };
  pt.pos = { x: st.pos.x, y: st.pos.y + 1, z: st.pos.z };
  pt.yaw = st.yaw;
  if (d - (c.body.get(e)?.radius ?? 0) > CTHULHU.ram) return;
  f.sig.sailing = 0;
  f.sig.burst = CTHULHU.burst;
  c.health.get(e)!.hp = 1;
  startMove(c.actor.get(e)!, 'stagger');
  c.actor.get(g.player.id)!.move = null; // off the helm
  g.events.emit('Rammed', { entity: e });
  g.events.emit('Title', { text: 'IT BURSTS' });
}

/** It reforms, and R'lyeh sinks. */
function sink(g: Game, e: Entity): void {
  const c = g.ecs.c;
  const h = c.health.get(e)!;
  [h.floor, h.hp] = [undefined, 0];
  startMove(c.actor.get(e)!, 'death');
  g.events.emit('Died', { entity: e, killer: g.player.id, at: { ...c.transform.get(e)!.pos } });
  g.events.emit('Title', { text: "IT REFORMS · R'LYEH SINKS" });
}

export const CTHULHU_SIGNATURE: Signature = {
  engage: (g, e) => void (g.ecs.c.health.get(e)!.floor = 1),
  step(g, e, f) {
    const h = g.ecs.c.health.get(e)!;
    if (f.sig.burst > 0) {
      if (--f.sig.burst === 0) return sink(g, e);
      h.hp = Math.min(h.max, h.hp + h.max / CTHULHU.burst / 3); // reforming
    }
    h.floor = 1;
    const ship = shipOf(g, f);
    if (f.sig.sailing && ship !== undefined) sail(g, e, f, ship);
  },
  action(g, _e, f) {
    const ship = shipOf(g, f);
    if (ship === undefined || f.sig.sailing || f.sig.burst) return null;
    if (distXZ(g.ecs.c.transform.get(ship)!.pos, g.ecs.c.transform.get(g.player.id)!.pos) > CTHULHU.helm) return null;
    return {
      label: "take the Alert's helm",
      run() {
        f.sig.sailing = 1;
        startMove(g.ecs.c.actor.get(g.player.id)!, 'helm');
      },
    };
  },
};
