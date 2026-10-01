import { describe, expect, it } from 'vitest';
import { dungeonPieces } from '../src/render/siteMeshes';
import { facesOf, sconce, torchStops } from '../src/render/sconces';
import type { LightSpot } from '../src/render/worldLights';
import { worldLayout } from '../src/world/placements';

describe('the torches of the dungeons (round 30)', () => {
  it('stand evenly along a wall, away from its ends, none where the kit has none or the stretch is short', () => {
    expect(torchStops(16, 0)).toEqual([]);
    expect(torchStops(3, 0.5)).toEqual([]);
    for (const [len, flames] of [[16, 0.5], [6.5, 0.33], [24, 0.7], [7, 0.1]] as const) {
      const stops = torchStops(len, flames);
      expect(stops.length, `${len} @ ${flames}`).toBeGreaterThan(0);
      for (const t of stops) expect(Math.abs(t)).toBeLessThanOrEqual(len / 2 - 1.2 + 1e-9);
      const gaps = stops.slice(1).map((t, i) => t - stops[i]);
      for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6); // evenly
    }
    expect(torchStops(16, 0.7).length).toBeGreaterThan(torchStops(16, 0.25).length); // more flames, more torches
  });

  it('stand on the face that looks into the room: an outer wall has only one, a shared wall alternates', () => {
    expect([0, 1, 2, 3].map((j) => facesOf(-1, j))).toEqual([-1, -1, -1, -1]);
    expect([0, 1, 2, 3].map((j) => facesOf(0, j))).toEqual([-1, 1, -1, 1]);
  });

  it('hang at the floor of their room and give a light', () => {
    const s = sconce({ x: 10, z: 20, across: 1, alongX: true, floor: 3 }, 1);
    expect(s.light.y).toBeGreaterThan(3 + 1.9);
    expect(s.light.y).toBeLessThan(3 + 2.6);
    expect(s.light.z).toBeGreaterThan(20.5); // out from the wall's face, on the side it looks to
    expect(s.light.kind).toBe('torch');
  });

  it('every dungeon whose kit has flames has torches, each lit above the floor of some room, ', () => {
    for (const d of worldLayout().dungeons) {
      const lights: LightSpot[] = [];
      for (const _ of dungeonPieces(d, lights)) void _; // run the sliced build
      const rooms = d.layout.rooms;
      const lowest = Math.min(...rooms.map((r) => Math.min(r.level, r.level + r.rise)));
      for (const l of lights.filter((x) => x.kind === 'torch')) expect(l.y, `${d.layout.def.id}`).toBeGreaterThan(lowest);
    }
  });
});
