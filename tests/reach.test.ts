/**
 * Reach (playtest round 24): every creature can be struck by the sword-cane from as near as its body
 * lets the investigator stand. A colossus's hurt capsule was a sphere at its foot, a few metres
 * across at the height of a blade, while its body kept the investigator a colossus's width away:
 * Cthulhu, Ghatanothoa, Yog-Sothoth and Shub-Niggurath could not be touched at all, and the
 * Beyond's order (Yog-Sothoth before Azathoth) shut the Court's endings behind one of them.
 */
import { describe, expect, it } from 'vitest';
import { ENTITIES, type Variant } from '../src/data/registry';
import { WEAPON_IDS } from '../src/data/weapons';
import { landed } from './reachHelpers';

const CASES: [string, Variant | undefined][] = ENTITIES.filter((e) => e.tier !== 'ally').flatMap((e) => [
  [e.id, undefined] as [string, undefined],
  ...(e.eldritchVariant ? [[e.id, 'eldritch'] as [string, Variant]] : []),
  ...(e.bossVariant ? [[e.id, 'boss'] as [string, Variant]] : []),
]);

describe('the sword-cane reaches every creature (playtest round 24)', () => {
  it('has creatures to strike', () => expect(CASES.length).toBeGreaterThan(50));

  it.each(CASES)('%s (%s) takes a blow from where it lets the investigator stand', (id, variant) => {
    expect(landed(id, variant)).toBeGreaterThan(0);
  });
});

/** From a mite to a colossus: the bodies every arm must reach at arm's length (round 24: the espada's thrust was a point at the end of its blade, and passed beyond every foe of a man's size who stood closer than a metre). */
const SIZES = ['zoog', 'cthulhu_cultist', 'deep_one', 'shoggoth', 'father_dagon', 'cthulhu'];

describe('every arm reaches bodies of every size at arm\'s length (playtest round 24)', () => {
  const cases = WEAPON_IDS.flatMap((w) => SIZES.flatMap((id) => (['light', 'heavy'] as const).map((b) => [w, id, b] as const)));
  it.each(cases)('%s on %s: a %s blow lands', (w, id, b) => {
    expect(landed(id, undefined, w, b)).toBeGreaterThan(0);
  });
});
