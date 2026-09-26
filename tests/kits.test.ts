import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../src/data/dungeons';
import { DUNGEON_KITS, KITS, kitOf, type DungeonKit, roomKit } from '../src/data/kits';
import { TEXTURE_KINDS } from '../src/render/textures';

describe("the dungeons' kits (round 12)", () => {
  it('every kit names real dungeons and real textures, and no two great dungeons of the story look alike', () => {
    const ids = new Set(DUNGEONS.map((d) => d.id));
    for (const id of Object.keys(DUNGEON_KITS)) expect(ids.has(id), id).toBe(true);
    for (const [id, k] of Object.entries(KITS) as [string, DungeonKit][]) {
      expect(TEXTURE_KINDS as readonly string[], id).toContain(k.wall);
      expect(TEXTURE_KINDS as readonly string[], id).toContain(k.floor);
      expect(k.flames).toBeGreaterThanOrEqual(0);
      expect(k.flames).toBeLessThanOrEqual(1);
      if (k.below) expect(Object.keys(KITS), id).toContain(k.below);
      if (k.roof === 'open') expect(k.sound, `${id}: ruins under the sky do not drip`).toBe('open');
    }
    const great = ['witch_house', 'sentinel_hill', 'yhanthlei', 'elder_city', 'archives', 'tsath', 'slumber', 'ulthar_kadath', 'risen_rlyeh', 'migo_cities', 'ultimate_void'];
    expect(new Set(great.map((d) => DUNGEON_KITS[d])).size).toBe(great.length);
    expect(kitOf('no_such_dungeon')).toBe(KITS.masonry);
  });
});

describe('rooms and their kits (round 13)', () => {
  it('no dungeon floors a sunk room in boards, and no roofed room is floored in boards unless it is a house', () => {
    for (const d of DUNGEONS) {
      for (const r of d.rooms) {
        if (r.kit) expect(Object.keys(KITS), `${d.id}/${r.id}`).toContain(r.kit);
      }
    }
    expect(roomKit('witch_house', { sunk: true }).floor).not.toBe('wood');
    expect(roomKit('library', { sunk: false }).floor).not.toBe('wood');
    expect(roomKit('starry_wisdom', { sunk: false }).floor).not.toBe('wood');
  });
});
