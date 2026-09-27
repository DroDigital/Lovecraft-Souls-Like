import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { LIGHT, SKY } from '../src/data/tuning';
import { roofedAt } from '../src/world/terrain';
import { kitOf } from '../src/data/kits';
import { worldLayout } from '../src/world/placements';

describe('the night sky (render/sky.ts)', () => {
  it('names only realms that exist, and hangs the moon above the horizon it lights from', () => {
    for (const id of Object.keys(SKY.regions)) expect(REGIONS.some((r) => r.id === id), id).toBe(true);
    expect(LIGHT.nightMoonDir[1]).toBeGreaterThan(0);
  });

  it("closes off under a dungeon's roof, and stays open over ruins and outside (round 13)", () => {
    const roofed = worldLayout().dungeons.find((d) => kitOf(d.layout.def.id).roof !== 'open')!.layout;
    const first = roofed.rooms[0];
    expect(roofedAt(first.x, first.z)).toBe(true);
    expect(roofedAt(roofed.rect.x0 - 20, roofed.rect.z0 - 20)).toBe(false);
    const ruin = worldLayout().dungeons.find((d) => d.layout.def.id === 'elder_city')!.layout;
    expect(roofedAt(ruin.rooms[0].x, ruin.rooms[0].z)).toBe(false);
  });
});
