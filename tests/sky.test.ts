import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { LIGHT, SKY } from '../src/data/tuning';
import { inDungeon } from '../src/render/sky';
import { worldLayout } from '../src/world/placements';

describe('the night sky (render/sky.ts)', () => {
  it('names only realms that exist, and hangs the moon above the horizon it lights from', () => {
    for (const id of Object.keys(SKY.regions)) expect(REGIONS.some((r) => r.id === id), id).toBe(true);
    expect(LIGHT.nightMoonDir[1]).toBeGreaterThan(0);
  });

  it("closes off inside a dungeon's walls and opens outside them", () => {
    const { rect } = worldLayout().dungeons[0].layout;
    expect(inDungeon((rect.x0 + rect.x1) / 2, (rect.z0 + rect.z1) / 2)).toBe(true);
    expect(inDungeon(rect.x0 - 20, rect.z0 - 20)).toBe(false);
  });
});
