/**
 * Where the story leads (playtest round 4): the open stage of the main line — whom to speak with,
 * what to slay, where to go — or, before a main quest begins, who will ask it of the investigator;
 * and where that is. The journal says it, and the map and minimap mark it, so a new investigator
 * always has somewhere to go. Pure: no Three.js.
 */

import { distXZ, type XZ } from '../core/geom';
import { NPCS } from '../data/npcs';
import { QUESTS, type Goal } from '../data/quests';
import { worldLayout } from '../world/placements';
import type { Game } from './components';
import { npcPlace } from './npcs';
import { isDone, stageOf, UNSTARTED } from './quests';
import { SEAL_REGIONS, sealBroken, sealsBroken } from './sealCount';

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
  if (goal.kind === 'seals') return null; // it has no one place (sealLead)
  return bossPlace(goal.boss);
}

/** Where a boss is met: its arena, or where it stands. */
function bossPlace(boss: string): XZ | null {
  const s = worldLayout().spawns.find((x) => x.id === `boss:${boss}`);
  return s ? { x: s.arena?.x ?? s.at.x, z: s.arena?.z ?? s.at.z } : null;
}

/** The seals' goal: how many have fallen, and the nearest great horror whose seal still holds. */
function sealLead(g: Game, count: number, note: string): Lead {
  const me = g.ecs.c.transform.get(g.player.id)!.pos;
  let [at, best]: [XZ | null, number] = [null, Infinity];
  for (const r of SEAL_REGIONS) {
    if (sealBroken(g, r.id)) continue;
    for (const b of r.bosses) {
      const p = bossPlace(b);
      if (p && distXZ(p, me) < best) [at, best] = [p, distXZ(p, me)];
    }
  }
  return { text: `${note} (${Math.min(count, sealsBroken(g))} of ${count} have fallen.)`, at };
}

/** The main line's next step, or null once it is done (or out of the open world). */
export function mainLead(g: Game): Lead | null {
  if (!g.overworld) return null;
  for (const [id, q] of Object.entries(QUESTS)) {
    if (!q.main || isDone(g, id) || (q.after && !isDone(g, q.after))) continue;
    const stage = stageOf(g, id);
    const goal = stage !== UNSTARTED ? q.stages[stage].goal : null;
    if (goal?.kind === 'seals') return sealLead(g, goal.count, q.stages[stage].note);
    if (goal) return { text: q.stages[stage].note, at: goalPlace(goal) };
    const giver = NPCS.find((n) => n.topics.some((t) => t.starts === id));
    if (!giver) continue;
    const sign = worldLayout().signs.find((s) => s.id === giver.sign)?.name ?? 'an Elder Sign';
    return { text: `Speak with ${giver.name}, by the Elder Sign at ${sign}.`, at: npcAt(giver.id) };
  }
  return null;
}
