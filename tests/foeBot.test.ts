/**
 * The bot of botHelpers.ts against every creature in every variant it has, the scripted bosses'
 * plain forms apart (bossBot.test.ts has those): nothing may throw or be left not a number.
 */
import { describe, expect, it } from 'vitest';
import { ENTITIES, type Variant } from '../src/data/registry';
import { botFight } from './botHelpers';

const FRAMES = 60 * 15;
const CASES: [string, Variant | undefined][] = ENTITIES.filter((e) => e.tier !== 'ally').flatMap((e) => [
  ...(e.bossScript ? [] : [[e.id, undefined] as [string, undefined]]),
  ...(e.eldritchVariant ? [[e.id, 'eldritch'] as [string, Variant]] : []),
  ...(e.bossVariant ? [[e.id, 'boss'] as [string, Variant]] : []),
]);

describe('a bot fights every creature in every variant (playtest round 24)', () => {
  it('has creatures to fight', () => expect(CASES.length).toBeGreaterThan(50));

  it.each(CASES)('%s (%s): no throw, nothing left not a number', (id, variant) => {
    expect(botFight(id, FRAMES, variant).bad).toEqual([]);
  });
});
