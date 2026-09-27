/**
 * Achievements (playtest round 12; data/achievements.ts): which of them the dream has earned as it
 * stands. Read from the game's own state, so a save loaded, or an older one, earns what it holds.
 * Pure: no Three.js.
 */

import { ACHIEVEMENT_IDS, ACHIEVEMENTS, type AchievementGoal, type AchievementId } from '../data/achievements';
import { NPCS } from '../data/npcs';
import type { Game } from './components';
import { levelsBought } from './levels';
import { sealsBroken } from './sealCount';

/** Whether a goal holds; `endings` counts every ending reached, over every dream (the records'). */
export function goalMet(g: Game, goal: AchievementGoal, endings: number): boolean {
  const ow = g.overworld;
  if (!ow) return false;
  if ('slay' in goal) return goal.slay.every((id) => ow.slain.has(`boss:${id}`));
  if ('reach' in goal) return ow.discovered.has(goal.reach);
  if ('signs' in goal) return ow.discovered.size >= goal.signs;
  if ('seals' in goal) return sealsBroken(g) >= goal.seals;
  if ('ending' in goal) return ow.ending === goal.ending;
  if ('endings' in goal) return endings >= goal.endings;
  if ('reinforced' in goal) return Object.values(g.player.reinforced).some((n) => n >= goal.reinforced);
  if ('level' in goal) return levelsBought(g) + 1 >= goal.level;
  if ('journey' in goal) return g.player.cycle + 1 >= goal.journey;
  if ('met' in goal) return NPCS.every((n) => ow.met.has(n.id));
  if ('places' in goal) return ow.places.size >= goal.places;
  return ow.tally.kills >= goal.kills;
}

/** The achievements earned, of those not yet held. */
export const newlyEarned = (g: Game, held: ReadonlySet<string>, endings: number): AchievementId[] =>
  ACHIEVEMENT_IDS.filter((id) => !held.has(id) && goalMet(g, ACHIEVEMENTS[id].goal, endings));
