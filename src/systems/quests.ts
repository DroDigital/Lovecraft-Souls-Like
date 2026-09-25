/**
 * Quests (playtest round 1): each quest's stage, kept in the overworld and saved. A quest begins
 * when someone asks it of the investigator (npcs.ts); its stage's goal is checked as it can be met —
 * a talk or a gift when the investigator speaks with someone, a boss slain or an Elder Sign found
 * every half second — and the last stage's pays its reward. Pure: no Three.js.
 */

import { QUESTS, type Goal } from '../data/quests';
import type { Game } from './components';
import { changeInsight } from './insight';
import { addVial } from './reagent';

export const UNSTARTED = -1;

/** A quest's stage: UNSTARTED, the index of the open stage, or its stage count once done. */
export const stageOf = (g: Game, id: string): number => g.overworld?.quests.get(id) ?? UNSTARTED;
export const isDone = (g: Game, id: string): boolean => stageOf(g, id) >= (QUESTS[id]?.stages.length ?? Infinity);

/** Begins a quest (if it may begin): its first stage opens. */
export function startQuest(g: Game, id: string): boolean {
  const q = QUESTS[id];
  if (!q || !g.overworld || stageOf(g, id) !== UNSTARTED || (q.after && !isDone(g, q.after))) return false;
  g.overworld.quests.set(id, 0);
  g.events.emit('QuestChanged', { id, title: q.title, stage: 0, done: false });
  return true;
}

/** Closes the open stage: the next opens, or the quest is done and pays. */
function advance(g: Game, id: string): void {
  const q = QUESTS[id];
  const next = stageOf(g, id) + 1;
  g.overworld!.quests.set(id, next);
  const done = next >= q.stages.length;
  if (done) {
    const r = q.reward;
    if (r.echoes) {
      g.player.echoes += r.echoes;
      g.events.emit('Echoes', { change: 'earned', amount: r.echoes, total: g.player.echoes });
    }
    if (r.insight) changeInsight(g, r.insight, 'quest', q.title);
    if (r.vial) addVial(g);
  }
  g.events.emit('QuestChanged', { id, title: q.title, stage: next, done });
}

/** The open goals of every quest under way. */
function* openGoals(g: Game): Generator<[string, Goal]> {
  for (const [id, stage] of g.overworld?.quests ?? []) {
    const goal = QUESTS[id]?.stages[stage]?.goal;
    if (goal) yield [id, goal];
  }
}

/** Speaking with `npc`: talks with them close their stages, and gifts they ask for are handed over. */
export function talked(g: Game, npc: string): void {
  for (const [id, goal] of [...openGoals(g)]) {
    if (goal.kind === 'talk' && goal.npc === npc) advance(g, id);
    if (goal.kind === 'give' && goal.npc === npc && g.player.laudanum > 0) {
      g.player.laudanum--;
      advance(g, id);
    }
  }
}

/** Every half second: bosses slain and Elder Signs found close the stages waiting on them. */
export function questSystem(g: Game): void {
  const ow = g.overworld;
  if (!ow || g.frame % 30 !== 0) return;
  for (const [id, goal] of [...openGoals(g)]) {
    if ((goal.kind === 'slay' && ow.slain.has(`boss:${goal.boss}`)) || (goal.kind === 'reach' && ow.discovered.has(goal.sign))) advance(g, id);
  }
}
