import { describe, expect, it } from 'vitest';
import { WEATHER } from '../src/data/tuning';
import { dawnOf, hourOf, moonHigh, phaseOf, windowShare } from '../src/systems/clock';
import { createWorldGame } from '../src/systems/game';
import { kindsOf, quietOf, weatherSystem } from '../src/systems/weather';

describe('the night turns (round 26)', () => {
  it('opens in the gloaming and comes round to it again', () => {
    expect(hourOf(phaseOf(0))).toBe('gloaming');
    expect(phaseOf(1080)).toBeCloseTo(phaseOf(0), 6);
    expect(hourOf(0.4)).toBe('deep');
    expect(hourOf(0.85)).toBe('waning');
  });

  it('its windows go out as it wears on, and are lit again as it turns, with no jump', () => {
    expect(windowShare(0.05)).toBe(1);
    expect(windowShare(0.5)).toBeLessThan(windowShare(0.2));
    expect(windowShare(0.9)).toBeLessThan(windowShare(0.5));
    let worst = 0;
    for (let i = 1; i <= 2000; i++) worst = Math.max(worst, Math.abs(windowShare(i / 2000) - windowShare((i - 1) / 2000)));
    expect(worst).toBeLessThan(0.05);
    expect(windowShare(0.999)).toBeGreaterThan(0.95);
  });

  it('greys before a dawn that does not come, and the moon is low at each end', () => {
    expect(dawnOf(0.3)).toBe(0);
    expect(dawnOf(0.9)).toBeGreaterThan(0.6);
    expect(dawnOf(0.99)).toBeLessThan(0.2);
    expect(dawnOf(1)).toBe(0);
    expect(moonHigh(0.5)).toBeGreaterThan(moonHigh(0.05));
    expect(moonHigh(0.5)).toBeGreaterThan(moonHigh(0.95));
  });
});

describe('the weather (round 26)', () => {
  const run = (region: string, seconds: number) => {
    const g = createWorldGame();
    g.overworld!.region = region;
    const seen = new Set<string>();
    let most = 0;
    for (let f = 0; f < seconds * 60; f++) {
      g.frame++;
      weatherSystem(g, 1 / 60);
      const w = g.overworld!.weather;
      seen.add(w.kind);
      most = Math.max(most, w.amount);
      expect(w.amount).toBeGreaterThanOrEqual(0);
      expect(w.amount).toBeLessThanOrEqual(1);
    }
    return { g, seen, most };
  };

  it('rolls spells of the kinds a region knows over clear skies between, and eases them in', () => {
    const { seen, most } = run('innsmouth', 3600);
    expect(seen.has('clear')).toBe(true);
    expect([...seen].some((k) => k === 'rain' || k === 'gale')).toBe(true);
    for (const k of seen) expect(['clear', ...kindsOf('innsmouth').map(([x]) => x)]).toContain(k);
    expect(most).toBe(1);
  });

  it('stays clear where the region knows none, and stops a spell that has left its region', () => {
    expect([...run('hub', 1800).seen]).toEqual(['clear']);
    const g = createWorldGame();
    g.overworld!.region = 'innsmouth';
    Object.assign(g.overworld!.weather, { kind: 'rain', want: 'rain', amount: 1, until: g.frame + 99999 });
    g.overworld!.region = 'kn_yan';
    for (let i = 0; i < WEATHER.ease * 60 + 5; i++) weatherSystem(g, 1 / 60);
    expect(g.overworld!.weather.kind).toBe('clear');
    expect(g.overworld!.weather.amount).toBe(0);
  });

  it("hushes the investigator's noise in rain, at its fullest by WEATHER.quiet, and not at all when clear", () => {
    const g = createWorldGame();
    expect(quietOf(g)).toBe(1);
    Object.assign(g.overworld!.weather, { kind: 'rain', amount: 1 });
    expect(quietOf(g)).toBeCloseTo(1 - WEATHER.quiet);
    Object.assign(g.overworld!.weather, { kind: 'motes', amount: 1 });
    expect(quietOf(g)).toBe(1);
  });
});
