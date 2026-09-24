import { describe, expect, it } from 'vitest';
import { START_SIGN } from '../src/data/sites';
import { PLAYER, UPGRADES } from '../src/data/tuning';
import { signPlace, travel } from '../src/systems/checkpoints';
import { createWorldGame } from '../src/systems/game';
import { buyUpgrade, changeInsight } from '../src/systems/insight';
import { setSanity } from '../src/systems/sanity';
import { clearSave, loadSave, parseSave, SAVE_KEY, saveGame, snapshot, type SaveData } from '../src/systems/save';
import { spawnDrop } from '../src/systems/spawn';
import { worldLayout } from '../src/world/placements';
import { run } from './worldHelpers';

/** A game with progress in every saved field. */
function played() {
  const g = createWorldGame();
  for (const id of ['arkham_streets', 'rlyeh_door', 'dream_wood']) g.overworld!.discovered.add(id);
  travel(g, 'rlyeh_door');
  run(g, 5);
  g.overworld!.slain.add('boss:cthulhu');
  g.overworld!.read.add('Necronomicon');
  g.player.echoes = 1234;
  const at = g.ecs.c.transform.get(g.player.id)!.pos;
  spawnDrop(g, 55, { x: at.x + 3, y: at.y, z: at.z });
  changeInsight(g, 5, 'debug', 'test');
  buyUpgrade(g, 'vigour');
  buyUpgrade(g, 'vigour');
  g.ecs.c.health.get(g.player.id)!.hp = 77;
  setSanity(g, 35);
  g.mind.seen.add('deep_one');
  g.player.laudanum = 1;
  return g;
}

describe('save and load', () => {
  it('a save restores everything it holds', () => {
    const g = played();
    const saved = snapshot(g);
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(saved))! });
    const again = snapshot(loaded);
    expect(again).toEqual({ ...saved, at: again.at });
    expect(again.at.x).toBeCloseTo(saved.at.x);
    expect(again.at.z).toBeCloseTo(saved.at.z);
    expect(loaded.mind.band).toBe('fractured');
    expect(loaded.ecs.c.health.get(loaded.player.id)!.max).toBe(PLAYER.hp + 2 * UPGRADES.vigour.hp!);
    expect(loaded.player.checkpoint).toEqual(signPlace('rlyeh_door')!.rest);
    expect(loaded.overworld!.region).toBe('rlyeh');
  });

  it('read tomes stay read, and what insight shows is shown again', () => {
    const loaded = createWorldGame({ save: snapshot(played()) });
    expect([...loaded.ecs.c.tome.values()].map((t) => t.name)).not.toContain('Necronomicon');
    const door = [...loaded.ecs.c.piece].find(([, p]) => p.def.name === 'University Library: restricted')![0];
    expect(loaded.ecs.c.layer.get(door)!.shown).toBe(true); // insight 3 ≥ 1
  });

  it('rejects damaged or foreign saves', () => {
    const good = JSON.stringify(snapshot(createWorldGame()));
    expect(parseSave(good)).not.toBeNull();
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{not json')).toBeNull();
    const broken = (patch: Record<string, unknown>): string => JSON.stringify({ ...JSON.parse(good), ...patch });
    expect(parseSave(broken({ version: 99 }))).toBeNull();
    expect(parseSave(broken({ echoes: 'lots' }))).toBeNull();
    expect(parseSave(broken({ at: { x: 1 } }))).toBeNull();
    expect(parseSave(broken({ discovered: [1, 2] }))).toBeNull();
    expect(parseSave(broken({ upgrades: { vigour: 1 } }))).toBeNull();
    expect(parseSave(broken({ drop: { x: 1, y: 2, z: 3 } }))).toBeNull();
  });

  it('unknown Elder Signs and places off the land fall back to the start', () => {
    const s: SaveData = { ...snapshot(createWorldGame()), sign: 'nowhere', discovered: ['nowhere', 'arkham_heath'], at: { x: 9999, z: 9999, yaw: 0 } };
    const g = createWorldGame({ save: s });
    expect(g.overworld!.sign).toBe(START_SIGN);
    expect([...g.overworld!.discovered].sort()).toEqual(['arkham_heath', START_SIGN]);
    expect(g.ecs.c.transform.get(g.player.id)!.pos).toMatchObject({ x: signPlace(START_SIGN)!.rest.x, z: signPlace(START_SIGN)!.rest.z });
  });

  it('keeps the save in a store as JSON', () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
    expect(loadSave(store)).toBeNull();
    const g = played();
    saveGame(g, store);
    expect(JSON.parse(data.get(SAVE_KEY)!).echoes).toBe(1234);
    expect(loadSave(store)?.slain).toEqual(['boss:cthulhu']);
    clearSave(store);
    expect(loadSave(store)).toBeNull();
    expect(worldLayout().tomes.some((t) => t.name === 'Necronomicon')).toBe(true);
  });
});
