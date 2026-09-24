import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { ENTITIES, getEntity, variantOf } from '../src/data/registry';
import { ROSTER, ROSTER_IDS } from '../src/data/roster';
import type { EntityDef } from '../src/data/schema';
import { validateRegistry } from '../src/data/validate';

/** A copy of the registry with one entry changed. */
function withChange(id: string, change: (d: EntityDef) => EntityDef): EntityDef[] {
  return ENTITIES.map((d) => (d.id === id ? change(structuredClone(d)) : d));
}

const deepOne = getEntity('deep_one')!;

describe('validateRegistry', () => {
  it('finds nothing wrong with the registry', () => {
    expect(validateRegistry()).toEqual([]);
  });

  it('has a definition for every roster id, and nothing else', () => {
    expect(ENTITIES.map((d) => d.id).sort()).toEqual([...ROSTER_IDS].sort());
    expect(new Set(ROSTER_IDS).size).toBe(ROSTER_IDS.length);
  });

  it('covers every §4 entry (plus the two logged additions)', () => {
    const counts = Object.fromEntries(Object.entries(ROSTER).map(([t, ids]) => [t, ids.length]));
    expect(counts).toEqual({ lesser: 31, greater: 13, named: 29, great_old_one: 12, outer_god: 8, ally: 7 });
  });

  it('leaves out the later-mythos additions the spec excludes', () => {
    const names = ENTITIES.map((d) => `${d.id} ${d.name}`.toLowerCase()).join('\n');
    for (const x of ['cthugha', 'ithaqua', 'byakhee', 'hunting horror', 'dark young', 'tcho']) expect(names).not.toContain(x);
  });

  it('gives every region boss a boss script', () => {
    for (const r of REGIONS) {
      for (const id of r.bosses) {
        const d = getEntity(id)!;
        expect(d.bossScript ?? (d.bossVariant && variantOf(d, 'boss')?.bossScript), `${r.id}: ${id}`).toBeDefined();
      }
    }
  });

  it.each([
    ['a missing definition', ENTITIES.filter((d) => d.id !== 'ghoul'), 'ghoul: in the roster but has no definition'],
    ['an unknown archetype', withChange('ghoul', (d) => ({ ...d, behavior: { ...d.behavior, archetype: 'poet' as never } })), 'ghoul: unknown archetype poet'],
    ['an unknown attack', withChange('ghoul', (d) => ({ ...d, behavior: { ...d.behavior, attacks: ['sonnet' as never] } })), 'ghoul: unknown attack sonnet'],
    ['an unknown region', withChange('ghoul', (d) => ({ ...d, regions: ['boston'] })), 'ghoul: unknown region boston'],
    ['a summon that does not resolve', withChange('cthulhu', (d) => ({ ...d, bossScript: { phases: [{ hpBelow: 1, attacks: [{ id: 'slam', weight: 1 }], summons: ['byakhee'] }] } })), 'cthulhu: phase 0: summon byakhee does not resolve'],
    ['an unknown reality hook', withChange('cthulhu', (d) => ({ ...d, bossScript: { phases: [{ hpBelow: 1, attacks: [{ id: 'slam', weight: 1 }], realityHooks: ['nap' as never] }] } })), 'cthulhu: phase 0: unknown reality hook nap'],
    ['a number out of range', withChange('ghoul', (d) => ({ ...d, stats: { ...d.stats, hp: -5 } })), 'ghoul: hp = -5, expected in [1, 20000]'],
    ['a broken variant', withChange('deep_one', (d) => ({ ...d, eldritchVariant: { sprite: { silhouette: 'teapot' as never } } })), 'deep_one (eldritch variant): unknown silhouette teapot'],
    ['a boss without a script', withChange('yig', (d) => ({ ...d, bossScript: undefined })), 'yig: boss archetype without a boss script'],
    ['an extra definition', [...ENTITIES, { ...deepOne, id: 'cthugha', name: 'Cthugha' }], 'cthugha: defined but not in the roster'],
  ])('reports %s', (_, defs, error) => {
    expect(validateRegistry(defs)).toContain(error);
  });
});
