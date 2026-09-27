import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { TOLD } from '../src/data/placeNames';
import { REGIONS } from '../src/data/regions';
import { goalMet } from '../src/systems/achievements';
import { createWorldGame } from '../src/systems/game';
import { parseSave, snapshot } from '../src/systems/save';
import { placeAt, placesOf } from '../src/world/namedPlaces';
import { goTo, record, run } from './worldHelpers';

describe('named places (round 18: world/namedPlaces.ts, systems/places.ts)', () => {
  it('every feature of every region is named, never twice in one region, the stories\' names first, the same every time', () => {
    let total = 0;
    for (const r of REGIONS) {
      const places = placesOf(r.id);
      total += places.length;
      expect(new Set(places.map((p) => p.name)).size, r.id).toBe(places.length);
      for (const p of places) expect(p.name).toMatch(/^[A-Z'N]/);
      for (const [kind, names] of Object.entries(TOLD[r.id] ?? {})) {
        const kinds = places.filter((p) => p.kind === kind).map((p) => p.name);
        for (const n of names!.slice(0, kinds.length)) expect(kinds, `${r.id} ${kind}`).toContain(n); // as many as it has of that kind
      }
      expect(placesOf(r.id)).toBe(places);
    }
    expect(total).toBeGreaterThan(150);
    const waking = ['hub', 'arkham', 'dunwich', 'providence'].flatMap((r) => placesOf(r).map((p) => p.name)); // one realm's words: no name twice
    expect(new Set(waking).size).toBe(waking.length);
    expect(placesOf('dunwich').map((p) => p.name)).toContain("The Devil's Hop Yard");
  });

  it('stepping into a place finds it once, counted against its region, and a save keeps it', () => {
    const g = createWorldGame();
    const found = record(g, 'PlaceFound');
    const p = placesOf('arkham')[0];
    expect(placeAt(p.x, p.z)).toEqual(p);
    expect(placeAt(p.x + p.r + 60, p.z + p.r + 60)?.id).not.toBe(p.id);
    goTo(g, p.x, p.z);
    run(g, 30);
    expect(found.map((e) => e.name)).toContain(p.name);
    const e = found.find((x) => x.id === p.id)!;
    expect(e).toMatchObject({ region: 'arkham', of: placesOf('arkham').length });
    expect(e.found).toBeGreaterThanOrEqual(1);
    run(g, 60);
    expect(found.filter((x) => x.id === p.id)).toHaveLength(1);
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(loaded.overworld!.places.has(p.id)).toBe(true);
  });

  it('fifty places found earns the searcher after horror', () => {
    const g = createWorldGame();
    expect(goalMet(g, ACHIEVEMENTS.searcher.goal, 0)).toBe(false);
    for (const p of REGIONS.flatMap((r) => placesOf(r.id)).slice(0, 50)) g.overworld!.places.add(p.id);
    expect(goalMet(g, ACHIEVEMENTS.searcher.goal, 0)).toBe(true);
  });
});
