/**
 * Save and load (spec §3D): the investigator's progress as localStorage JSON — where they stand,
 * the Elder Sign they rest at and those found, bosses slain or called, tomes read, the ending chosen, Echoes carried and dropped,
 * health, levels, the mind (sanity, insight, upgrades, horrors beheld), Laudanum, the ground seen, the
 * quests and the people met, and the wounds of foes still standing. Parsing checks every
 * field, so a damaged or foreign save is ignored. Pure: the storage is handed in.
 */

import type { Place } from '../data/arena';
import { ENDING_IDS } from '../data/endings';
import { QUESTS } from '../data/quests';
import { START_SIGN } from '../data/sites';
import { LEVELS, REAGENT, UPGRADES, type LevelId, type UpgradeId } from '../data/tuning';
import { regionAt } from '../world/worldMap';
import { signPlace, teleport } from './checkpoints';
import type { Game } from './components';
import { packExplored, unpackExplored } from './exploration';
import { woundsNow } from './overworld';
import { changeInsight } from './insight';
import { applyLevels, laudanumMax, LEVEL_IDS } from './levels';
import { setSanity } from './sanity';
import { spawnDrop } from './spawn';

export const SAVE_KEY = 'lovecraft-souls-like/save';
const VERSION = 2; // 2: the world doubled in size (playtest round 1), so a version 1 position means nothing now

export interface SaveData {
  version: typeof VERSION;
  at: Place;
  sign: string;
  discovered: string[];
  slain: string[];
  read: string[];
  echoes: number;
  drop: { x: number; y: number; z: number; amount: number } | null;
  hp: number;
  sanity: number;
  insight: number;
  upgrades: Partial<Record<UpgradeId | 'vigour' | 'endurance', number>>; // before levels, Vigour and Endurance were bought with insight
  levels?: Record<LevelId, number>; // bought with Echoes (playtest round 4)
  seen: string[];
  laudanum: number;
  reagent?: number; // West's Reagent: doses left and the most it holds
  reagentMax?: number;
  named?: number; // times Hastur's name has appeared
  called?: string[]; // bosses called into the world
  ending?: string; // the ending chosen
  explored?: Record<string, string>; // the ground seen, as base64 bits by region (exploration.ts)
  quests?: Record<string, number>; // each quest begun: its stage (quests.ts)
  met?: string[]; // the people talked with
  wounds?: Record<string, number>; // wounded foes by spawn id: their health fractions (a reload does not heal them)
}

/** The part of the Web Storage API a save needs (localStorage, or a stand-in in tests). */
export interface SaveStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export function snapshot(g: Game): SaveData {
  const ow = g.overworld!;
  const c = g.ecs.c;
  const tr = c.transform.get(g.player.id)!;
  const [drop] = g.ecs.query('drop');
  return {
    version: VERSION,
    at: { x: tr.pos.x, z: tr.pos.z, yaw: tr.yaw },
    sign: ow.sign,
    discovered: [...ow.discovered],
    slain: [...ow.slain],
    read: [...ow.read],
    echoes: g.player.echoes,
    drop: drop === undefined ? null : { ...c.transform.get(drop)!.pos, amount: c.drop.get(drop)!.amount },
    hp: c.health.get(g.player.id)!.hp,
    sanity: g.mind.sanity,
    insight: g.mind.insight,
    upgrades: { ...g.mind.upgrades },
    levels: { ...g.player.levels },
    seen: [...g.mind.seen],
    laudanum: g.player.laudanum,
    reagent: g.player.reagent,
    reagentMax: g.player.reagentMax,
    named: ow.named,
    called: [...ow.called],
    ...(ow.ending && { ending: ow.ending }),
    explored: packExplored(ow.explored),
    quests: Object.fromEntries(ow.quests),
    met: [...ow.met],
    wounds: Object.fromEntries(woundsNow(g)),
  };
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStrings = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');
const has = (x: unknown, ...keys: string[]): x is Record<string, unknown> => typeof x === 'object' && x !== null && keys.every((k) => isNum((x as Record<string, unknown>)[k]));
const isCounts = (x: unknown): boolean => typeof x === 'object' && x !== null && Object.values(x).every(isNum);

/** A save from JSON, or null when it is missing, damaged or of another version. */
export function parseSave(json: string | null): SaveData | null {
  if (!json) return null;
  let o: unknown;
  try {
    o = JSON.parse(json);
  } catch {
    return null;
  }
  if (!has(o, 'version', 'echoes', 'hp', 'sanity', 'insight', 'laudanum') || o.version !== VERSION) return null;
  if (!has(o.at, 'x', 'z', 'yaw') || typeof o.sign !== 'string' || !isCounts(o.upgrades) || (o.levels !== undefined && !isCounts(o.levels))) return null;
  if (![o.discovered, o.slain, o.read, o.seen].every(isStrings)) return null;
  if (o.drop !== null && !has(o.drop, 'x', 'y', 'z', 'amount')) return null;
  if ((o.named !== undefined && !isNum(o.named)) || (o.called !== undefined && !isStrings(o.called))) return null;
  if (o.ending !== undefined && !(ENDING_IDS as readonly unknown[]).includes(o.ending)) return null;
  if (o.explored !== undefined && (typeof o.explored !== 'object' || o.explored === null)) return null;
  if (o.quests !== undefined && (typeof o.quests !== 'object' || o.quests === null || !Object.values(o.quests).every(isNum))) return null;
  if (o.met !== undefined && !isStrings(o.met)) return null;
  if (o.wounds !== undefined && (typeof o.wounds !== 'object' || o.wounds === null || !Object.values(o.wounds).every(isNum))) return null;
  return o as unknown as SaveData;
}

const clampInt = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(x)));

/** Puts a freshly built world game into the saved state. */
export function applySave(g: Game, s: SaveData): void {
  const ow = g.overworld!;
  const c = g.ecs.c;
  const m = g.mind;
  ow.sign = signPlace(s.sign) ? s.sign : START_SIGN;
  ow.discovered = new Set([...s.discovered.filter((id) => signPlace(id)), ow.sign]);
  g.player.checkpoint = { ...signPlace(ow.sign)!.rest };
  ow.slain = new Set(s.slain);
  ow.read = new Set(s.read);
  ow.named = clampInt(s.named ?? 0, 0, 99);
  ow.called = new Set(s.called ?? []);
  ow.ending = s.ending ?? null;
  ow.explored = unpackExplored(s.explored);
  ow.quests = new Map(Object.entries(s.quests ?? {}).filter(([id]) => QUESTS[id]).map(([id, n]) => [id, clampInt(n, -1, QUESTS[id].stages.length)]));
  ow.met = new Set(s.met ?? []);
  ow.wounds = new Map(Object.entries(s.wounds ?? {}).map(([id, f]) => [id, Math.min(1, Math.max(0.01, f))]));
  for (const [id, t] of c.tome) if (ow.read.has(t.name)) g.ecs.despawn(id);
  for (const k of UPGRADE_IDS) m.upgrades[k] = clampInt(s.upgrades[k] ?? 0, 0, UPGRADES[k].max);
  const was = s.levels ?? { vigour: ((s.upgrades.vigour ?? 0) * 20) / LEVELS.vigour.hp!, endurance: ((s.upgrades.endurance ?? 0) * 15) / LEVELS.endurance.stamina!, might: 0 }; // an older save's insight upgrades (20 health, 15 stamina a level) as the levels nearest them
  for (const k of LEVEL_IDS) g.player.levels[k] = clampInt(was[k] ?? 0, 0, LEVELS[k].max);
  applyLevels(g);
  const h = c.health.get(g.player.id)!;
  h.hp = Math.min(h.max, Math.max(1, s.hp));
  const st = c.stamina.get(g.player.id)!;
  st.value = st.max;
  m.seen = new Set(s.seen);
  changeInsight(g, clampInt(s.insight, 0, 999) - m.insight, 'load', 'save');
  setSanity(g, s.sanity);
  g.player.echoes = Math.max(0, Math.round(s.echoes));
  g.player.laudanum = clampInt(s.laudanum, 0, laudanumMax(g));
  g.player.reagentMax = clampInt(s.reagentMax ?? REAGENT.doses, REAGENT.doses, REAGENT.maxDoses);
  g.player.reagent = clampInt(s.reagent ?? g.player.reagentMax, 0, g.player.reagentMax);
  if (s.drop && s.drop.amount > 0) spawnDrop(g, Math.round(s.drop.amount), { x: s.drop.x, y: s.drop.y, z: s.drop.z });
  teleport(g, regionAt(s.at.x, s.at.z) ? s.at : g.player.checkpoint);
}

export const saveGame = (g: Game, store: SaveStore): void => store.setItem(SAVE_KEY, JSON.stringify(snapshot(g)));
export const loadSave = (store: SaveStore): SaveData | null => parseSave(store.getItem(SAVE_KEY));
export const clearSave = (store: SaveStore): void => store.removeItem(SAVE_KEY);
