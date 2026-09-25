/**
 * Levels (playtest round 4): Echoes buy the investigator's strength at an Elder Sign — Vigour
 * (health), Endurance (stamina) and Might (the weight of blows and shots) — each level dearer than
 * the last, so every kill and every Echo recovered from where they fell counts. Insight buys the
 * mind's upgrades instead (insight.ts). Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { LAUDANUM, LEVEL_COST, LEVELS, PLAYER, UPGRADES, type LevelId } from '../data/tuning';
import type { Game } from './components';

export const LEVEL_IDS = Object.keys(LEVELS) as LevelId[];

/** Levels bought so far (the investigator's level is one more). */
export const levelsBought = (g: Pick<Game, 'player'>): number => LEVEL_IDS.reduce((n, id) => n + g.player.levels[id], 0);

/** Echoes a level costs once `bought` levels have been bought. */
export const levelCost = (bought: number): number => Math.round(LEVEL_COST.base + LEVEL_COST.step * bought + LEVEL_COST.curve * bought * bought);

export const nextLevelCost = (g: Pick<Game, 'player'>): number => levelCost(levelsBought(g));

/** Whether another level of `id` can be bought now. */
export const canLevel = (g: Pick<Game, 'player'>, id: LevelId): boolean => g.player.levels[id] < LEVELS[id].max && g.player.echoes >= nextLevelCost(g);

/** Sets the investigator's most health and stamina from their levels; a rise is felt at once. */
export function applyLevels(g: Game): void {
  const h = g.ecs.c.health.get(g.player.id)!;
  const s = g.ecs.c.stamina.get(g.player.id)!;
  const hp = PLAYER.hp + g.player.levels.vigour * (LEVELS.vigour.hp ?? 0);
  const stamina = PLAYER.stamina + g.player.levels.endurance * (LEVELS.endurance.stamina ?? 0);
  [h.hp, h.max] = [Math.max(1, h.hp + hp - h.max), hp];
  [s.value, s.max] = [Math.max(0, s.value + stamina - s.max), stamina];
}

/** Spends Echoes on one level of `id`; false when short of Echoes or at the most levels. */
export function buyLevel(g: Game, id: LevelId): boolean {
  if (!canLevel(g, id)) return false;
  const cost = nextLevelCost(g);
  g.player.echoes -= cost;
  g.player.levels[id]++;
  applyLevels(g);
  g.events.emit('Echoes', { change: 'spent', amount: cost, total: g.player.echoes });
  g.events.emit('LevelUp', { attribute: id, level: g.player.levels[id], total: levelsBought(g) });
  return true;
}

/** The weight Might adds to a blow or shot from `attacker` (1 for anyone but the investigator). */
export const might = (g: Pick<Game, 'player'>, attacker: Entity): number =>
  attacker === g.player.id ? 1 + g.player.levels.might * (LEVELS.might.damage ?? 0) : 1;

/** The most Laudanum the investigator carries: the start's doses and one more per Draught. */
export const laudanumMax = (g: Pick<Game, 'mind'>): number => LAUDANUM.doses + g.mind.upgrades.draught * (UPGRADES.draught.doses ?? 0);

export const levelName = (id: LevelId): string => id[0].toUpperCase() + id.slice(1);
