import { describe, expect, it } from 'vitest';
import { pickLore, QUOTES, TIPS } from '../src/data/loreLines';

describe('the line under the veil (round 24)', () => {
  it('is one of Lovecraft\'s before anything has come up', () => {
    for (let i = 0; i < 20; i++) expect(QUOTES).toContain(pickLore(new Set(), new Set(), Math.random));
  });

  it('is the first lesson that has come up and has not been said, in order, then Lovecraft\'s', () => {
    const seen = new Set(['echoes', 'fight']);
    const shown = new Set<string>();
    const said: string[] = [];
    for (let i = 0; i < 4; i++) {
      const line = pickLore(seen, shown);
      said.push(line);
      shown.add(line);
    }
    expect(said.slice(0, 3)).toEqual(TIPS.filter((t) => seen.has(t.topic)).map((t) => t.text));
    expect(QUOTES).toContain(said[3]);
  });

  it('never speaks of what has not come up (no fog before a horror)', () => {
    const line = pickLore(new Set(['echoes']), new Set());
    expect(line).toBe(TIPS.find((t) => t.topic === 'echoes')!.text);
    expect(pickLore(new Set(['sign']), new Set()).toLowerCase()).not.toContain('fog');
  });

  it('every lesson names a hint that exists', async () => {
    const src = (await import('node:fs')).readFileSync('src/ui/hints.ts', 'utf8');
    for (const t of TIPS) expect(src, t.topic).toMatch(new RegExp(`\\b${t.topic}:`));
  });
});
