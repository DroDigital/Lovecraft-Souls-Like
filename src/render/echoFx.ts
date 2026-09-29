/**
 * The Echoes of the fallen, made seen (playtest round 20; render only). Where a foe dies by the
 * investigator's hand its bounty comes away from the body as pale wisps of Void Green with a bone-white
 * heart: they unspool upward in a slow circle, hang and bob a moment, then are drawn into the
 * investigator's chest along a spiral, quickening, each leaving a trail of fading motes and taking a
 * share of the Echoes with it. The counter on the HUD rises as they land (`pending` holds back what is
 * still in flight); each landing is a breath drawn in. Echoes recovered from where the investigator
 * fell stream up out of the ground the same way. The sim pays the bounty at once, as ever.
 */

import type { V3 } from '../core/geom';
import { ECHO_FX } from '../data/tuning';
import type { Game } from '../systems/components';
import type { GameAudio } from './audio/gameAudio';
import { echoLook } from './echoLook';
import { shares, stepWisp, wispCount, type Wisp } from './echoPath';
import type { Particles } from './particles';

export interface EchoFx {
  /** Steps and draws the wisps; `time` is render seconds. */
  update(time: number): void;
  /** Echoes carried by wisps still in flight: the HUD holds them back from its count. */
  pending(): number;
}

const rand = (a: number, b: number): number => a + (b - a) * Math.random();

export function createEchoFx(g: Game, fx: Particles, audio: Pick<GameAudio, 'stinger'>): EchoFx {
  const c = g.ecs.c;
  const look = echoLook(fx);
  const wisps: Wisp[] = [];
  let last = -1;
  let heard = -Infinity;
  let landed = 0; // wisps of the gathering now landing, for the pitch of each breath

  /** Parts `amount` into wisps at `from`, spread about a body `radius` wide. */
  function release(from: V3, amount: number, radius: number): void {
    const n = wispCount(amount);
    landed = 0;
    look.breath(from, radius);
    audio.stinger('release', { gain: 0.8 });
    shares(amount, n).forEach((share, i) => {
      const a = (i / n) * Math.PI * 2 + rand(0, 0.8);
      const r = rand(0.1, 1) * radius;
      wisps.push({
        x: from.x + Math.cos(a) * r, y: from.y + rand(-0.25, 0.35), z: from.z + Math.sin(a) * r,
        vx: 0, vy: 0, vz: 0, age: 0,
        rise: rand(...ECHO_FX.rise), hold: rand(...ECHO_FX.hold), lift: rand(...ECHO_FX.lift),
        turn: Math.random() < 0.5 ? 1 : -1, phase: rand(0, Math.PI * 2), amount: share,
      });
    });
  }

  g.events.on('Died', ({ entity, killer, at }) => {
    if (entity === g.player.id) return void (wisps.length = 0); // what was carried is dropped where it lies
    const bounty = c.combatant.get(entity)?.bounty ?? 0;
    if (killer !== g.player.id || bounty <= 0) return;
    const body = c.body.get(entity);
    release({ x: at.x, y: at.y + (body?.aimHeight ?? 1.2) * 0.9, z: at.z }, bounty, Math.max(0.3, (body?.radius ?? 0.4) * 0.8));
  });
  g.events.on('Echoes', ({ change, amount }) => {
    if (change !== 'recovered' || amount <= 0) return;
    const me = c.transform.get(g.player.id)!.pos;
    let [from, near]: [V3, number] = [me, Infinity]; // the drop lies within reach: the nearest of them (it is despawned as this returns)
    for (const id of g.ecs.query('drop')) {
      const p = c.transform.get(id)?.pos;
      const d = p ? Math.hypot(p.x - me.x, p.z - me.z) : Infinity;
      if (p && d < near) [from, near] = [p, d];
    }
    release({ x: from.x, y: from.y + 0.3, z: from.z }, amount, 0.5);
  });
  g.events.on('Respawned', () => void (wisps.length = 0));

  return {
    pending: () => wisps.reduce((sum, w) => sum + w.amount, 0),
    update(time) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      if (wisps.length === 0 || dt === 0) return;
      const me = c.transform.get(g.player.id)!.pos;
      const chest = { x: me.x, y: me.y + ECHO_FX.chest, z: me.z };
      const total = wisps.length;
      for (let i = wisps.length - 1; i >= 0; i--) {
        const w = wisps[i];
        if (stepWisp(w, dt, chest)) {
          look.taken(chest);
          landed++;
          if (time - heard >= ECHO_FX.gap) {
            audio.stinger('absorb', { pitch: 0.9 + 0.35 * Math.min(1, landed / Math.max(4, total)), gain: 0.8 }); // each breath a little higher
            heard = time;
          }
          wisps.splice(i, 1);
        } else look.trail(w, dt);
      }
    },
  };
}
