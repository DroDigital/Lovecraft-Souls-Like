import { describe, expect, it } from 'vitest';
import { loadRecords, noteEnding, RECORDS_KEY } from '../src/systems/records';
import type { SaveStore } from '../src/systems/save';

const memory = (): SaveStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

describe('records that outlive a save (round 12)', () => {
  it('remember each ending reached once, and every dream finished', () => {
    const store = memory();
    expect(loadRecords(store)).toEqual({ endings: [], finished: 0 });
    noteEnding(store, 'seal');
    noteEnding(store, 'herald');
    expect(noteEnding(store, 'seal')).toEqual({ endings: ['seal', 'herald'], finished: 3 });
    store.removeItem('lovecraft-souls-like/save'); // beginning anew forgets the save, not the records
    expect(loadRecords(store).endings).toEqual(['seal', 'herald']);
  });

  it('shrug off a damaged record', () => {
    const store = memory();
    store.setItem(RECORDS_KEY, '{"endings":["seal","nonsense",3],"finished":-4}');
    expect(loadRecords(store)).toEqual({ endings: ['seal'], finished: 1 });
    store.setItem(RECORDS_KEY, 'not json');
    expect(loadRecords(store)).toEqual({ endings: [], finished: 0 });
    expect(loadRecords(null)).toEqual({ endings: [], finished: 0 });
  });
});
