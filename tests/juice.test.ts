import { describe, expect, it } from 'vitest';
import { LORE_LINES } from '../src/data/loreLines';
import { STINGERS } from '../src/data/sounds';
import { HURT } from '../src/data/tuning';
import { beatRate } from '../src/render/feel';
import { createWorldGame } from '../src/systems/game';
import { createTally } from '../src/ui/damageTally';

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

describe('near death, the heart (playtest round 14)', () => {
  it('beats only below the low share, faster below half of it, never once fallen', () => {
    expect(beatRate(1)).toBe(0);
    expect(beatRate(HURT.low)).toBe(0);
    expect(beatRate(HURT.low * 0.8)).toBe(HURT.beats[0]);
    expect(beatRate(HURT.low * 0.3)).toBe(HURT.beats[1]);
    expect(beatRate(0)).toBe(0);
    expect(STINGERS.heartbeat.length).toBeGreaterThan(0);
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
