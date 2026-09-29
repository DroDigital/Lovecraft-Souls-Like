import { describe, expect, it } from 'vitest';
import { ECHO_FX } from '../src/data/tuning';
import { createEchoFx } from '../src/render/echoFx';
import { shares, stepWisp, wispCount, type Wisp } from '../src/render/echoPath';
import type { ParticleSpec, Particles } from '../src/render/particles';
import { createGame } from '../src/systems/game';
import { spawnDrop } from '../src/systems/spawn';

const wisp = (o: Partial<Wisp> = {}): Wisp => ({ x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, age: 0, rise: 0.8, hold: 0.3, lift: 1.6, turn: 1, phase: 0, amount: 10, ...o });

/** Runs a wisp toward a target that may move; the seconds it took to be taken in, or Infinity. */
function flight(w: Wisp, target: (t: number) => { x: number; y: number; z: number }, dt = 1 / 60, limit = 12): number {
  for (let t = 0; t < limit; t += dt) if (stepWisp(w, dt, target(t))) return t;
  return Infinity;
}

describe('the wisps of Echoes (round 20: render/echoPath.ts)', () => {
  it('a bounty is parted into more wisps the more it is, between the fewest and the most, and no Echo is lost', () => {
    const [least, most] = ECHO_FX.wisps;
    expect(wispCount(1)).toBe(least);
    expect(wispCount(1e9)).toBe(most);
    let was = 0;
    for (const b of [1, 5, 20, 80, 300, 1200, 5000, 20000, 90000]) {
      const n = wispCount(b);
      expect(n).toBeGreaterThanOrEqual(was);
      was = n;
      const parts = shares(b, n);
      expect(parts).toHaveLength(n);
      expect(parts.reduce((a, x) => a + x, 0)).toBe(b);
      expect(Math.min(...parts)).toBeGreaterThanOrEqual(0);
    }
    expect(shares(2, 5).reduce((a, x) => a + x, 0)).toBe(2); // fewer Echoes than wisps: some carry none, the first all
  });

  it('rises out of the body and hangs before it is drawn: up, and not far from where it left', () => {
    const w = wisp({ x: 4, z: 3 });
    const chest = { x: 0, y: 1.25, z: 0 };
    const start = { x: w.x, y: w.y, z: w.z };
    for (let t = 0; t < w.rise + w.hold - 0.05; t += 1 / 60) {
      expect(stepWisp(w, 1 / 60, chest)).toBe(false);
      expect(Math.hypot(w.x - start.x, w.z - start.z)).toBeLessThan(ECHO_FX.sway * 1.1 * (w.rise + w.hold)); // it circles about the place it left
    }
    expect(w.y).toBeGreaterThan(start.y + 0.3); // it is up out of the body
  });

  it('is drawn in from wherever it hangs, on a standing chest and on one running away, within the time it is given', () => {
    for (const [x, z] of [[1, 0], [5, -4], [-9, 6], [12, 12]]) {
      for (const turn of [1, -1] as const) {
        const still = flight(wisp({ x, z, turn }), () => ({ x: 0, y: 1.25, z: 0 }));
        expect(still, `${x},${z}`).toBeLessThan(0.8 + 0.3 + ECHO_FX.give);
        const fled = flight(wisp({ x, z, turn }), (t) => ({ x: 6 * t, y: 1.25, z: 0 })); // sprinting away at 6 m/s
        expect(fled, `${x},${z} running`).toBeLessThan(0.8 + 0.3 + ECHO_FX.give);
      }
    }
  });

  it('is taken in at once when the investigator is far off (a long journey), and never overshoots by a frame’s step', () => {
    expect(stepWisp(wisp({ age: 5 }), 0.1, { x: ECHO_FX.far + 20, y: 1, z: 0 })).toBe(true);
    const w = wisp({ age: 2, x: 0.6, y: 1.25, z: 0, vx: -12, vy: 0, vz: 0 });
    expect(stepWisp(w, 0.1, { x: 0, y: 1.25, z: 0 })).toBe(true); // it would have passed through the chest
  });
});

/** Particles that only count what they are given. */
function counting(): Particles & { made: ParticleSpec[] } {
  const made: ParticleSpec[] = [];
  return { made, spawn: (p) => void made.push(p), update: () => undefined };
}

describe('the Echoes of a slain foe (round 20: render/echoFx.ts)', () => {
  const setup = (bounty: number) => {
    const g = createGame();
    const [player, dummy] = [...g.ecs.c.combatant.keys()];
    g.ecs.c.combatant.get(dummy)!.bounty = bounty;
    const fx = counting();
    const heard: { sound: string; pitch?: number }[] = [];
    const echo = createEchoFx(g, fx, { stinger: (sound, o) => void heard.push({ sound, pitch: o?.pitch }) });
    const at = g.ecs.c.transform.get(dummy)!.pos;
    return { g, player, dummy, fx, heard, echo, at };
  };
  const run = (echo: ReturnType<typeof setup>['echo'], seconds: number, from = 0): number => {
    let t = from;
    for (; t < from + seconds; t += 1 / 60) echo.update(t);
    return t;
  };

  it('a foe the investigator kills lets its bounty go as wisps that are drawn in one by one, the count held back until they land', () => {
    const { g, player, dummy, fx, heard, echo, at } = setup(240);
    echo.update(0);
    g.events.emit('Died', { entity: dummy, killer: player, at: { ...at } });
    expect(echo.pending()).toBe(240);
    expect(heard.map((h) => h.sound)).toEqual(['release']);
    let t = run(echo, 1.4);
    const mid = echo.pending();
    expect(mid).toBeLessThanOrEqual(240);
    expect(fx.made.length).toBeGreaterThan(50); // heart, halo and motes, frame after frame
    t = run(echo, 8, t);
    expect(echo.pending()).toBe(0);
    const absorbed = heard.filter((h) => h.sound === 'absorb');
    expect(absorbed.length).toBeGreaterThan(1);
    expect(absorbed.length).toBeLessThanOrEqual(wispCount(240));
    const pitches = absorbed.map((h) => h.pitch!);
    expect([...pitches].sort((a, b) => a - b)).toEqual(pitches); // each breath a little higher
  });

  it('a foe that fell to something else, or one with no bounty, lets go of nothing; the investigator’s own death drops what was in flight', () => {
    const { g, player, dummy, echo, at } = setup(240);
    echo.update(0);
    g.events.emit('Died', { entity: dummy, killer: null, at: { ...at } });
    expect(echo.pending()).toBe(0);
    g.ecs.c.combatant.get(dummy)!.bounty = 0;
    g.events.emit('Died', { entity: dummy, killer: player, at: { ...at } });
    expect(echo.pending()).toBe(0);
    g.ecs.c.combatant.get(dummy)!.bounty = 90;
    g.events.emit('Died', { entity: dummy, killer: player, at: { ...at } });
    expect(echo.pending()).toBe(90);
    g.events.emit('Died', { entity: player, killer: dummy, at: { ...at } });
    expect(echo.pending()).toBe(0);
  });

  it('Echoes recovered from where the investigator fell stream up out of the drop', () => {
    const { g, echo, at, heard } = setup(0);
    echo.update(0);
    spawnDrop(g, 333, { x: at.x + 1, y: at.y, z: at.z });
    g.events.emit('Echoes', { change: 'recovered', amount: 333, total: 333 });
    expect(echo.pending()).toBe(333);
    expect(heard[0].sound).toBe('release');
    run(echo, 9);
    expect(echo.pending()).toBe(0);
  });
});
