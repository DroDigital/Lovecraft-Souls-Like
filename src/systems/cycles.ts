/**
 * A new journey through the dream (playtest round 12: there was no NG+). After an ending, beginning
 * anew may carry the investigator's strength into a new dream: levels, arms and how far each is
 * reinforced, star-stones, the mind's upgrades, Silver Vials, the revolver's levels and Echoes. Everything else (the
 * world, its quests and bosses) begins again, and each journey's foes are hardier, strike harder
 * and leave more Echoes (NEW_GAME_PLUS). Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GUN, isDifficulty, LEVELS, NEW_GAME_PLUS, REAGENT, REINFORCE, UPGRADES, type DifficultyId, type LevelId, type UpgradeId } from '../data/tuning';
import { isWeapon, WEAPON_IDS, type WeaponId } from '../data/weapons';
import { equip } from './arms';
import type { Game } from './components';
import { applyLevels, LEVEL_IDS } from './levels';

export interface Carry {
  cycle: number; // the journey it carries into (1: the second)
  difficulty: DifficultyId; // the difficulty goes with it: it is chosen once
  levels: Record<LevelId, number>;
  arms: WeaponId[];
  weapon: WeaponId;
  reinforced: Record<WeaponId, number>;
  stones: number;
  gun: number; // the revolver's levels (its rounds start again)
  upgrades: Record<UpgradeId, number>;
  reagentMax: number;
  echoes: number;
}

/** What the investigator carries into the next journey. */
export const carryOf = (g: Game): Carry => ({
  cycle: Math.min(NEW_GAME_PLUS.most, g.player.cycle + 1),
  difficulty: g.player.difficulty,
  levels: { ...g.player.levels },
  arms: [...g.player.arms],
  weapon: g.player.weapon,
  reinforced: { ...g.player.reinforced },
  stones: g.player.stones,
  gun: g.player.gun,
  upgrades: { ...g.mind.upgrades },
  reagentMax: g.player.reagentMax,
  echoes: g.player.echoes,
});

const num = (x: unknown, lo: number, hi: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : lo);
const counts = <K extends string>(raw: unknown, keys: readonly K[], most: (k: K) => number): Record<K, number> =>
  Object.fromEntries(keys.map((k) => [k, num((raw as Record<string, unknown> | undefined)?.[k], 0, most(k))])) as Record<K, number>;

/** A stored carry, every field checked and clamped; null when it is not one. */
export function parseCarry(raw: unknown): Carry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const arms = ['cane', ...new Set((Array.isArray(o.arms) ? o.arms : []).filter((a): a is WeaponId => typeof a === 'string' && isWeapon(a) && a !== 'cane'))] as WeaponId[];
  const weapon = typeof o.weapon === 'string' && isWeapon(o.weapon) && arms.includes(o.weapon) ? o.weapon : 'cane';
  return {
    cycle: num(o.cycle, 1, NEW_GAME_PLUS.most),
    difficulty: isDifficulty(o.difficulty) ? o.difficulty : DEFAULT_DIFFICULTY,
    levels: counts(o.levels, LEVEL_IDS, (k) => LEVELS[k].max),
    arms,
    weapon,
    reinforced: counts(o.reinforced, WEAPON_IDS, () => REINFORCE.max),
    stones: num(o.stones, 0, 999),
    gun: num(o.gun, 0, GUN.level.max),
    upgrades: counts(o.upgrades, Object.keys(UPGRADES) as UpgradeId[], (k) => UPGRADES[k].max),
    reagentMax: num(o.reagentMax, REAGENT.doses, REAGENT.maxDoses),
    echoes: num(o.echoes, 0, 1e9),
  };
}

/** Puts a carried strength into a new dream's investigator. */
export function applyCarry(g: Game, c: Carry): void {
  const p = g.player;
  Object.assign(p, { cycle: c.cycle, difficulty: c.difficulty, levels: { ...c.levels }, arms: [...c.arms], reinforced: { ...c.reinforced }, stones: c.stones, gun: c.gun, echoes: c.echoes });
  Object.assign(g.mind.upgrades, c.upgrades);
  [p.reagentMax, p.reagent] = [c.reagentMax, c.reagentMax];
  applyLevels(g);
  const h = g.ecs.c.health.get(p.id)!;
  h.hp = h.max;
  if (!equip(g, c.weapon)) equip(g, 'cane');
}

/** How much hardier this journey's foes are than the first's. */
export const foeHealth = (g: Pick<Game, 'player'>): number => 1 + NEW_GAME_PLUS.health * g.player.cycle;

/** The weight this journey, and the difficulty chosen, put on a blow from `attacker` (1 for the investigator and their allies). */
export function foeDamage(g: Game, attacker: Entity): number {
  if (g.ecs.c.combatant.get(attacker)?.faction !== 'enemy') return 1;
  return DIFFICULTIES[g.player.difficulty].foe * (1 + NEW_GAME_PLUS.damage * g.player.cycle); // (round 38: the difficulty chosen at the start, and this journey's weight)
}

/** The Echoes this journey's foes leave, against the first's. */
export const foeBounty = (g: Pick<Game, 'player'>): number => 1 + NEW_GAME_PLUS.echoes * g.player.cycle;
