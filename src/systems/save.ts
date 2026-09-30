/**
 * Save and load (spec §3D): the investigator's progress as localStorage JSON — where they stand,
 * the Elder Sign they rest at and those found, bosses slain or called, tomes read, the ending chosen, Echoes carried and dropped,
 * health, levels, arms (and the star-stones set into them), the mind (sanity, insight, upgrades, horrors beheld), Laudanum, the ground seen, the
 * quests and the people met, and the wounds of foes still standing. Parsing checks every
 * field, so a damaged or foreign save is ignored. Three slots (round 12), one in use. Pure: the storage
 * is handed in.
 */

import type { Place } from '../data/arena';
import { ENDING_IDS } from '../data/endings';
import { QUESTS } from '../data/quests';
import { WARES } from '../data/wares';
import { START_SIGN } from '../data/sites';
import { GUN, LEVELS, NEW_GAME_PLUS, OIL, REAGENT, REINFORCE, UPGRADES, type LevelId, type UpgradeId } from '../data/tuning';
import { regionAt } from '../world/worldMap';
import { signPlace, teleport } from './checkpoints';
import type { Game } from './components';
import { packExplored, unpackExplored } from './exploration';
import { woundsNow } from './overworld';
import type { Tally } from './tally';
import { changeInsight } from './insight';
import { applyLevels, laudanumMax, LEVEL_IDS } from './levels';
import { equip, stonesOfSlain } from './arms';
import { isWeapon, WEAPON_IDS, type WeaponId } from '../data/weapons';
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
  arms?: string[]; // the weapons owned...
  weapon?: string; // ...and the one in hand
  stones?: number; // star-stones carried (round 12; an older save is paid for the bosses it slew)...
  reinforced?: Record<string, number>; // ...and each weapon's reinforcement
  seen: string[];
  laudanum: number;
  reagent?: number; // West's Reagent: doses left and the most it holds
  reagentMax?: number;
  oil?: number; // flasks of lamp oil (round 12)
  ammo?: number; // the revolver's cylinder, the spare rounds and its levels (round 22)
  rounds?: number;
  gun?: number;
  cycle?: number; // the journey through the dream (NG+; round 12)
  named?: number; // times Hastur's name has appeared
  called?: string[]; // bosses called into the world
  watched?: string[]; // horrors whose arrival has been shown (round 20)
  ending?: string; // the ending chosen
  explored?: Record<string, string>; // the ground seen, as base64 bits by region (exploration.ts)
  quests?: Record<string, number>; // each quest begun: its stage (quests.ts)
  met?: string[]; // the people talked with
  places?: string[]; // the named places found (round 18)
  sold?: Record<string, number>; // wares bought, by ware (round 12)
  tally?: Record<string, number>; // the run's numbers (round 12)
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
    arms: [...g.player.arms],
    weapon: g.player.weapon,
    stones: g.player.stones,
    reinforced: { ...g.player.reinforced },
    seen: [...g.mind.seen],
    laudanum: g.player.laudanum,
    reagent: g.player.reagent,
    reagentMax: g.player.reagentMax,
    oil: g.player.oil,
    ammo: g.player.ammo,
    rounds: g.player.rounds,
    gun: g.player.gun,
    cycle: g.player.cycle,
    named: ow.named,
    called: [...ow.called],
    watched: [...ow.watched],
    ...(ow.ending && { ending: ow.ending }),
    explored: packExplored(ow.explored),
    quests: Object.fromEntries(ow.quests),
    met: [...ow.met],
    places: [...ow.places],
    sold: Object.fromEntries(ow.sold),
    tally: { ...ow.tally },
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
  if ((o.named !== undefined && !isNum(o.named)) || (o.called !== undefined && !isStrings(o.called)) || (o.watched !== undefined && !isStrings(o.watched))) return null;
  if (o.ending !== undefined && !(ENDING_IDS as readonly unknown[]).includes(o.ending)) return null;
  if (o.explored !== undefined && (typeof o.explored !== 'object' || o.explored === null)) return null;
  if (o.quests !== undefined && (typeof o.quests !== 'object' || o.quests === null || !Object.values(o.quests).every(isNum))) return null;
  if (o.met !== undefined && !isStrings(o.met)) return null;
  if (o.places !== undefined && !isStrings(o.places)) return null;
  if ((o.sold !== undefined && !isCounts(o.sold)) || (o.tally !== undefined && !isCounts(o.tally))) return null;
  if ((o.arms !== undefined && !isStrings(o.arms)) || (o.weapon !== undefined && typeof o.weapon !== 'string')) return null;
  if ([o.ammo, o.rounds, o.gun].some((n) => n !== undefined && !isNum(n))) return null;
  if ((o.cycle !== undefined && !isNum(o.cycle)) || (o.oil !== undefined && !isNum(o.oil)) || (o.stones !== undefined && !isNum(o.stones)) || (o.reinforced !== undefined && !isCounts(o.reinforced))) return null;
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
  ow.watched = new Set(s.watched ?? []);
  ow.ending = s.ending ?? null;
  ow.explored = unpackExplored(s.explored);
  ow.quests = new Map(Object.entries(s.quests ?? {}).filter(([id]) => QUESTS[id]).map(([id, n]) => [id, clampInt(n, -1, QUESTS[id].stages.length)]));
  ow.met = new Set(s.met ?? []);
  ow.places = new Set(s.places ?? []);
  for (const k of Object.keys(ow.tally) as (keyof Tally)[]) ow.tally[k] = Math.max(0, Math.round(s.tally?.[k] ?? 0));
  ow.sold = new Map(Object.entries(s.sold ?? {}).filter(([id]) => id in WARES).map(([id, n]) => [id, clampInt(n, 0, 99)]));
  ow.wounds = new Map(Object.entries(s.wounds ?? {}).map(([id, f]) => [id, Math.min(1, Math.max(0.01, f))]));
  for (const [id, t] of c.tome) if (ow.read.has(t.name)) g.ecs.despawn(id);
  for (const k of UPGRADE_IDS) m.upgrades[k] = clampInt(s.upgrades[k] ?? 0, 0, UPGRADES[k].max);
  const was = s.levels ?? { vigour: ((s.upgrades.vigour ?? 0) * 20) / LEVELS.vigour.hp!, endurance: ((s.upgrades.endurance ?? 0) * 15) / LEVELS.endurance.stamina!, might: 0 }; // an older save's insight upgrades (20 health, 15 stamina a level) as the levels nearest them
  for (const k of LEVEL_IDS) g.player.levels[k] = clampInt(was[k] ?? 0, 0, LEVELS[k].max);
  applyLevels(g);
  g.player.arms = ['cane', ...new Set((s.arms ?? []).filter((id): id is WeaponId => isWeapon(id) && id !== 'cane'))];
  if (!equip(g, s.weapon ?? 'cane')) equip(g, 'cane');
  g.player.stones = clampInt(s.stones ?? stonesOfSlain(s.slain), 0, 999);
  for (const id of WEAPON_IDS) g.player.reinforced[id] = clampInt(s.reinforced?.[id] ?? 0, 0, REINFORCE.max);
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
  g.player.oil = clampInt(s.oil ?? 0, 0, OIL.carry);
  g.player.gun = clampInt(s.gun ?? 0, 0, GUN.level.max);
  g.player.rounds = clampInt(s.rounds ?? GUN.start, 0, GUN.carry);
  g.player.ammo = clampInt(s.ammo ?? GUN.chamber, 0, GUN.chamber); // a save from before the revolver's limits: a full cylinder
  g.player.cycle = clampInt(s.cycle ?? 0, 0, NEW_GAME_PLUS.most); // before the world fills: its foes are this journey's
  if (s.drop && s.drop.amount > 0) spawnDrop(g, Math.round(s.drop.amount), { x: s.drop.x, y: s.drop.y, z: s.drop.z });
  teleport(g, regionAt(s.at.x, s.at.z) ? s.at : g.player.checkpoint);
}

/** Save slots (round 12): three, the first under the old key so a save from before slots is its. */
export const SLOTS = 3;
export const SLOT_KEY = 'lovecraft-souls-like/slot';
export const slotKey = (slot: number): string => (slot <= 1 ? SAVE_KEY : `${SAVE_KEY}-${slot}`);
let active = 1;

/** The slot saved to and loaded from. */
export const activeSlot = (): number => active;

/** Makes `slot` the one in use, and remembers it beside the saves. */
export function useSlot(store: SaveStore | null, slot: number): void {
  active = clampInt(slot, 1, SLOTS);
  try {
    store?.setItem(SLOT_KEY, String(active));
  } catch {
    // Storage refused: the slot holds for this session.
  }
}

/** Takes up the slot last used (the first when none was). */
export function recallSlot(store: SaveStore | null): number {
  const n = Number(store?.getItem(SLOT_KEY));
  return (active = Number.isFinite(n) ? clampInt(n, 1, SLOTS) : 1);
}

export const saveGame = (g: Game, store: SaveStore, slot = active): void => store.setItem(slotKey(slot), JSON.stringify(snapshot(g)));
export const loadSave = (store: SaveStore, slot = active): SaveData | null => parseSave(store.getItem(slotKey(slot)));
export const clearSave = (store: SaveStore, slot = active): void => store.removeItem(slotKey(slot));
