import { describe, expect, it } from 'vitest';
import { HABITS, TIER_NAMES, weaknessLine, wherever } from '../src/data/bestiaryFacts';
import { FIELD_NOTES } from '../src/data/bestiaryNotes';
import { DOCUMENTS, NOTE_SITES } from '../src/data/documents';
import { ENTITIES } from '../src/data/registry';
import { ARCHETYPE_IDS, TIERS } from '../src/data/schema';
import { REGIONS } from '../src/data/regions';
import { beheld } from '../src/ui/bestiaryPage';
import { worldLayout } from '../src/world/placements';

describe('the bestiary (round 34)', () => {
  it('has a field note for every creature, and none for anything not in the roster', () => {
    const ids = new Set(ENTITIES.map((e) => e.id));
    expect(ENTITIES.filter((e) => !FIELD_NOTES[e.id]).map((e) => e.id)).toEqual([]);
    expect(Object.keys(FIELD_NOTES).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('keeps its notes to a line or two, finished, and in their own words', () => {
    for (const [id, note] of Object.entries(FIELD_NOTES)) {
      expect(note.length, id).toBeGreaterThan(60);
      expect(note.length, id).toBeLessThan(260);
      expect(/[.!?"”]$/.test(note), `${id} ends`).toBe(true);
      expect(note, id).not.toMatch(/\s{2,}|undefined|TODO/);
    }
    expect(new Set(Object.values(FIELD_NOTES)).size).toBe(Object.keys(FIELD_NOTES).length);
  });

  it('says how every kind of behaviour fights, and names every tier', () => {
    expect(ARCHETYPE_IDS.filter((a) => !HABITS[a])).toEqual([]);
    expect(TIERS.filter((t) => !TIER_NAMES[t])).toEqual([]);
  });

  it('writes down what hurts a creature and what turns the blow, and where it is met', () => {
    expect(weaknessLine({ weak: ['fire'], resist: ['slash', 'shot'] })).toBe('Hurt by fire. Turns the blade and the revolver.');
    expect(weaknessLine({})).toBe('');
    for (const e of ENTITIES) {
      expect(e.regions.every((r) => REGIONS.some((x) => x.id === r)), e.id).toBe(true);
      expect(wherever(e).length, e.id).toBeGreaterThan(0);
    }
  });

  it('lists only what has been beheld, in the roster\'s order', () => {
    const mind = { seen: new Set(['mi_go', 'deep_one', 'not_a_creature']) } as never;
    expect(beheld({ mind }).map((e) => e.id)).toEqual(['deep_one', 'mi_go']);
  });
});

describe('the field notes left about the world (round 34)', () => {
  it('has a note to find in every realm, two in most, each of them written', () => {
    for (const r of REGIONS) expect((NOTE_SITES[r.id] ?? []).length, r.id).toBeGreaterThanOrEqual(1);
    for (const sites of Object.values(NOTE_SITES)) for (const [name] of sites) expect(DOCUMENTS[name]?.kind, name).toBe('note');
    expect(Object.entries(NOTE_SITES).filter(([, s]) => s.length >= 2).length).toBeGreaterThanOrEqual(12);
  });

  it('puts every one of them in the world, once, on dry ground clear of any dungeon', () => {
    const placed = worldLayout().tomes.filter((t) => t.note).map((t) => t.name);
    const wanted = Object.values(NOTE_SITES).flat().map(([n]) => n);
    expect(placed.sort()).toEqual([...wanted].sort());
    expect(Object.keys(DOCUMENTS).filter((n) => DOCUMENTS[n].kind === 'note').sort()).toEqual([...wanted].sort()); // none written and never placed
  });
});
