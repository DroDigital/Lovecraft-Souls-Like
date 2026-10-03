import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { iconPixels, iconPng } from '../desktop/icon.js';
import { createWorldGame } from '../src/systems/game';
import { activeSlot, clearSave, loadSave, recallSlot, saveGame, SAVE_KEY, slotKey, SLOT_KEY, useSlot, type SaveStore } from '../src/systems/save';
import { slotLine } from '../src/ui/titleSlots';

const memory = (): SaveStore & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
};

describe('save slots (round 12)', () => {
  it('three slots, the first under the old key, each kept apart; the one in use is remembered', () => {
    expect(slotKey(1)).toBe(SAVE_KEY);
    const store = memory();
    const g = createWorldGame();
    g.player.echoes = 111;
    useSlot(store, 2);
    saveGame(g, store);
    expect(store.map.has(slotKey(2))).toBe(true);
    expect(store.map.has(SAVE_KEY)).toBe(false);
    expect(store.getItem(SLOT_KEY)).toBe('2');
    useSlot(store, 1);
    expect(loadSave(store)).toBeNull();
    expect(recallSlot(store)).toBe(1);
    store.setItem(SLOT_KEY, '2');
    expect(recallSlot(store)).toBe(2);
    expect(activeSlot()).toBe(2);
    expect(loadSave(store)!.echoes).toBe(111);
    expect(slotLine(store, 2)).toMatch(/level 1/);
    expect(slotLine(store, 3)).toBeNull();
    clearSave(store);
    expect(loadSave(store)).toBeNull();
    useSlot(store, 1);
  });
});

describe('the desktop icon (round 12)', () => {
  it('is a PNG of the size asked, drawn in code: bone strokes on the dark, clear at the corners', () => {
    const png = iconPng(64);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(64);
    const idat = png.indexOf('IDAT');
    const rows = inflateSync(png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4)));
    expect(rows.length).toBe(64 * (64 * 4 + 1));
    const px = iconPixels(64);
    expect(px[3]).toBe(0); // a transparent corner
    const at = (x: number, y: number): number[] => [...px.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)];
    expect(at(32, 40)[0]).toBeGreaterThan(150); // the stem, in bone
  });
});

import { ACHIEVEMENT_IDS, ACHIEVEMENTS } from '../src/data/achievements';
import { goalMet, newlyEarned } from '../src/systems/achievements';
import { loadRecords, noteAchievements } from '../src/systems/records';
import { NPCS } from '../src/data/npcs';

describe('achievements (round 12)', () => {
  it('are earned from the dream as it stands, and once only', () => {
    const g = createWorldGame();
    expect(newlyEarned(g, new Set(), 0)).toEqual([]);
    g.overworld!.slain.add('boss:keziah_mason');
    g.overworld!.slain.add('boss:father_dagon');
    expect(newlyEarned(g, new Set(), 0)).toEqual(['witch']);
    g.overworld!.slain.add('boss:mother_hydra');
    expect(newlyEarned(g, new Set(['witch']), 0)).toEqual(['deep']);
    g.overworld!.ending = 'herald';
    g.player.reinforced.cane = 5;
    g.player.cycle = 1;
    for (const n of NPCS) g.overworld!.met.add(n.id);
    expect(newlyEarned(g, new Set(), 3)).toEqual(expect.arrayContaining(['herald', 'every', 'stones', 'again', 'people']));
    expect(goalMet(g, ACHIEVEMENTS.sealed.goal, 3)).toBe(false);
  });

  it('are kept with the records, beyond any save, and a stranger in them is dropped', () => {
    const store = memory();
    noteAchievements(store, ['witch', 'witch', 'deep']);
    expect(loadRecords(store).achievements).toEqual(['witch', 'deep']);
    store.setItem('lovecraft-souls-like/records', JSON.stringify({ endings: [], finished: 0, achievements: ['witch', 'no_such'] }));
    expect(loadRecords(store).achievements).toEqual(['witch']);
    expect(ACHIEVEMENT_IDS.length).toBeGreaterThanOrEqual(20);
  });
});

describe('achievements for the first hours and for collectors (round 38)', () => {
  it('start unearned, and are earned by a level bought, tomes read, creatures beheld and every weapon found', async () => {
    const { DOCUMENTS } = await import('../src/data/documents');
    const { ENTITIES } = await import('../src/data/registry');
    const { WEAPON_IDS } = await import('../src/data/weapons');
    const g = createWorldGame();
    const early = ['growth', 'reader', 'fieldwork', 'armed', 'naturalist', 'library'];
    expect(newlyEarned(g, new Set(), 0).filter((id) => early.includes(id))).toEqual([]);
    g.player.levels.vigour = 1;
    expect(newlyEarned(g, new Set(), 0)).toEqual(['growth']);
    g.overworld!.read.add('Cartridges: hub 1'); // what is taken is not a tome read
    for (const n of Object.keys(DOCUMENTS).slice(0, 9)) g.overworld!.read.add(n);
    expect(goalMet(g, ACHIEVEMENTS.reader.goal, 0)).toBe(false);
    g.overworld!.read.add(Object.keys(DOCUMENTS)[9]);
    expect(goalMet(g, ACHIEVEMENTS.reader.goal, 0)).toBe(true);
    expect(goalMet(g, ACHIEVEMENTS.library.goal, 0)).toBe(false);
    for (const n of Object.keys(DOCUMENTS)) g.overworld!.read.add(n);
    expect(goalMet(g, ACHIEVEMENTS.library.goal, 0)).toBe(true);
    for (const e of ENTITIES.slice(0, 24)) g.mind.seen.add(e.id);
    expect(goalMet(g, ACHIEVEMENTS.fieldwork.goal, 0)).toBe(false);
    g.mind.seen.add(ENTITIES[24].id);
    expect(goalMet(g, ACHIEVEMENTS.fieldwork.goal, 0)).toBe(true);
    expect(goalMet(g, ACHIEVEMENTS.naturalist.goal, 0)).toBe(false);
    for (const e of ENTITIES.slice(0, 75)) g.mind.seen.add(e.id);
    expect(goalMet(g, ACHIEVEMENTS.naturalist.goal, 0)).toBe(true);
    expect(goalMet(g, ACHIEVEMENTS.armed.goal, 0)).toBe(false);
    g.player.arms = [...WEAPON_IDS];
    expect(goalMet(g, ACHIEVEMENTS.armed.goal, 0)).toBe(true);
  });
});
