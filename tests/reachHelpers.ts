/** The investigator held against a still body, swinging (playtest round 24): how many blows land in five seconds. */

import { emptyInput } from '../src/core/input';
import type { Variant } from '../src/data/registry';
import { PLAYER, SANITY } from '../src/data/tuning';
import { equip, takeUp } from '../src/systems/arms';
import { stepGame } from '../src/systems/game';
import { setLock } from '../src/systems/lockOn';
import { setSanity } from '../src/systems/sanity';
import { bossGame } from './bossHelpers';
import { place, press } from './helpers';

/** The blows of `button` (with `weapon`, if not the cane) that land on `id` in five seconds, the investigator held as near as the bodies let them stand, and `extra` metres further. */
export function landed(id: string, variant?: Variant, weapon?: string, button: 'light' | 'heavy' = 'light', extra = 0.05): number {
  const { g, boss } = bossGame(id, variant, 30);
  const c = g.ecs.c;
  const body = c.body.get(boss)!;
  const at = { ...c.transform.get(boss)!.pos };
  body.fixed = true; // it is not shoved about
  c.brain.delete(boss); // and does nothing
  if (weapon) {
    takeUp(g, weapon);
    equip(g, weapon);
  }
  const me = c.health.get(g.player.id)!;
  me.hp = me.max = 1e7;
  setSanity(g, SANITY.bands[2] - 10); // low enough for the ones only a failing mind sees
  g.mind.fought = Infinity;
  let hits = 0;
  g.events.on('Hit', (e) => void (e.attacker === g.player.id && e.target === boss && hits++));
  for (let frame = 0; frame < 60 * 5; frame++) {
    place(g, g.player.id, at.x, at.z + body.radius + PLAYER.radius + extra, Math.PI);
    c.stamina.get(g.player.id)!.value = PLAYER.stamina;
    g.camera.yaw = g.camera.prevYaw = 0;
    if (frame === 2) setLock(g, boss);
    stepGame(g, frame % 40 === 5 ? press(button) : emptyInput());
  }
  return hits;
}
