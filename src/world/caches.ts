/**
 * Echo caches (playtest round 4): a casket of Echoes waits in each of a dungeon's dead ends — a
 * room nothing opens off, holding no Elder Sign, gate, boss, tome, vial or ally — so searching a
 * dungeon to its corners pays; a dungeon without such a room keeps one in its deepest free room
 * (a lair: the room before its master). It holds a few times the richest bounty among the
 * dungeon's creatures, so deeper places pay more. Pure data math.
 */

import type { DungeonDef } from '../data/dungeons';
import { getEntity } from '../data/registry';
import { CACHE } from '../data/tuning';

/** The Echoes cached in `def`, by room id. */
export function echoCaches(def: DungeonDef): Map<string, number> {
  const bounty = Math.max(0, ...def.rooms.flatMap((r) => r.spawns ?? []).map((id) => getEntity(id)?.drops.echoes ?? 0));
  const amount = Math.min(CACHE.most, Math.max(CACHE.least, Math.round((bounty * CACHE.bounties) / 10) * 10));
  const opened = new Set(def.rooms.map((r) => r.from));
  const free = def.rooms.filter((r) => r.from && !r.sign && !r.gate && !r.boss && !r.tome && !r.vial && !r.ally);
  const ends = free.filter((r) => !opened.has(r.id));
  const depth = (id: string | undefined): number => {
    const r = def.rooms.find((x) => x.id === id);
    return r?.from ? 1 + depth(r.from) : 0;
  };
  const deepest = [...free].sort((a, b) => depth(b.id) - depth(a.id)).slice(0, 1);
  return new Map((ends.length ? ends : deepest).map((r) => [r.id, amount]));
}
