// The recordings in public/voice: the list and the files agree, each is a real clip of a line
// that is still said (a changed word names a new recording and leaves the old one behind), and they stay
// small enough to ship. Not every line has to be recorded yet: a line with no recording is shown, not heard.
// `VOICES_INDEX=1` rewrites index.json from the files in the folder first; `VOICES_TODO=<file>` writes the
// lines that have no recording yet, for whoever makes them (who says it, in which voice, and how it is performed).
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clipOf } from '../src/data/speech';
import { CAST } from '../src/data/speechCast';
import { speechLines } from '../src/data/speechLines';

const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}; // (the tests carry no Node typings)
const DIR = 'public/voice';
const onDisk = (): string[] => readdirSync(DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort();

if (env.VOICES_INDEX) writeFileSync(`${DIR}/index.json`, `${JSON.stringify(onDisk(), null, 1)}\n`);

const listed = JSON.parse(readFileSync(`${DIR}/index.json`, 'utf8')) as string[];
const lines = new Map(speechLines().map((l) => [clipOf(l.speaker, l.text), l]));

describe('the recordings (public/voice)', () => {
  it('are listed in index.json, sorted and without repeats, exactly those in the folder', () => {
    expect(Array.isArray(listed) && listed.every((x) => typeof x === 'string')).toBe(true);
    expect(listed).toEqual([...new Set(listed)].sort());
    expect(listed, 'run the tests with VOICES_INDEX=1 to list what is in the folder').toEqual(onDisk());
  });

  it('are each of a line that is still said, by the name of its speaker and its words', () => {
    for (const id of listed) expect(lines.has(id), `${id} is of no line: its words changed, or no one says it any more`).toBe(true);
  });

  it('are audio files of a length worth hearing, and small enough to ship', () => {
    let total = 0;
    for (const id of listed) {
      const file = `${DIR}/${id}.mp3`;
      expect(existsSync(file), file).toBe(true);
      const size = statSync(file).size;
      const head = readFileSync(file);
      const mpeg = (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0); // an ID3 tag, or a frame
      expect(mpeg, `${id} is not an mp3`).toBe(true);
      expect(size, id).toBeGreaterThan(8_000); // half a second at 128 kbit/s
      expect(size, id).toBeLessThan(400_000); // some twenty-five seconds
      total += size;
    }
    expect(total).toBeLessThan(40 * 2 ** 20);
  });

  it('are credited, with where they were made', () => {
    const credits = readFileSync(`${DIR}/CREDITS.md`, 'utf8');
    expect(credits).toMatch(/Eleven v4/);
    expect(credits).toMatch(/ElevenLabs/);
  });
});

describe('the recordings still to make', () => {
  it('are found, each with a voice to be made in', () => {
    const todo = [...lines].filter(([id]) => !listed.includes(id)).map(([clip, l]) => ({ clip, speaker: l.speaker, voice: CAST[l.speaker]?.voice, name: CAST[l.speaker]?.name, say: l.say }));
    for (const t of todo) expect(t.voice, `${t.speaker} is cast in no voice`).toBeDefined();
    expect(todo.length + listed.length).toBe(lines.size);
    if (env.VOICES_TODO) writeFileSync(env.VOICES_TODO, `${JSON.stringify(todo, null, 1)}\n`);
  });
});
