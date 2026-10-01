import { describe, expect, it } from 'vitest';
import { RELIC_IDS, RELICS } from '../src/data/relics';
import { createWorldGame } from '../src/systems/game';
import { boon, bountyOf, relicFor, worn } from '../src/systems/relics';
import { mendRate } from '../src/systems/sanity';

describe('relics and tempers (round 26)', () => {
  it('each gift has a price', () => {
    for (const id of RELIC_IDS) {
      const r = RELICS[id] as Record<string, number | string>;
      const good = (k: string, v: number) => (k === 'taken' ? v < 1 : v > 1);
      const gifts = Object.entries(r).filter(([k, v]) => typeof v === 'number' && good(k, v));
      const prices = Object.entries(r).filter(([k, v]) => typeof v === 'number' && !good(k, v));
      expect(gifts.length, id).toBeGreaterThan(0);
      expect(prices.length, id).toBeGreaterThan(0);
    }
  });

  it('a horror slain leaves a relic, each a different one, until all are worn', () => {
    const g = createWorldGame();
    expect(worn(g)).toEqual([]);
    for (let i = 0; i < RELIC_IDS.length + 2; i++) {
      const id = relicFor(g, 'Dagon');
      if (!id) break;
      g.overworld!.told.add('relic:' + id);
    }
    expect(worn(g).length).toBe(RELIC_IDS.length);
    expect(relicFor(g, 'Dagon')).toBeUndefined();
  });

  it('worn relics change bounties and mending', () => {
    const g = createWorldGame();
    expect(bountyOf(g, 100)).toBe(100);
    g.overworld!.told.add('relic:blackCoin');
    expect(bountyOf(g, 100)).toBe(130);
    g.mind.sanity = 50;
    g.overworld!.told.add('relic:yellowSeal');
    expect(boon(g, 'mend')).toBeCloseTo(0.35);
    expect(mendRate(g)).toBeGreaterThanOrEqual(0);
  });
});
