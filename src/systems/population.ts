/**
 * Population (spec §3D): the creatures of the chunks around the investigator. Spawn points in the
 * loaded 5 × 5 chunks get their creature, nearest chunks first and never more than 60 alive (the AI
 * budget), unless it was killed since the last rest or, for a boss, slain for good. A creature that
 * strays beyond the 7 × 7 is let go, and the dead are cleared away after their death throes. Also
 * announces each region the investigator enters. Pure: no Three.js.
 */

import { getEntity } from '../data/registry';
import { WORLD } from '../data/tuning';
import { chunkContent, forgetChunks } from '../world/chunks';
import { chunksAround, chunkSpan } from '../world/streaming';
import { chunkKey, chunkOf, regionAt } from '../world/worldMap';
import { setArena } from './bossFight';
import type { Game } from './components';
import { spawnCreature } from './creatures';

const RESCAN = 30; // frames between looks at spawn points when nothing has changed

export function populationSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow) return;
  const c = g.ecs.c;
  const pp = c.transform.get(g.player.id)!.pos;
  const [pcx, pcz] = [chunkOf(pp.x), chunkOf(pp.z)];
  const key = chunkKey(pcx, pcz);
  if (key !== ow.chunk) {
    ow.chunk = key;
    ow.dirty = true;
    forgetChunks((cx, cz) => chunkSpan(cx, cz, pcx, pcz) <= WORLD.keep + 1);
    const r = regionAt(pp.x, pp.z);
    if (r && r.id !== ow.region) {
      ow.region = r.id;
      g.events.emit('RegionEntered', { region: r.id, name: r.name });
    }
  }
  for (const [id, e] of ow.alive) {
    const tr = c.transform.get(e);
    if (tr && !c.dead.has(e) && chunkSpan(chunkOf(tr.pos.x), chunkOf(tr.pos.z), pcx, pcz) <= WORLD.keep) continue;
    ow.alive.delete(id);
    ow.dirty = true;
    if (tr) g.ecs.despawn(e);
  }
  if (!ow.dirty && g.frame % RESCAN !== 0) return;
  ow.dirty = false;
  for (const ch of chunksAround(pcx, pcz, WORLD.load)) {
    for (const s of chunkContent(ch.cx, ch.cz).spawns) {
      if (ow.alive.size >= WORLD.maxActive) return;
      if (ow.alive.has(s.id) || ow.killed.has(s.id) || ow.slain.has(s.id)) continue;
      if (getEntity(s.entity)?.bossScript?.called && !ow.called.has(s.entity)) continue; // not called yet: its arena waits empty
      const e = spawnCreature(g, s.entity, s.at, s.variant);
      if (e === undefined) continue;
      if (s.arena) setArena(g, e, s.arena);
      c.origin.set(e, s.id);
      ow.alive.set(s.id, e);
    }
  }
}
