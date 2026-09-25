/**
 * Where the story leads (playtest round 4): the open stage of the main line — whom to speak with,
 * what to slay, where to go — or, before a main quest begins, who will ask it of the investigator;
 * and where that is. The journal says it, and the map and minimap mark it, so a new investigator
 * always has somewhere to go. Pure: no Three.js.
 */

import type { XZ } from '../core/geom';
import { NPCS } from '../data/npcs';
import { QUESTS, type Goal } from '../data/quests';
import { worldLayout } from '../world/placements';
import type { Game } from './components';
import { npcPlace } from './npcs';
import { isDone, stageOf, UNSTARTED } from './quests';

export interface Lead {
  text: string; // what to do, in a line
  at: XZ | null; // where, when it has a place
}

const npcAt = (id: string): XZ | null => {
  const n = NPCS.find((x) => x.id === id);
  const at = n && npcPlace(n);
  return at ? { x: at.x, z: at.z } : null;
};

/** Where a goal is met. */
export function goalPlace(goal: Goal): XZ | null {
  if (goal.kind === 'talk' || goal.kind === 'give') return npcAt(goal.npc);
  if (goal.kind === 'reach') {
    const s = worldLayout().signs.find((x) => x.id === goal.sign);
    return s ? { x: s.x, z: s.z } : null;
  }
  const boss = worldLayout().spawns.find((s) => s.id === `boss:${goal.boss}`);
  return boss ? { x: boss.arena?.x ?? boss.at.x, z: boss.arena?.z ?? boss.at.z } : null;
}

/** The main line's next step, or null once it is done (or out of the open world). */
export function mainLead(g: Game): Lead | null {
  if (!g.overworld) return null;
  for (const [id, q] of Object.entries(QUESTS)) {
    if (!q.main || isDone(g, id) || (q.after && !isDone(g, q.after))) continue;
    const stage = stageOf(g, id);
    if (stage !== UNSTARTED) return { text: q.stages[stage].note, at: goalPlace(q.stages[stage].goal) };
    const giver = NPCS.find((n) => n.topics.some((t) => t.starts === id));
    if (!giver) continue;
    const sign = worldLayout().signs.find((s) => s.id === giver.sign)?.name ?? 'an Elder Sign';
    return { text: `Speak with ${giver.name}, by the Elder Sign at ${sign}.`, at: npcAt(giver.id) };
  }
  return null;
}
