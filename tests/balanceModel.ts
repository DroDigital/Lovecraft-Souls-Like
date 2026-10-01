/**
 * What a person has when they reach each boss (playtest round 25; the balance bot of balance.test.ts). The
 * bosses are met in order of their health, the weak first, and the world's lesser foes give their Echoes
 * in step with them (most of them killed: `KILLED`); each boss slain gives most of its own. The Echoes go
 * on levels as a person builds: Vigour and Might most, Endurance less. Star-stones left by the bosses slain
 * are set into the sword-cane.
 */

import { ENTITIES } from '../src/data/registry';
import { REGIONS } from '../src/data/regions';
import { REINFORCE, LEVELS, PLAYER, type LevelId } from '../src/data/tuning';
import { stonesOf } from '../src/systems/arms';
import { levelCost } from '../src/systems/levels';
import { worldLayout } from '../src/world/placements';
import { regionPlan } from '../src/world/regionPlan';

export const KILLED = 0.6; // the share of the world's lesser foes a person has killed by the time they have met every boss
const KEPT = 0.85; // the share of a boss's Echoes that are kept (some are lost to a death on the way)
const BUILD: readonly LevelId[] = ['vigour', 'might', 'vigour', 'endurance', 'might'];

export interface Standing {
  id: string;
  rank: number; // among the bosses, from 0
  echoes: number;
  levels: Record<LevelId, number>;
  hp: number; // the investigator's most health at these levels
  stones: number; // star-stones in hand
  reinforced: number; // levels set into the sword-cane
}

const bountyOf = (id: string): number => ENTITIES.find((e) => e.id === id)?.drops.echoes ?? 0;

/** Every Echo the world's lesser foes carry (the bosses' own are the bosses'). */
export function lesserEchoes(): number {
  const w = worldLayout();
  let sum = 0;
  for (const r of REGIONS) {
    for (const s of [...regionPlan(r).spawns.values()].flat()) if (!s.id.startsWith('boss:')) sum += bountyOf(s.entity);
    for (const s of w.spawns.filter((x) => x.region === r.id && !x.id.startsWith('boss:'))) sum += bountyOf(s.entity);
  }
  return sum;
}

/** The levels `echoes` buy, as the build goes. */
export function buy(echoes: number): Record<LevelId, number> {
  const levels: Record<LevelId, number> = { vigour: 0, endurance: 0, might: 0 };
  let bought = 0;
  for (let i = 0; ; i++) {
    const id = BUILD[i % BUILD.length];
    if (levels[id] >= LEVELS[id].max) {
      if ((Object.keys(levels) as LevelId[]).every((k) => levels[k] >= LEVELS[k].max)) break;
      continue;
    }
    const cost = levelCost(bought);
    if (echoes < cost) break;
    echoes -= cost;
    levels[id]++;
    bought++;
  }
  return levels;
}

/** Levels of reinforcement `stones` star-stones set in. */
export function reinforceWith(stones: number): number {
  let level = 0;
  while (level < REINFORCE.max && stones >= REINFORCE.cost[level]) stones -= REINFORCE.cost[level++];
  return level;
}

/** The standing of the investigator at each scripted boss, in the order they meet them. */
export function standings(): Standing[] {
  const bosses = ENTITIES.filter((e) => e.bossScript).sort((a, b) => a.stats.hp - b.stats.hp || a.id.localeCompare(b.id));
  const lesser = lesserEchoes();
  let [slain, stones] = [0, 0];
  return bosses.map((b, rank) => {
    const echoes = Math.round(KILLED * lesser * ((rank + 0.5) / bosses.length) + KEPT * slain);
    const levels = buy(echoes);
    const s: Standing = { id: b.id, rank, echoes, levels, hp: PLAYER.hp + levels.vigour * (LEVELS.vigour.hp ?? 0), stones, reinforced: reinforceWith(stones) };
    slain += bountyOf(b.id);
    stones += stonesOf(b.id);
    return s;
  });
}
