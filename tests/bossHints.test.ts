import { describe, expect, it } from 'vitest';
import { bossHints } from '../src/ui/hints';
import { bossGame } from './bossHelpers';

describe('what each boss asks besides striking is said before the fight (round 25)', () => {
  const cases: [string, string[]][] = [
    ['cthulhu', ['ship']], // (a head too high for a bullet is still a head that stoops)
    ['dunwich_horror', ['powder']],
    ['ghatanothoa', ['cover', 'stoop']],
    ['shub_niggurath', ['roots', 'stoop']],
    ['yog_sothoth', ['spheres']],
    ['azathoth', ['blind', 'stoop']],
    ['deep_one', []],
  ];
  it.each(cases)('%s', (id, want) => {
    const { g, boss } = bossGame(id);
    const got = bossHints(g, boss);
    for (const w of want) expect(got, id).toContain(w);
    if (!want.length) expect(got).toEqual([]);
  });
});
