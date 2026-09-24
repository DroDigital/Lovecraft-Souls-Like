import { describe, expect, it } from 'vitest';
import type { DungeonDef } from '../src/data/dungeons';
import { DUNGEON } from '../src/data/tuning';
import { hasLineOfSight, resolveCapsule } from '../src/world/colliders';
import { floorAt, layoutDungeon, roomAt, type DungeonLayout } from '../src/world/dungeonKit';
import { worldLayout } from '../src/world/placements';
import { createWorldCollision } from '../src/world/worldCollision';
import { DIRS } from '../src/world/worldMap';

const placed = (id: string): DungeonLayout => worldLayout().dungeons.find((d) => d.layout.def.id === id)!.layout;
const room = (d: DungeonLayout, id: string) => d.rooms.find((r) => r.def.id === id)!;
const world = createWorldCollision();

describe('the dungeon kit', () => {
  it('lays a room graph out on 16 m cells; stairs change the floor', () => {
    const d = placed('witch_house');
    expect(d.errors).toEqual([]);
    const [parlour, stair, landing] = ['parlour', 'stair', 'landing'].map((id) => room(d, id));
    expect(parlour.x - room(d, 'hallway').x).toBe(-DUNGEON.cell); // west of the entrance
    expect(stair.z - parlour.z).toBe(DUNGEON.cell);
    expect(landing.level - parlour.level).toBe(4);
    const [x0, x1] = [stair.z - stair.half + 0.01, stair.z + stair.half - 0.01];
    expect(floorAt(stair, stair.x, x0)).toBeCloseTo(parlour.level, 1);
    expect(floorAt(stair, stair.x, (x0 + x1) / 2)).toBeCloseTo(parlour.level + 2, 1);
    expect(world.ground(stair.x, x1)).toBeCloseTo(landing.level, 1);
  });

  it('reports graphs the kit cannot build', () => {
    const def: DungeonDef = {
      id: 'bad', name: 'Bad', region: 'hub', rooms: [
        { id: 'a', kind: 'stair', dir: 's', rise: 2 },
        { id: 'b', kind: 'hall', from: 'a', dir: 'e' },
        { id: 'c', kind: 'corridor', from: 'nowhere', dir: 'n' },
        { id: 'd', kind: 'hall', from: 'b', dir: 'w' },
        { id: 'e', kind: 'corridor', from: 'b', dir: 'n', wide: true },
      ],
    };
    const errors = layoutDungeon(def, { x: 0, z: 0 }, 0).errors;
    expect(errors).toContain('a: the entrance cannot be a stair');
    expect(errors).toContain('b: stairs run straight on');
    expect(errors).toContain('c: opens off unknown or later room nowhere');
    expect(errors).toContain('d: overlaps a');
    expect(errors).toContain('e: only halls can be wide');
  });

  it('walls stop feet and eyes except in doorways; lintels hang overhead', () => {
    const d = placed('library');
    const door = d.doors.find((o) => o.b?.def.id === 'reading')!;
    const n = DIRS[door.side];
    const y = door.level + 1.4;
    const through = (off: number): boolean => {
      const [px, pz] = [n.z * off, -n.x * off];
      return hasLineOfSight(world, { x: door.x - n.x * 3 + px, y, z: door.z - n.z * 3 + pz }, { x: door.x + n.x * 3 + px, y, z: door.z + n.z * 3 + pz });
    };
    expect(through(0)).toBe(true);
    expect(through(DUNGEON.door / 2 + 0.6)).toBe(false);
    const high = door.level + DUNGEON.lintel + 0.5;
    expect(hasLineOfSight(world, { x: door.x - n.x * 3, y: high, z: door.z - n.z * 3 }, { x: door.x + n.x * 3, y: high, z: door.z + n.z * 3 })).toBe(false);
  });

  it('pits stop feet at the edge but not eyes across', () => {
    const d = placed('yhanthlei');
    const pit = room(d, 'pits');
    const pos = { x: pit.x, y: pit.level, z: pit.z };
    resolveCapsule(world, pos, 0.4, 1.8);
    expect(Math.max(Math.abs(pos.x - pit.x), Math.abs(pos.z - pit.z))).toBeGreaterThan(pit.half - DUNGEON.ledge);
    const y = pit.level + 1.6;
    expect(hasLineOfSight(world, { x: pit.x - 6, y, z: pit.z - 1 }, { x: pit.x + 6, y, z: pit.z + 1 })).toBe(true);
  });

  it('the Stairs of Slumber are sealed and descend seventy, then seven hundred steps', () => {
    const d = placed('slumber');
    expect(d.def.sealed).toBe(true);
    expect(d.doors.some((o) => o.b === null)).toBe(false);
    expect(room(d, 'cavern').level - d.base).toBe(-8);
    expect(room(d, 'deeper').level - room(d, 'cavern').level).toBe(-20);
    expect(roomAt(d, worldLayout().dream!.x, worldLayout().dream!.z)?.def.id).toBe('threshold');
  });

  it('hidden bridges and doors become hidden-layer pieces with seals', () => {
    const pieces = worldLayout().pieces;
    const bridge = pieces.find((p) => p.name === 'Akeley Farmhouse: span')!;
    expect(bridge.minInsight).toBe(2);
    expect(bridge.seal?.look).toBe('none');
    const door = pieces.find((p) => p.name === 'University Library: restricted')!;
    expect(door.seal?.look).toBe('wall');
    expect(door.glow).toBe('purple');
    expect(pieces.find((p) => p.name === "Risen R'lyeh: wrong")!.maxSanity).toBe(40);
  });
});
