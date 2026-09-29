import { describe, expect, it } from 'vitest';
import { DUNGEON } from '../src/data/tuning';
import { kitOfRoom } from '../src/world/dungeonKit';
import { MOUND_BAND, type BoxPart, type Part } from '../src/world/dungeonParts';
import { bankEnds, grounded, outerFace, sweeps } from '../src/world/moundBanks';
import { worldLayout, type Dungeon } from '../src/world/placements';
import { DIRS } from '../src/world/worldMap';

/** Every mound-shelled dungeon, with its grounded outer walls under a mound. */
function mounds(): { d: Dungeon; walls: BoxPart[] }[] {
  return worldLayout()
    .dungeons.map((d) => ({ d, walls: d.parts.filter((p): p is BoxPart => grounded(d.layout, p) && kitOfRoom(d.layout, d.layout.rooms[p.room]).shell === 'mound') }))
    .filter((m) => m.walls.length > 0);
}

/** A wall end's point on the outer face. */
function endPoint(p: BoxPart, e: 0 | 1): [number, number] {
  const n = DIRS[p.outer!];
  const face = outerFace(p);
  return n.z !== 0 ? [e ? p.max.x : p.min.x, face] : [face, e ? p.max.z : p.min.z];
}

const inside = (parts: readonly Part[], x: number, z: number): boolean =>
  parts.some((q) => q.shape === 'box' && q.look === 'none' && q.solid && q.min.x <= x && x <= q.max.x && q.min.z <= z && z <= q.max.z);

describe('the earth heaped over mound dungeons (round 19: its banks crossed like a tent at every corner)', () => {
  it('there are mound dungeons to heap it on', () => {
    expect(mounds().length).toBeGreaterThan(5);
  });

  it('each corner the dungeon ends at is swept round by exactly one of its two walls, and the unseen band covers it', () => {
    let corners = 0;
    for (const { d, walls } of mounds()) {
      const claims = new Map<string, { sweep: number; walls: number; at: [number, number]; out: [number, number] }>();
      for (const p of walls) {
        bankEnds(d.layout, d.parts, p).forEach((end, e) => {
          if (end !== 'corner') return;
          const at = endPoint(p, e as 0 | 1);
          const key = at.map((v) => v.toFixed(2)).join(',');
          const n = DIRS[p.outer!];
          const c = claims.get(key) ?? { sweep: 0, walls: 0, at, out: [0, 0] };
          c.walls++;
          c.out = [c.out[0] + n.x, c.out[1] + n.z];
          if (sweeps(p, e as 0 | 1)) c.sweep++;
          claims.set(key, c);
        });
      }
      for (const [key, c] of claims) {
        expect(c.walls, `${d.layout.def.id} ${key}`).toBe(2); // two walls meet there, turned apart
        expect(c.sweep, `${d.layout.def.id} ${key}`).toBe(1);
        expect(inside(d.parts, c.at[0] + c.out[0] * MOUND_BAND * 0.5, c.at[1] + c.out[1] * MOUND_BAND * 0.5), `${d.layout.def.id} ${key}`).toBe(true);
        corners++;
      }
    }
    expect(corners).toBeGreaterThan(20);
  });

  it('a bank that runs on into the next meets it at the cells\' edge, and one beside the way in stops at it', () => {
    let [joined, open] = [0, 0];
    for (const { d, walls } of mounds()) {
      for (const p of walls) {
        const ends = bankEnds(d.layout, d.parts, p);
        ends.forEach((end, e) => {
          if (end === 'open') open++;
          if (end !== 'joined') return;
          joined++;
          const [x, z] = endPoint(p, e as 0 | 1);
          const along = DIRS[p.outer!].z !== 0;
          const edge = (along ? x : z) + (e ? -1 : 1) * (DUNGEON.wall / 2);
          const next = d.parts.filter((q): q is BoxPart => grounded(d.layout, q)).find((q) => q !== p && q.outer === p.outer && Math.abs(outerFace(q) - outerFace(p)) < 0.01 && Math.abs((along ? (e ? q.min.x : q.max.x) : e ? q.min.z : q.max.z) + (e ? 1 : -1) * (DUNGEON.wall / 2) - edge) < 0.01);
          expect(next, `${d.layout.def.id}`).toBeDefined();
          expect(bankEnds(d.layout, d.parts, next!)[e ? 0 : 1]).toBe('joined');
        });
      }
    }
    expect(joined).toBeGreaterThan(10);
    expect(open).toBeGreaterThan(5); // the ways in
  });
});
