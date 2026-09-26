/**
 * Words for the rooms of the legacy dungeons (playtest round 12: the Seventy Steps were nine
 * unmarked rooms): a room with `words` says them, as a title, the first time the investigator comes
 * in, and again after they have died (a death and a rest put the dream back as it was). Pure.
 */

import { worldLayout } from '../world/placements';
import type { Game } from './components';

interface Worded {
  key: string;
  text: string;
  x: number;
  z: number;
  half: number;
}

let worded: Worded[] | undefined;
const wordedRooms = (): Worded[] =>
  (worded ??= worldLayout().dungeons.flatMap(({ layout: d }) => d.rooms.filter((r) => r.def.words).map((r) => ({ key: `${d.def.id}/${r.def.id}`, text: r.def.words!, x: r.x, z: r.z, half: r.half }))));

/** Every sixth of a second: a worded room just entered says its words. */
export function roomWordsSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow || g.frame % 10 !== 0) return;
  const p = g.ecs.c.transform.get(g.player.id)!.pos;
  for (const r of wordedRooms()) {
    if (ow.said.has(r.key) || Math.abs(p.x - r.x) > r.half || Math.abs(p.z - r.z) > r.half) continue;
    ow.said.add(r.key);
    g.events.emit('Title', { text: r.text });
  }
}

/** A death or a rest: the rooms will say their words again. */
export function registerRoomWords(g: Game): void {
  const hush = (): void => g.overworld?.said.clear();
  g.events.on('Respawned', hush);
  g.events.on('Rested', hush);
}
