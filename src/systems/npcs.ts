/**
 * The people met in the dream (playtest round 1): each stands beside their Elder Sign, turned
 * toward where the investigator rises there, and E beside one talks with them. They say the first
 * of their topics whose conditions hold (data/npcs.ts); talking closes the quest stages waiting on
 * them (quests.ts), then the topic may begin a quest. Nothing hunts them and nothing can hurt them.
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { distXZ, yawOf } from '../core/geom';
import { NPCS, npcDef, type NpcDef, type Topic, type When } from '../data/npcs';
import { WORLD } from '../data/tuning';
import { worldLayout } from '../world/placements';
import { DIRS } from '../world/worldMap';
import type { Game } from './components';
import { stageOf, startQuest, talked, UNSTARTED } from './quests';
import { QUESTS } from '../data/quests';

export const NPC_PREFIX = 'npc:';
const SIDE = 3.8; // metres beside the rising point (out of reach from it: talking is a step away)
const AHEAD = 1; // ...and toward the sign

/** Where an NPC stands: beside their sign's rising point, facing it. */
export function npcPlace(n: NpcDef): { x: number; z: number; yaw: number } | undefined {
  const s = worldLayout().signs.find((x) => x.id === n.sign);
  if (!s) return undefined;
  const f = DIRS[s.face];
  const [x, z] = [s.rest.x + f.z * SIDE * n.side - f.x * AHEAD, s.rest.z - f.x * SIDE * n.side - f.z * AHEAD];
  return { x, z, yaw: yawOf(s.rest.x - x, s.rest.z - z) };
}

/** Puts everyone in the world. */
export function spawnNpcs(g: Game): void {
  const c = g.ecs.c;
  for (const n of NPCS) {
    const at = npcPlace(n);
    if (!at) continue;
    const e = g.ecs.spawn();
    const pos = { x: at.x, y: g.world.ground(at.x, at.z), z: at.z };
    c.transform.set(e, { pos, prev: { ...pos }, yaw: at.yaw, prevYaw: at.yaw });
    c.body.set(e, { radius: 0.35, height: 1.8, aimHeight: 1.5, fixed: true });
    c.model.set(e, `${NPC_PREFIX}${n.id}`);
    c.npc.set(e, n.id);
  }
}

/** The nearest person within reach of a free investigator. */
export function nearestNpc(g: Game): { id: string; name: string; d: number } | null {
  if (g.ecs.c.actor.get(g.player.id)!.move !== null) return null;
  const pp = g.ecs.c.transform.get(g.player.id)!.pos;
  let best: { id: string; name: string; d: number } | null = null;
  for (const [e, id] of g.ecs.c.npc) {
    const d = distXZ(g.ecs.c.transform.get(e)!.pos, pp);
    if (d <= WORLD.reach && (!best || d < best.d)) best = { id, name: npcDef(id)?.name ?? id, d };
  }
  return best;
}

function holds(g: Game, w: When): boolean {
  const s = stageOf(g, w.quest);
  const n = QUESTS[w.quest]?.stages.length ?? 0;
  return w.at === 'unstarted' ? s === UNSTARTED : w.at === 'done' ? s >= n : s === w.at;
}

/** What they would talk about now. */
export function topicOf(g: Game, n: NpcDef): Topic {
  const ok = (t: Topic): boolean => (t.when ?? []).every((w) => holds(g, w)) && (!t.has || g.player.laudanum > 0);
  return n.topics.find(ok) ?? n.topics[n.topics.length - 1];
}

/** Talks with them: what they say goes to the dialogue (the Talked event). */
export function talk(g: Game, id: string): void {
  const n = npcDef(id);
  if (!n) return;
  const topic = topicOf(g, n);
  talked(g, id);
  if (topic.starts) startQuest(g, topic.starts);
  g.overworld?.met.add(id);
  g.events.emit('Talked', { npc: id, name: n.name, title: n.title, lines: topic.lines });
}

/** The entity standing for an NPC. */
export const npcEntity = (g: Game, id: string): Entity | undefined => [...g.ecs.c.npc].find(([, x]) => x === id)?.[0];
