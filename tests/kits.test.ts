import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../src/data/dungeons';
import { DUNGEON_KITS, KITS, kitOf } from '../src/data/kits';
import { TEXTURE_KINDS } from '../src/render/textures';

describe("the dungeons' kits (round 12)", () => {
  it('every kit names real dungeons and real textures, and no two great dungeons of the story look alike', () => {
    const ids = new Set(DUNGEONS.map((d) => d.id));
    for (const id of Object.keys(DUNGEON_KITS)) expect(ids.has(id), id).toBe(true);
    for (const [id, k] of Object.entries(KITS)) {
      expect(TEXTURE_KINDS as readonly string[], id).toContain(k.wall);
      expect(TEXTURE_KINDS as readonly string[], id).toContain(k.floor);
      expect(k.flames).toBeGreaterThanOrEqual(0);
      expect(k.flames).toBeLessThanOrEqual(1);
    }
    const great = ['witch_house', 'sentinel_hill', 'yhanthlei', 'elder_city', 'archives', 'tsath', 'slumber', 'ulthar_kadath', 'risen_rlyeh', 'migo_cities', 'ultimate_void'];
    expect(new Set(great.map((d) => DUNGEON_KITS[d])).size).toBe(great.length);
    expect(kitOf('no_such_dungeon')).toBe(KITS.masonry);
  });
});
