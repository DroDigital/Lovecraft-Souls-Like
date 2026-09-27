import { describe, expect, it } from 'vitest';
import { CHUNK_CRITTERS, CRITTERS, FAUNA as HAUNTS, SKY_VISITORS } from '../src/data/fauna';
import { getEntity } from '../src/data/registry';
import { REGIONS } from '../src/data/regions';
import { FAUNA, LIGHTNING } from '../src/data/tuning';
import { birth, live, passing, startle, type Life } from '../src/render/critterLife';
import { flicker } from '../src/render/lightning';
import { critterAtlas } from '../src/render/sprites/critters';
import { nestsOf, type Nest } from '../src/world/haunts';
import { inDungeon, surface } from '../src/world/terrain';
import { chunkOf, regionRect } from '../src/world/worldMap';

/** Every nest of a region's chunks. */
function nestsIn(regionId: string): Nest[] {
  const r = regionRect(REGIONS.find((x) => x.id === regionId)!);
  const out: Nest[] = [];
  for (let cx = chunkOf(r.x0); cx < chunkOf(r.x1); cx++) for (let cz = chunkOf(r.z0); cz < chunkOf(r.z1); cz++) out.push(...nestsOf(cx, cz));
  return out;
}

const run = (l: Life, seconds: number, me: { x: number; y: number; z: number }, pace = 1.5, from = 0): number => {
  const dt = 1 / 60;
  let t = from;
  for (let i = 0; i < seconds * 60; i++) live(l, dt, (t += dt), me, pace);
  return t;
};

describe('the small lives (round 18: data/fauna.ts, world/haunts.ts, render/critterLife.ts)', () => {
  it('each region with a fauna has its critters, placed the same every time, never on a dungeon floor, perchers up on their props and runners on the ground', () => {
    for (const id of Object.keys(HAUNTS)) {
      const nests = nestsIn(id);
      const kinds = new Set(nests.map((n) => n.critter));
      for (const h of HAUNTS[id]) expect(kinds.has(h.critter), `${id}: ${h.critter}`).toBe(true);
      for (const n of nests) {
        expect(inDungeon(n.x, n.z)).toBe(false);
        const habit = CRITTERS[n.critter].habit;
        const above = n.y - surface(n.x, n.z);
        if (habit === 'perch') expect(above, `${id}: ${n.critter}`).toBeGreaterThan(0.1); // on a wall's top where the ground rises beside it, not far above it
        if (habit === 'scurry' || habit === 'drift') expect(Math.abs(above)).toBeLessThan(0.05);
      }
    }
    const arkham = regionRect(REGIONS.find((x) => x.id === 'arkham')!);
    const [cx, cz] = [chunkOf(arkham.x0) + 3, chunkOf(arkham.z0) + 3];
    expect(nestsOf(cx, cz)).toBe(nestsOf(cx, cz));
    for (let dx = 0; dx < 8; dx++) expect(nestsOf(cx + dx, cz).length).toBeLessThanOrEqual(CHUNK_CRITTERS);
  });

  it('a crow sits until the investigator comes near, then takes wing away from them, climbing, and is gone; it comes back only once they are well away', () => {
    const nest = nestsIn('arkham').find((n) => n.critter === 'crow')!;
    const l = birth(nest);
    const far = { x: nest.x + 40, y: nest.y, z: nest.z };
    let t = run(l, 5, far);
    expect(l.mode).toBe('rest');
    expect([l.x, l.y, l.z]).toEqual([nest.x, nest.y, nest.z]);
    const me = { x: nest.x + CRITTERS.crow.startle - 1, y: nest.y - 4, z: nest.z };
    t = run(l, 0.6, me, 1.5, t);
    expect(l.mode).toBe('flee');
    t = run(l, 2, me, 1.5, t);
    expect(Math.hypot(l.x - me.x, l.z - me.z)).toBeGreaterThan(CRITTERS.crow.startle + 5);
    expect(l.y).toBeGreaterThan(nest.y + 2);
    t = run(l, FAUNA.flight, me, 1.5, t);
    expect(l.mode).toBe('gone');
    t = run(l, FAUNA.goneFor[1] + 1, me, 1.5, t); // the investigator lingers: it stays away
    expect(l.mode).toBe('gone');
    run(l, 1, far, 1.5, t);
    expect(l.mode).toBe('rest');
    expect(l.seen).toBeLessThan(1); // showing again, over a moment
  });

  it('a running investigator startles birds from twice as far; a shot sends them off wherever it is; bats and moths never mind', () => {
    const crow = nestsIn('arkham').find((n) => n.critter === 'crow')!;
    const walker = birth(crow);
    const runner = birth(crow);
    const me = { x: crow.x + CRITTERS.crow.startle * 1.5, y: crow.y, z: crow.z };
    run(walker, 1, me, 1.5);
    run(runner, 1, me, 6);
    expect(walker.mode).toBe('rest');
    expect(runner.mode).toBe('flee');
    const shot = birth(crow);
    expect(startle(shot, { x: crow.x + 25, y: crow.y, z: crow.z })).toBe(true);
    expect(shot.vx).toBeLessThan(0); // away from the shot
    for (const kind of ['bat', 'moth'] as const) {
      const l = birth(nestsIn('arkham').find((n) => n.critter === kind)!);
      expect(startle(l, l)).toBe(false);
    }
  });

  it('bats loop about their haunt, moths about their lamp, a firefly drifts and blinks, a rat runs about and bolts', () => {
    const nests = nestsIn('arkham');
    const me = { x: 1e4, y: 0, z: 1e4 };
    for (const kind of ['bat', 'moth', 'firefly'] as const) {
      const n = nests.find((x) => x.critter === kind)!;
      const l = birth(n);
      let [far, lit, dark] = [0, 0, 0];
      const dt = 1 / 60;
      for (let i = 0, t = 0; i < 60 * 20; i++) {
        live(l, dt, (t += dt), me, 0);
        far = Math.max(far, Math.hypot(l.x - n.x, l.z - n.z));
        if (l.seen > 0.5) lit++;
        else dark++;
      }
      expect(far, kind).toBeGreaterThan(CRITTERS[kind].reach * 0.3);
      expect(far, kind).toBeLessThan(CRITTERS[kind].reach * 1.5);
      if (kind === 'firefly') expect(lit * dark).toBeGreaterThan(0);
    }
    const n = nests.find((x) => x.critter === 'rat')!;
    const rat = birth(n);
    let moved = 0;
    for (let i = 0, t = 0; i < 60 * 20; i++) {
      live(rat, 1 / 60, (t += 1 / 60), me, 0);
      moved = Math.max(moved, Math.hypot(rat.x - n.x, rat.z - n.z));
    }
    expect(moved).toBeGreaterThan(0.5);
    run(rat, 2, { x: rat.x + 1, y: rat.y, z: rat.z });
    expect(rat.mode).toBe('gone');
  });

  it('every critter but the firefly has frames at rest and on the move, drawn', () => {
    const atlas = critterAtlas();
    for (const [id, coats] of Object.entries(atlas.coats)) {
      for (const c of coats) {
        expect(c.rest.length, id).toBeGreaterThan(0);
        expect(c.move.length, id).toBeGreaterThan(0);
      }
    }
    let ink = 0;
    for (let i = 3; i < atlas.data.length; i += 4) if (atlas.data[i] > 0) ink++;
    expect(ink).toBeGreaterThan(1000);
  });

  it('the sky: every visitor is a flock of a bird or a roster creature drawn as a sprite, over a real region; a flock crosses and is gone for good', () => {
    const regions = new Set(REGIONS.map((r) => r.id));
    for (const [id, list] of Object.entries(SKY_VISITORS)) {
      expect(regions.has(id), id).toBe(true);
      for (const v of list) {
        if (v.flock) expect(CRITTERS[v.flock].habit, `${id}: ${v.flock}`).toBe('perch');
        else expect(getEntity(v.shape ?? '')?.sprite, `${id}: ${v.shape}`).toBeDefined();
        expect(v.every[0]).toBeGreaterThan(10); // now and then, not all the time
      }
    }
    const bird = passing({ critter: 'crow', x: 0, y: 20, z: 0, seed: 7 }, 8, 0, FAUNA.pass);
    let [t, seen] = [0, 0];
    for (let i = 0; i < (FAUNA.pass + 1) * 60; i++) {
      live(bird, 1 / 60, (t += 1 / 60), { x: 0, y: 0, z: 0 }, 0);
      seen = Math.max(seen, bird.seen);
      if (i === 120) expect(bird.x).toBeGreaterThan(8);
    }
    expect(seen).toBe(1);
    expect(bird.mode).toBe('gone');
    expect(Math.abs(bird.y - 20)).toBeLessThan(1); // level flight
  });

  it('lightning: three quick pulses dying away, only where storms roll', () => {
    expect(flicker(-0.01)).toBe(0);
    expect(flicker(0)).toBe(1);
    expect(flicker(0.09)).toBeLessThan(flicker(0.15));
    expect(flicker(LIGHTNING.flash)).toBe(0);
    expect(flicker(LIGHTNING.flash * 0.9)).toBeLessThan(0.1);
    for (const id of Object.keys(LIGHTNING.every)) expect(REGIONS.some((r) => r.id === id), id).toBe(true);
  });
});
