import { describe, expect, it } from 'vitest';
import { DOOR_LOOKS } from '../src/data/doors';
import { FOG_THEMES, fogThemeOf } from '../src/data/fogThemes';
import { KITS } from '../src/data/kits';
import { REGIONS } from '../src/data/regions';
import { DUNGEON } from '../src/data/tuning';
import { wantOpen, pose } from '../src/render/doorViews';
import { fogSeen, wallGap } from '../src/render/bossFog';
import { gatePlan } from '../src/world/gatePlan';
import { worldLayout } from '../src/world/placements';

const plan = gatePlan(worldLayout());

describe('the doors and the fog of the dungeons (round 27)', () => {
  it('every look is of a kit that exists, and every theme has colours that are colours', () => {
    for (const k of Object.keys(DOOR_LOOKS)) expect(KITS, k).toHaveProperty(k);
    for (const [id, t] of Object.entries(FOG_THEMES)) {
      for (const c of [...t.base, ...t.top]) expect(c >= 0 && c <= 1, id).toBe(true);
      expect(t.density, id).toBeGreaterThan(0.4);
      expect(t.note.length, id).toBeGreaterThan(10);
    }
    for (const r of REGIONS) expect(FOG_THEMES[fogThemeOf([], r.id)], r.id).toBeDefined();
  });

  it('puts fog in every doorway of a boss room and a door in the other doorways of a kit that has one', () => {
    const layouts = worldLayout().dungeons.map((d) => d.layout);
    let bossDoorways = 0;
    let doorways = 0;
    for (const L of layouts) {
      for (const d of L.doors) {
        if (d.hidden) continue;
        const boss = [d.a, d.b].some((r) => r?.def.boss);
        const at = (o: { x: number; z: number }): boolean => Math.hypot(o.x - d.x, o.z - d.z) < 0.01;
        if (boss) {
          bossDoorways++;
          expect(plan.fogs.some((f) => f.kind === 'doorway' && at(f)), `${L.def.id} boss doorway`).toBe(true);
          expect(plan.doors.some(at), `${L.def.id} boss doorway has no door`).toBe(false);
        } else doorways++;
      }
    }
    expect(bossDoorways).toBeGreaterThan(10);
    expect(plan.doors.length).toBeGreaterThan(50);
    expect(plan.doors.length).toBeLessThanOrEqual(doorways);
  });

  it('gives no door to open ruins, the hill, the drowned temple or the void, and some to every house, vault and tomb', () => {
    const kitless = worldLayout().dungeons.filter((d) => ['sentinel_hill', 'ultimate_void'].includes(d.layout.def.id));
    for (const d of kitless) expect(plan.doors.some((x) => x.id.startsWith(`${d.layout.def.id}:`)), d.layout.def.id).toBe(false);
    for (const id of ['witch_house', 'library', 'curwen_catacombs', 'risen_rlyeh', 'migo_cities']) expect(plan.doors.some((x) => x.id.startsWith(`${id}:`)), id).toBe(true);
  });

  it('rings every arena in the open, outside the stones, with fog that names the spawns it keeps', () => {
    const rings = plan.fogs.filter((f) => f.kind === 'ring');
    expect(rings.length).toBe(worldLayout().arenas.length);
    const spawned = new Set(worldLayout().spawns.map((s) => s.id));
    for (const f of plan.fogs) {
      expect(f.spawns.length, f.id).toBeGreaterThan(0);
      for (const s of f.spawns) expect(spawned.has(s), `${f.id}: ${s}`).toBe(true);
      expect(FOG_THEMES[f.theme], f.id).toBeDefined();
    }
    const a = worldLayout().arenas[0];
    expect(rings.find((r) => r.x === a.x && r.z === a.z)!.radius).toBeGreaterThan(a.radius);
  });

  it('keeps every fog in a doorway exactly as wide as the room keeps it open, and clear of no doorway', () => {
    for (const f of plan.fogs.filter((x) => x.kind === 'doorway')) expect(f.width).toBeGreaterThanOrEqual(DUNGEON.door);
    for (const d of plan.doors) expect([d.width, d.height]).toEqual([DUNGEON.door, DUNGEON.lintel]);
  });

  it('themes the horrors of the realms differently', () => {
    const themes = new Set(plan.fogs.map((f) => f.theme));
    expect(themes.size).toBeGreaterThanOrEqual(8);
    expect(fogThemeOf(['hastur'], 'yuggoth')).toBe('yellow');
    expect(fogThemeOf(['nobody'], 'innsmouth')).toBe('brine');
  });

  it('a door opens as someone nears, stays open a little past that, and stands ajar until first approached', () => {
    const d = { ajar: true, touched: false };
    expect(wantOpen(d, 30, 4, false)).toBe(0.35);
    expect(wantOpen(d, 3, 4, false)).toBe(1);
    expect(wantOpen(d, 5, 4, false)).toBe(0.35);
    expect(wantOpen(d, 5, 4, true)).toBe(1);
    expect(wantOpen({ ajar: true, touched: true }, 30, 4, true)).toBe(0);
    expect(wantOpen({ ajar: false, touched: false }, 30, 4, false)).toBe(0);
  });

  it('swings plank doors away, draws drapes, sinks or slides slabs', () => {
    const p = plan.doors.find((x) => x.look.kind === 'plank')!;
    expect(pose(p.look, 1, 1, 3.4, 3.2, 0).left.y).toBeGreaterThan(1);
    expect(pose(p.look, 1, -1, 3.4, 3.2, 0).left.y).toBeLessThan(-1);
    expect(pose(p.look, 0, 1, 3.4, 3.2, 0).left.y).toBe(0);
    const slab = plan.doors.find((x) => x.look.kind === 'slab' && !x.look.slide)!;
    expect(pose(slab.look, 1, 1, 3.4, 3.2, 0).lift).toBeLessThan(-3.4);
    const slide = plan.doors.find((x) => x.look.slide)!;
    expect(pose(slide.look, 1, 1, 3.4, 3.2, 0).slide).toBeGreaterThan(3.2);
    const drape = plan.doors.find((x) => x.look.kind === 'curtain')!;
    expect(pose(drape.look, 1, 1, 3.4, 3.2, 0).scaleX).toBeLessThan(0.2);
  });

  it('a wall shows near and thins to nothing far, and is measured to its line, not its middle', () => {
    expect(fogSeen(10)).toBe(1);
    expect(fogSeen(200)).toBe(0);
    expect(wallGap({ kind: 'ring', x: 0, z: 0, radius: 30 }, { x: 0, z: 0 })).toBe(30);
    expect(wallGap({ kind: 'ring', x: 0, z: 0, radius: 30 }, { x: 40, z: 0 })).toBe(10);
    expect(wallGap({ kind: 'doorway', x: 5, z: 5, radius: 0 }, { x: 8, z: 9 })).toBe(5);
  });
});
