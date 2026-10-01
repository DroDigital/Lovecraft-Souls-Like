/**
 * What the people say to themselves (round 34): passing near one of the fifteen met in the dream, in their sight, a
 * line of what is on their mind is overheard (data/overheard.ts), one at a time, each once between rests. Never in a
 * talk, in a fight, with something hunting the investigator close by, or while they lie dead; and never more than one
 * in HEARD.every frames, whoever it is. Pure: no Three.js.
 */

import { distXZ } from '../core/geom';
import { npcDef } from '../data/npcs';
import { OVERHEARD } from '../data/overheard';
import { HEARD } from '../data/tuning';
import { hasLineOfSight } from '../world/colliders';
import { engagedFights } from './bossFight';
import { hunted } from './checkpoints';
import { isAbsent, type Game } from './components';

export const heardKey = (npc: string, i: number): string => `heard:${npc}:${i}`;

/** Every HEARD.look frames: the nearest person within earshot and sight who has a line not yet overheard says it. */
export function overheardSystem(g: Game): void {
  const [ow, c] = [g.overworld, g.ecs.c];
  if (!ow || g.frame % HEARD.look !== 0 || g.frame - ow.heardAt < HEARD.every) return;
  if (g.player.listening !== null || c.dead.has(g.player.id) || (c.health.get(g.player.id)?.hp ?? 0) <= 0 || engagedFights(g).length || hunted(g)) return;
  const me = c.transform.get(g.player.id)!.pos;
  let best: { npc: string; left: number[]; d: number } | undefined;
  for (const [e, npc] of c.npc) {
    const at = c.transform.get(e)?.pos;
    const lines = OVERHEARD[npc];
    if (!at || !lines || isAbsent(g, e)) continue;
    const d = distXZ(at, me);
    if (d > HEARD.range || (best && d >= best.d)) continue;
    const left = lines.map((_, i) => i).filter((i) => !ow.said.has(heardKey(npc, i)));
    if (!left.length) continue;
    if (!hasLineOfSight(g.world, { x: me.x, y: me.y + HEARD.seen, z: me.z }, { x: at.x, y: at.y + HEARD.seen, z: at.z })) continue;
    best = { npc, left, d };
  }
  const name = best && npcDef(best.npc)?.name;
  if (!best || !name) return;
  const i = best.left[Math.floor(g.rng() * best.left.length)]; // from the game's own stream, so a replay hears the same
  ow.said.add(heardKey(best.npc, i));
  ow.heardAt = g.frame;
  g.events.emit('Overheard', { name, text: OVERHEARD[best.npc][i] });
}
