import { describe, expect, it } from 'vitest';
import { kitOfRoom, roomPoint } from '../src/world/dungeonKit';
import { roomSpots } from '../src/world/dungeonParts';
import { baysOf, cornersOf, inlaysOf, pillarsOf, roomStyle, type RoomStyle } from '../src/world/roomStyle';
import { worldLayout } from '../src/world/placements';

const w = worldLayout();
const halls = w.dungeons.flatMap((d) => d.layout.rooms.filter((r) => r.def.kind === 'hall').map((r) => ({ d, r, s: roomStyle(d.layout, r) })));
const same = (a: RoomStyle, b: RoomStyle): boolean => a.pillars === b.pillars && a.floor === b.floor && a.corners === b.corners && a.bays === b.bays;
const spotsOf = (r: Parameters<typeof roomSpots>[0]) => {
  const s = roomSpots(r);
  return [s.centre, s.sign, s.rest, s.gate, s.tome, [s.tome[0], -s.tome[1]] as const, ...s.ring];
};

describe('how a dungeon room is laid out (round 32: every hall had the same pillars and a bare floor, and a boss\'s was the plainest)', () => {
  it('gives a room the same plan every time', () => {
    for (const { d, r, s } of halls) expect(roomStyle(d.layout, r)).toEqual(s);
  });

  it('never has two halls of one size in turn alike, in any dungeon', () => {
    for (const d of w.dungeons) {
      const mine = halls.filter((h) => h.d === d && !h.r.def.boss);
      const list = mine.filter((h) => h.r.size === 1);
      for (let i = 1; i < list.length; i++) expect(same(list[i].s, list[i - 1].s), `${d.layout.def.id}: ${list[i - 1].r.def.id} and ${list[i].r.def.id}`).toBe(false);
    }
  });

  it('gives a dungeon with several halls of one size at least three plans among them', () => {
    for (const d of w.dungeons) {
      const list = halls.filter((h) => h.d === d && h.r.size === 1);
      if (list.length < 4) continue;
      const plans = new Set(list.map((h) => `${h.s.pillars}/${h.s.floor}/${h.s.corners}/${h.s.bays}`));
      expect(plans.size, d.layout.def.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses every plan somewhere: pillars, floors, cross-shaped halls and buttressed ones', () => {
    const all = w.dungeons.flatMap((d) => d.layout.rooms.map((r) => roomStyle(d.layout, r)));
    for (const p of ['four', 'pairs', 'colonnade', 'ring']) expect(all.some((s) => s.pillars === p), p).toBe(true);
    for (const f of ['runner', 'frame', 'cross', 'chequer', 'nested', 'bands', 'ring', 'rings', 'squares', 'quincunx']) expect(all.some((s) => s.floor === f), f).toBe(true);
    expect(all.some((s) => s.corners > 0)).toBe(true);
    expect(all.some((s) => s.bays)).toBe(true);
  });

  it('puts an emblem under every boss in a hall, with the middle of the floor clear of pillars and its walls in bays', () => {
    for (const { d, r, s } of halls.filter((h) => h.r.def.boss)) {
      expect(['rings', 'squares', 'quincunx'], `${d.layout.def.id}/${r.def.id}`).toContain(s.floor);
      expect(s.bays).toBe(true);
      for (const [u, v, rad] of pillarsOf(s, r, [])) expect(Math.hypot(u, v) - rad, `${r.def.id} pillar`).toBeGreaterThan(14);
      expect(inlaysOf(s, r, kitOfRoom(d.layout, r).floor === 'wood').length).toBeGreaterThan(5);
    }
  });

  it('keeps every pillar a pace from anything that stands in the room, and out of its doorways', () => {
    for (const { d, r } of halls) {
      const spots = spotsOf(r);
      for (const p of d.parts.filter((q) => q.shape === 'cyl' && q.look === 'pillar' && q.room === r.index)) {
        if (p.shape !== 'cyl') continue;
        for (const [u, v] of spots) {
          const at = roomPoint(r, u, v);
          expect(Math.hypot(p.x - at.x, p.z - at.z) - p.radius, `${d.layout.def.id}/${r.def.id}`).toBeGreaterThan(1.4);
        }
      }
      for (const door of d.layout.doors.filter((o) => o.a === r || o.b === r)) {
        for (const p of d.parts.filter((q) => q.shape === 'cyl' && q.look === 'pillar' && q.room === r.index)) {
          if (p.shape === 'cyl') expect(Math.hypot(p.x - door.x, p.z - door.z) - p.radius, `${d.layout.def.id}/${r.def.id} door`).toBeGreaterThan(3);
        }
      }
    }
  });

  it('fills corners and raises bays only where nothing stands, and never across a doorway', () => {
    for (const { d, r, s } of halls) {
      const spots = spotsOf(r);
      for (const [u0, u1, v0, v1] of [...cornersOf(s, r, spots), ...baysOf(s, r)]) {
        for (const [u, v] of spots) expect(u > u0 - 1 && u < u1 + 1 && v > v0 - 1 && v < v1 + 1, `${d.layout.def.id}/${r.def.id} spot ${u},${v}`).toBe(false);
        expect(u1 - u0, 'a box').toBeGreaterThan(0);
        expect(v1 - v0, 'a box').toBeGreaterThan(0);
      }
    }
  });

  it('lays inlays flat and clear of any foot: no inlay is solid, and none is taller than a hand', () => {
    for (const d of w.dungeons) {
      const inlays = d.parts.filter((p) => p.look === 'inlay');
      expect(inlays.length, d.layout.def.id).toBeGreaterThan(0);
      for (const p of inlays) {
        expect(p.solid).toBe(false);
        expect(p.tone).toBeDefined();
        expect((p.shape === 'box' ? p.max.y - p.min.y : p.y1 - p.y0)).toBeLessThan(0.1);
      }
    }
  });

  it('lays board floors with carpets, and earth floors with nothing but a boss\'s markings', () => {
    for (const d of w.dungeons) {
      for (const r of d.layout.rooms) {
        const kit = kitOfRoom(d.layout, r);
        const mine = d.parts.filter((p) => p.look === 'inlay' && p.room === r.index);
        if (['mud', 'rot', 'flesh', 'rock'].includes(kit.floor) && !r.def.boss) expect(mine.length, `${d.layout.def.id}/${r.def.id}`).toBe(0);
        if (kit.floor === 'wood') for (const p of mine) expect(['rug', 'gilt']).toContain(p.tone);
      }
    }
  });
});
