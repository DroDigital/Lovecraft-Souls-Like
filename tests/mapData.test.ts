import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { allRealms, mapPlaces, realmOf, realmRect } from '../src/world/mapData';
import { worldLayout } from '../src/world/placements';
import { regionAt } from '../src/world/worldMap';

describe('the map (what it shows)', () => {
  it('divides the regions into realms joined edge to edge: the waking world is one', () => {
    const realms = allRealms();
    expect(realms.flat().map((r) => r.id).sort()).toEqual(REGIONS.map((r) => r.id).sort());
    expect(realmOf('hub').map((r) => r.id).sort()).toEqual(['arkham', 'dunwich', 'hub', 'innsmouth', 'providence', 'vermont']);
    expect(realmOf('rlyeh').map((r) => r.id)).toEqual(['rlyeh']);
    const r = realmRect(realmOf('hub'));
    expect([r.x1 - r.x0, r.z1 - r.z0]).toEqual([1536, 1024]);
  });

  it('marks every Elder Sign, gate, dungeon door and boss ring, each in its own region', () => {
    const w = worldLayout();
    const places = mapPlaces();
    expect(places.filter((p) => p.kind === 'sign')).toHaveLength(w.signs.length);
    expect(places.filter((p) => p.kind === 'gate')).toHaveLength(w.gates.length);
    expect(places.filter((p) => p.kind === 'dungeon')).toHaveLength(w.dungeons.length);
    expect(places.filter((p) => p.kind === 'arena')).toHaveLength(w.arenas.length);
    for (const p of places) expect(regionAt(p.x, p.z)?.id, `${p.kind} ${p.id}`).toBe(p.region);
    const bosses = new Set(places.flatMap((p) => p.bosses));
    for (const s of w.spawns.filter((x) => x.unique)) expect(bosses.has(s.entity), s.entity).toBe(true);
  });
});
