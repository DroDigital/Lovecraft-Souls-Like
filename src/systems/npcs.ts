/**
 * The people met in the dream (playtest round 1): each stands beside their Elder Sign, turned
 * toward where the investigator rises there, and E beside one talks with them. They say the first
 * of their topics whose conditions hold (data/npcs.ts); talking closes the quest stages waiting on
 * them (quests.ts), then the topic may begin a quest. Nothing hunts them and nothing can hurt them.
 * A roster ally may speak for someone (round 12: Nasht & Kaman-Thah): it is talked with where it stands.
 * Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { turnToward, yawOf } from '../core/geom';
import { NPCS, npcDef, type NpcDef, type Topic, type When } from '../data/npcs';
import { worldLayout } from '../world/placements';
import { DIRS } from '../world/worldMap';
import type { Game } from './components';
import { stageOf, startQuest, talked, UNSTARTED } from './quests';
import { QUESTS } from '../data/quests';

export const NPC_PREFIX = 'npc:';
const SIDE = 3.8; // metres beside the rising point (out of reach from it: talking is a step away)
const AHEAD = 1; // ...and toward the sign
const TURN = 4; // radians a second they turn to the one talking with them

/** Where an NPC stands: beside their sign's rising point, facing it. */
export function npcPlace(n: NpcDef): { x: number; z: number; yaw: number } | undefined {
  const s = worldLayout().signs.find((x) => x.id === n.sign);
  if (!s) return undefined;
  const f = DIRS[s.face];
  const [x, z] = [s.rest.x + f.z * SIDE * n.side - f.x * AHEAD, s.rest.z - f.x * SIDE * n.side - f.z * AHEAD];
  return { x, z, yaw: yawOf(s.rest.x - x, s.rest.z - z) };
}

/** Puts everyone in the world (those a roster ally speaks for come with the ally: `voice`). */
export function spawnNpcs(g: Game): void {
  const c = g.ecs.c;
  for (const n of NPCS) {
    if (n.creature) continue;
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

/** A creature just risen: if someone speaks through it (round 12: the Cavern's priests), E beside it talks with them. */
export function voice(g: Game, e: Entity, roster: string): void {
  const n = NPCS.find((x) => x.creature === roster);
  if (n) g.ecs.c.npc.set(e, n.id);
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
  g.player.listening = npcEntity(g, id) ?? null; // turned to them, the camera framing them (round 12)
  g.events.emit('Talked', { npc: id, name: n.name, title: n.title, lines: topic.lines, ...(n.shop && { shop: n.shop }) });
}

/** Each step: the one talked with turns to the investigator, the others back toward where they rise (round 12). */
export function npcSystem(g: Game, dt: number): void {
  const me = g.ecs.c.transform.get(g.player.id)!.pos;
  for (const [e, id] of g.ecs.c.npc) {
    const tr = g.ecs.c.transform.get(e)!;
    const n = npcDef(id);
    if (n?.creature && e !== g.player.listening) continue; // a creature's own brain turns it
    const want = e === g.player.listening ? yawOf(me.x - tr.pos.x, me.z - tr.pos.z) : n && npcPlace(n)?.yaw;
    tr.prevYaw = tr.yaw;
    if (want !== undefined) tr.yaw = turnToward(tr.yaw, want, TURN * dt);
  }
}

/** The entity standing for an NPC. */
export const npcEntity = (g: Game, id: string): Entity | undefined => [...g.ecs.c.npc].find(([, x]) => x === id)?.[0];
