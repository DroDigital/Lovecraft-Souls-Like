import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { EXPLORE } from '../src/data/tuning';
import { travel } from '../src/systems/checkpoints';
import { explore, exploredShare, isExplored, packExplored, unpackExplored, type Explored } from '../src/systems/exploration';
import { createWorldGame } from '../src/systems/game';
import { parseSave, snapshot } from '../src/systems/save';
import { worldLayout } from '../src/world/placements';
import { record, run } from './worldHelpers';

describe('the ground seen (the map)', () => {
  const hub = worldLayout().signs.find((s) => s.region === 'hub')!;

  it('marks the ground within sight as seen, and nothing beyond it', () => {
    const ex: Explored = new Map();
    const gained = explore(ex, hub.rest);
    expect([...gained]).toContain('hub');
    expect(isExplored(ex, hub.rest.x, hub.rest.z)).toBe(true);
    expect(isExplored(ex, hub.rest.x + EXPLORE.sight - EXPLORE.cell, hub.rest.z)).toBe(true);
    expect(isExplored(ex, hub.rest.x + EXPLORE.sight + 2 * EXPLORE.cell, hub.rest.z)).toBe(false);
    expect(explore(ex, hub.rest).size).toBe(0); // nothing new the second time
    const share = exploredShare(ex, REGIONS.find((r) => r.id === 'hub')!);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(0.05);
  });

  it('the investigator sees the ground around them as they go, and keeps it', () => {
    const g = createWorldGame();
    const seen = record(g, 'Explored');
    run(g, 10);
    const start = g.ecs.c.transform.get(g.player.id)!.pos;
    expect(isExplored(g.overworld!.explored, start.x, start.z)).toBe(true);
    const far = worldLayout().signs.find((s) => s.region === 'arkham')!;
    expect(isExplored(g.overworld!.explored, far.rest.x, far.rest.z)).toBe(false);
    g.overworld!.discovered.add(far.id);
    travel(g, far.id);
    run(g, 10);
    expect(isExplored(g.overworld!.explored, far.rest.x, far.rest.z)).toBe(true);
    expect(isExplored(g.overworld!.explored, start.x, start.z)).toBe(true); // for good
    expect(seen.map((e) => e.region)).toEqual(expect.arrayContaining(['arkham']));
  });

  it('is saved and loaded, and a damaged packing is dropped', () => {
    const g = createWorldGame();
    run(g, 10);
    const saved = snapshot(g);
    const back = unpackExplored(packExplored(g.overworld!.explored));
    for (const [id, cells] of g.overworld!.explored) expect([...back.get(id)!]).toEqual([...cells]);
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(saved))! });
    const at = g.ecs.c.transform.get(g.player.id)!.pos;
    expect(isExplored(loaded.overworld!.explored, at.x, at.z)).toBe(true);
    expect(unpackExplored({ hub: 'not base64!', arkham: 'AAAA', nowhere: 'AA==' }).size).toBe(0);
  });
});
