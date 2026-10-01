import { describe, expect, it } from 'vitest';
import { DUNGEON_FOG, dungeonFogOf, FOGS } from '../src/data/fogs';
import { LOOKS } from '../src/data/looks';
import { REGIONS } from '../src/data/regions';
import { FOG } from '../src/data/tuning';
import { easeFog, fogOf } from '../src/render/volumetricFog';

const EYE = 3.5; // metres above the ground: about where the follow camera stands

describe('volumetric fog (playtest rounds 16 and 23)', () => {
  it('every region has a mist, and every mist is a sane one', () => {
    for (const r of REGIONS) expect(FOGS[r.id], r.id).toBeDefined();
    for (const [id, f] of [...Object.entries(FOGS), ['dungeon', DUNGEON_FOG] as const]) {
      expect(f.density, id).toBeGreaterThan(0);
      expect(f.density * 20, id).toBeLessThan(3.2); // never a wall along the ground: 20 m of the thickest still lets a twentieth through
      expect(f.height, id).toBeGreaterThan(0.5);
      expect(f.height, id).toBeLessThanOrEqual(3); // a low mist: roofs, trees and the sky stand clear of it
      expect(f.haze, id).toBeGreaterThanOrEqual(0);
      expect(f.haze, id).toBeLessThan(0.01);
      expect(f.moon, id).toBeGreaterThanOrEqual(0);
      expect(f.moon, id).toBeLessThanOrEqual(1);
      expect(f.patchy, id).toBeGreaterThanOrEqual(0);
      expect(f.patchy, id).toBeLessThanOrEqual(1);
      for (const c of f.color) expect(c, id).toBeGreaterThanOrEqual(0);
      for (const c of f.color) expect(c, id).toBeLessThan(0.95); // a mist of the moon's light, or of snow: never white
    }
  });

  it("is its realm's own colour, light enough to see the land through (round 32: it was a dark grey blanket)", () => {
    for (const r of REGIONS) {
      expect(FOGS[r.id].color, r.id).toEqual(LOOKS[r.id].mist);
      expect(Math.max(...FOGS[r.id].color), r.id).toBeGreaterThan(0.3);
      expect(FOGS[r.id].density, r.id).toBeLessThanOrEqual(0.075); // a third of what it was
    }
    const dark = dungeonFogOf('hub').color;
    expect(Math.max(...dark)).toBeLessThan(0.3); // a crypt's is dark
  });

  it('at the height of the camera, the whole reach of the march still lets a sixth of the light through', () => {
    // (the picture was washed all over in a haze, round 23: a mist the camera stands in is a wall)
    for (const [id, f] of [...Object.entries(FOGS), ['dungeon', DUNGEON_FOG] as const]) {
      const along = (f.density * Math.exp(-EYE / f.height) + f.haze * Math.exp(-EYE / FOG.hazeHeight)) * FOG.far;
      expect(Math.exp(-along), id).toBeGreaterThan(1 / 6);
    }
  });

  it("the lantern's glow is the smaller, and the mist begins beyond a fight's reach", () => {
    expect(FOG.lantern).toBeLessThan(FOG.glow);
    expect(FOG.start).toBeGreaterThanOrEqual(4);
    expect(FOG.full).toBeGreaterThan(FOG.start);
    expect(FOG.full).toBeLessThan(FOG.far);
  });

  it("a roofed dungeon room takes the crypt-mist; out of doors, the region's (the hub's where there is none)", () => {
    expect(fogOf('arkham', true)).toEqual(dungeonFogOf('arkham'));
    expect(dungeonFogOf('arkham')).toMatchObject({ density: DUNGEON_FOG.density, height: DUNGEON_FOG.height, haze: DUNGEON_FOG.haze });
    expect(fogOf('innsmouth', false)).toEqual(FOGS.innsmouth);
    expect(fogOf(null, false)).toEqual(FOGS.hub);
  });

  it('turns from one mist to the next by the share asked', () => {
    const half = easeFog(FOGS.hub, FOGS.innsmouth, 0.5);
    expect(half.density).toBeCloseTo((FOGS.hub.density + FOGS.innsmouth.density) / 2, 6);
    expect(half.height).toBeCloseTo((FOGS.hub.height + FOGS.innsmouth.height) / 2, 6);
    expect(half.haze).toBeCloseTo((FOGS.hub.haze + FOGS.innsmouth.haze) / 2, 6);
    expect(half.color[1]).toBeCloseTo((FOGS.hub.color[1] + FOGS.innsmouth.color[1]) / 2, 6);
    expect(easeFog(FOGS.hub, FOGS.innsmouth, 1)).toEqual({ ...FOGS.innsmouth, color: [...FOGS.innsmouth.color], wind: [...FOGS.innsmouth.wind] });
  });
});
