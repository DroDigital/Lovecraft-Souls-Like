import { describe, expect, it } from 'vitest';
import { DUNGEON_FOG, FOGS } from '../src/data/fogs';
import { REGIONS } from '../src/data/regions';
import { easeFog, fogOf } from '../src/render/volumetricFog';

describe('volumetric fog (playtest round 16)', () => {
  it('every region has a mist, and every mist is a sane one', () => {
    for (const r of REGIONS) expect(FOGS[r.id], r.id).toBeDefined();
    for (const [id, f] of [...Object.entries(FOGS), ['dungeon', DUNGEON_FOG] as const]) {
      expect(f.density, id).toBeGreaterThan(0);
      expect(f.density, id).toBeLessThan(0.1); // never a wall: 20 m of the thickest still lets a sixth through
      expect(f.height, id).toBeGreaterThan(0.5);
      expect(f.patchy, id).toBeGreaterThanOrEqual(0);
      expect(f.patchy, id).toBeLessThanOrEqual(1);
      for (const c of f.color) expect(c, id).toBeGreaterThanOrEqual(0);
      for (const c of f.color) expect(c, id).toBeLessThan(0.25); // a night mist: never brighter than the lights in it
    }
  });

  it("a roofed dungeon room takes the crypt-mist; out of doors, the region's (the hub's where there is none)", () => {
    expect(fogOf('arkham', true)).toBe(DUNGEON_FOG);
    expect(fogOf('innsmouth', false)).toBe(FOGS.innsmouth);
    expect(fogOf(null, false)).toBe(FOGS.hub);
  });

  it('turns from one mist to the next by the share asked', () => {
    const half = easeFog(FOGS.hub, FOGS.innsmouth, 0.5);
    expect(half.density).toBeCloseTo((FOGS.hub.density + FOGS.innsmouth.density) / 2, 6);
    expect(half.color[1]).toBeCloseTo((FOGS.hub.color[1] + FOGS.innsmouth.color[1]) / 2, 6);
    expect(easeFog(FOGS.hub, FOGS.innsmouth, 1)).toEqual({ ...FOGS.innsmouth, color: [...FOGS.innsmouth.color], wind: [...FOGS.innsmouth.wind] });
  });
});
