import { describe, expect, it } from 'vitest';
import { createSlicer } from '../src/core/slicer';
import { WORLD } from '../src/data/tuning';
import { chunkSpan, streamDiff } from '../src/world/streaming';
import { chunkKey, keyChunk } from '../src/world/worldMap';

/** Applies a diff to a loaded set, as the streamers do. */
function step(loaded: Set<number>, cx: number, cz: number): { loaded: number; unloaded: number } {
  const d = streamDiff(loaded, cx, cz);
  for (const c of d.load) loaded.add(c.key);
  for (const k of d.unload) loaded.delete(k);
  return { loaded: d.load.length, unloaded: d.unload.length };
}

describe('chunk streaming', () => {
  it('loads the 5 × 5 chunks around the player, nearest first', () => {
    const d = streamDiff(new Set(), 3, -2);
    expect(WORLD.load).toBe(2);
    expect(d.load).toHaveLength(25);
    expect(d.load[0]).toMatchObject({ cx: 3, cz: -2 });
    for (const c of d.load) expect(chunkSpan(c.cx, c.cz, 3, -2)).toBeLessThanOrEqual(2);
    expect(d.unload).toEqual([]);
  });

  it('unloads only beyond the 7 × 7, so pacing across a border does not thrash', () => {
    const loaded = new Set<number>();
    step(loaded, 0, 0);
    expect(step(loaded, 1, 0)).toEqual({ loaded: 5, unloaded: 0 });
    expect(step(loaded, 0, 0)).toEqual({ loaded: 0, unloaded: 0 });
    expect(step(loaded, 1, 0)).toEqual({ loaded: 0, unloaded: 0 });
    expect(step(loaded, 2, 0)).toEqual({ loaded: 5, unloaded: 5 }); // column -2 is now 4 chunks away
    for (const k of loaded) expect(chunkSpan(...keyChunk(k), 2, 0)).toBeLessThanOrEqual(WORLD.keep);
  });

  it('a long journey keeps at most 7 × 7 chunks', () => {
    const loaded = new Set<number>();
    for (let x = 0; x < 40; x++) {
      step(loaded, x, Math.floor(x / 3));
      expect(loaded.size).toBeLessThanOrEqual(49);
      expect(loaded.has(chunkKey(x, Math.floor(x / 3)))).toBe(true);
    }
  });
});

describe('time slicing', () => {
  it('stops starting steps once the budget is spent, and finishes jobs in order', () => {
    let t = 0;
    const slicer = createSlicer(() => t);
    const done: number[] = [];
    function* job(id: number, steps: number): Generator {
      for (let i = 0; i < steps; i++) {
        t += 0.5; // each step costs half a millisecond
        yield;
      }
      done.push(id);
    }
    slicer.add(1, job(1, 3));
    slicer.add(2, job(2, 3));
    slicer.add(3, job(3, 3));
    const t0 = t;
    expect(slicer.run(WORLD.sliceMs)).toBe(5); // job 1's three steps and its free finish, then one step of job 2
    expect(t - t0).toBeLessThanOrEqual(WORLD.sliceMs);
    expect(done).toEqual([1]);
    slicer.cancel(3);
    slicer.run(100);
    expect(done).toEqual([1, 2]);
    expect(slicer.pending).toBe(0);
  });

  it('finishes one job at once when it cannot wait, leaving the others queued', () => {
    const slicer = createSlicer(() => 0);
    const done: number[] = [];
    function* job(id: number): Generator {
      for (let i = 0; i < 4; i++) yield;
      done.push(id);
    }
    slicer.add(1, job(1));
    slicer.add(2, job(2));
    slicer.finish(2);
    expect(done).toEqual([2]);
    expect([slicer.has(1), slicer.has(2), slicer.pending]).toEqual([true, false, 1]);
  });
});
