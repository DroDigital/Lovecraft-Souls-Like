import { describe, expect, it } from 'vitest';
import { LORE_LINES } from '../src/data/loreLines';
import { STINGERS } from '../src/data/sounds';
import { HURT } from '../src/data/tuning';
import { beatRate, createHeart, nearDeath, swellAt } from '../src/render/feel';
import { createWorldGame } from '../src/systems/game';
import { createTally } from '../src/ui/damageTally';
import { blend } from '../src/ui/hudKit';

describe('the damage tally beside a foe\'s bar (playtest round 14)', () => {
  it('a run of blows adds up, holds, then fades; blows the investigator takes do not count', () => {
    const g = createWorldGame();
    const tally = createTally(g);
    const foe = 9999;
    g.events.emit('Hit', { attacker: g.player.id, target: foe, outcome: 'hit', damage: 20 });
    g.events.emit('Hit', { attacker: g.player.id, target: foe, outcome: 'hit', damage: 22 });
    g.events.emit('Hit', { attacker: foe, target: g.player.id, outcome: 'hit', damage: 50 });
    const now = performance.now();
    expect(tally.total(foe, now)).toEqual(['42', 1]);
    expect(tally.total(foe, now + 1750)[1]).toBeGreaterThan(0);
    expect(tally.total(foe, now + 1750)[1]).toBeLessThan(1);
    expect(tally.total(foe, now + 2100)).toEqual(['', 0]);
    expect(tally.total(g.player.id, now)).toEqual(['', 0]);
  });

  it("the bar's lost share lingers, then drains down to the health left", () => {
    const g = createWorldGame();
    const tally = createTally(g);
    expect(tally.chip(7, 0.8, 0)).toBe(0.8);
    expect(tally.chip(7, 0.5, 100)).toBe(0.8); // held
    expect(tally.chip(7, 0.5, 850)).toBeCloseTo(0.8 - 0.45 * 0.4, 5); // draining, 0.4 s past the hold
    expect(tally.chip(7, 0.5, 900)).toBeCloseTo(0.8 - 0.45 * 0.45, 5); // steadily, however often it is asked
    expect(tally.chip(7, 0.5, 2000)).toBe(0.5); // caught up
  });
});

describe('near death, the heart (playtest rounds 14 and 23)', () => {
  it('beats only below the low share, quickening as it falls, never once fallen', () => {
    expect(beatRate(1)).toBe(0);
    expect(beatRate(HURT.low)).toBe(0);
    expect(beatRate(HURT.low * 0.99)).toBeCloseTo(HURT.beats[0], 1);
    expect(beatRate(HURT.low * 0.01)).toBeCloseTo(HURT.beats[1], 1);
    let last = 0;
    for (let share = HURT.low * 0.99; share > 0.005; share -= 0.01) {
      expect(beatRate(share)).toBeGreaterThanOrEqual(last);
      last = beatRate(share);
    }
    expect(beatRate(0)).toBe(0);
    expect([nearDeath(1), nearDeath(HURT.low), nearDeath(0)]).toEqual([0, 0, 0]);
    expect(nearDeath(HURT.low / 2)).toBeCloseTo(0.5, 9);
    expect(STINGERS.heartbeat.length).toBeGreaterThan(0);
  });

  it('strikes, then strikes softer a beat later, and rests between', () => {
    expect(swellAt(-1)).toBe(0);
    expect(swellAt(0)).toBe(0); // (it comes up over a few hundredths)
    const [first, gap, second] = [swellAt(0.04), swellAt(HURT.dub - 0.02), swellAt(HURT.dub + 0.04)];
    expect(first).toBeGreaterThan(0.6);
    expect(second).toBeGreaterThan(0.3);
    expect(second).toBeLessThan(first);
    expect(gap).toBeLessThan(second);
    expect(swellAt(HURT.dub + 0.9)).toBeLessThan(0.01);
    for (let t = 0; t < 1.5; t += 0.01) expect(swellAt(t)).toBeLessThanOrEqual(1);
    expect(STINGERS.heartbeat.some((l) => l.at === HURT.dub)).toBe(true); // the sound's second stroke is where the picture's is
  });

  it('beats at once on coming near death, at its rate, and never above the line or once fallen', () => {
    const heart = createHeart();
    const run = (share: number, seconds: number): void => {
      for (let i = 0; i < seconds * 60; i++) heart.update((t += 1 / 60), share);
    };
    let t = 0;
    run(1, 2);
    expect([heart.beats, heart.need, heart.swell]).toEqual([0, 0, 0]);
    run(0.25, 1 / 60); // the blow that takes it below the line
    expect(heart.beats).toBe(1);
    expect(heart.need).toBeCloseTo(1 - 0.25 / HURT.low, 9);
    run(0.25, 10);
    expect(Math.abs(heart.beats - 1 - 10 * beatRate(0.25))).toBeLessThan(1); // a beat at its rate (whole beats: within one)
    const before = heart.beats;
    run(0.02, 10);
    expect(Math.abs(heart.beats - before - 10 * beatRate(0.02))).toBeLessThan(1);
    expect(beatRate(0.02)).toBeGreaterThan(beatRate(0.25)); // quicker at death's door
    run(0, 3); // fallen
    expect([heart.need, heart.swell]).toEqual([0, 0]);
    const fallen = heart.beats;
    run(1, 3); // healed
    expect(heart.beats).toBe(fallen);
    run(0.1, 1 / 60); // and near death again: the heart begins again at once
    expect(heart.beats).toBe(fallen + 1);
  });

  it('is not carried past a long frame: a stall of seconds is a tenth of one', () => {
    const heart = createHeart();
    heart.update(0, 0.1);
    const beats = heart.beats;
    heart.update(30, 0.1); // (a stalled tab)
    expect(heart.beats - beats).toBeLessThanOrEqual(1);
  });
});

describe('the health bar throbs with it (round 23)', () => {
  it('blends two colours, whole at each end', () => {
    expect(blend('#74493a', '#c4553f', 0)).toBe('#74493a');
    expect(blend('#74493a', '#c4553f', 1)).toBe('#c4553f');
    expect(blend('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('lines under the veil (playtest round 14)', () => {
  it('are there, short enough to read in a breath', () => {
    expect(LORE_LINES.length).toBeGreaterThan(10);
    for (const l of LORE_LINES) expect(l.length, l).toBeLessThan(120);
  });
});

describe('resting kneels before the stone (playtest round 15)', () => {
  it('rest kneels, turned to the Elder Sign; moving or acting gets up', async () => {
    const { rest, signPlace } = await import('../src/systems/checkpoints');
    const { START_SIGN } = await import('../src/data/sites');
    const { stepGame } = await import('../src/systems/game');
    const { emptyInput } = await import('../src/core/input');
    const { wrapAngle, yawOf } = await import('../src/core/geom');
    const g = createWorldGame();
    const sign = signPlace(START_SIGN)!;
    expect(rest(g, START_SIGN)).toBe(true);
    expect(g.player.kneeling).toEqual({ x: sign.x, z: sign.z });
    for (let i = 0; i < 90; i++) stepGame(g, emptyInput());
    const tr = g.ecs.c.transform.get(g.player.id)!;
    expect(Math.abs(wrapAngle(tr.yaw - yawOf(sign.x - tr.pos.x, sign.z - tr.pos.z)))).toBeLessThan(0.05);
    stepGame(g, { ...emptyInput(), moveY: 1 });
    expect(g.player.kneeling).toBeNull();
  });
});

describe('an epitaph for each great horror (playtest round 15)', () => {
  it('every named horror, Great Old One and Outer God has one, short enough to read in a breath', async () => {
    const { EPITAPHS } = await import('../src/data/epitaphs');
    const { ENTITIES } = await import('../src/data/registry');
    const great = ENTITIES.filter((d) => d.tier === 'named' || d.tier === 'great_old_one' || d.tier === 'outer_god').map((d) => d.id);
    for (const id of great) expect(EPITAPHS[id], id).toBeTruthy();
    for (const [id, line] of Object.entries(EPITAPHS)) {
      expect(great, id).toContain(id);
      expect(line.length, id).toBeLessThan(100);
    }
  });
});
