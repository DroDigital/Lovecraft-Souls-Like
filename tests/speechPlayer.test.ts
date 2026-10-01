// The spoken word's player: a line plays its recording if there is one, one voice at a time,
// and plays nothing, quietly, where there is none. A fake context stands in for WebAudio.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clipOf } from '../src/data/speech';
import type { AudioEngine } from '../src/render/audio/engine';
import { createSpeech, mannerOf, trim } from '../src/render/audio/speech';

interface Node {
  connect: (n: Node) => Node;
  disconnect: ReturnType<typeof vi.fn>;
  [k: string]: unknown;
}
interface Source extends Node {
  buffer: unknown;
  playbackRate: { value: number };
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 60; i++) await Promise.resolve(); // the fetches and decodes settle in microtasks
};

function fakeEngine(): { engine: AudioEngine; sources: Source[]; delays: Node[] } {
  const sources: Source[] = [];
  const delays: Node[] = [];
  const param = (v = 1) => ({ value: v, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() });
  const node = (): Node => {
    const n: Node = { connect: (x) => x, disconnect: vi.fn() };
    return n;
  };
  const ctx = {
    currentTime: 0,
    decodeAudioData: async (b: ArrayBuffer) => ({ length: b.byteLength }),
    createBufferSource: () => {
      const s = { ...node(), buffer: null, playbackRate: { value: 1 }, start: vi.fn(), stop: vi.fn(), onended: null } as Source;
      sources.push(s);
      return s;
    },
    createGain: () => ({ ...node(), gain: param() }),
    createDelay: () => {
      const d = { ...node(), delayTime: { value: 0 } };
      delays.push(d);
      return d;
    },
  };
  return { engine: { ctx, speech: node() } as unknown as AudioEngine, sources, delays };
}

let files: Record<string, string | ArrayBuffer>;
let asked: string[];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  files = {};
  asked = [];
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url);
    const hit = files[url];
    if (hit === undefined) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => JSON.parse(hit as string), arrayBuffer: async () => hit as ArrayBuffer };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const LINE = 'Go on. I will be here.';
const OTHER = 'Rest at the signs.';
const clip = (speaker: string, text: string): string => clipOf(speaker, text);

describe('how a voice is played', () => {
  it('follows the cast: a horror lowered with a hall behind it, a person plain, a stranger plain', () => {
    expect(mannerOf('npc:peaslee')).toEqual({ rate: 1, echo: 0, gain: 1 });
    expect(mannerOf('boss:cthulhu').rate).toBeLessThan(1);
    expect(mannerOf('boss:cthulhu').echo).toBeGreaterThan(0);
    expect(mannerOf('npc:nobody')).toEqual({ rate: 1, echo: 0, gain: 1 });
  });

  it('lets go the oldest of what is kept', () => {
    const m = new Map([['a', 1], ['b', 2], ['c', 3]]);
    trim(m, 2);
    expect([...m.keys()]).toEqual(['b', 'c']);
    trim(m, 5);
    expect(m.size).toBe(2);
  });
});

describe('a line said', () => {
  it('plays its recording when it has one, at its voice\'s rate', async () => {
    const id = clip('boss:cthulhu', LINE);
    files['v/index.json'] = JSON.stringify([id]);
    files[`v/${id}.mp3`] = new ArrayBuffer(64);
    const { engine, sources, delays } = fakeEngine();
    const speech = createSpeech(engine, 'v/');
    speech.say('boss:cthulhu', LINE);
    await flush();
    expect(sources).toHaveLength(1);
    expect(sources[0].start).toHaveBeenCalledOnce();
    expect(sources[0].playbackRate.value).toBe(mannerOf('boss:cthulhu').rate);
    expect(delays).toHaveLength(1); // its hall
    expect(speech.speaking).toBe(true);
    sources[0].onended?.();
    expect(speech.speaking).toBe(false);
  });

  it('plays nothing, and throws nothing, where it has no recording or no list', async () => {
    const { engine, sources } = fakeEngine();
    const speech = createSpeech(engine, 'v/'); // no index.json at all
    speech.say('npc:peaslee', LINE);
    await flush();
    expect(sources).toHaveLength(0);
    expect(speech.speaking).toBe(false);
    expect(asked).toEqual(['v/index.json']); // and no recording is asked for that is not listed

    files['v/index.json'] = '{"not":"a list"}';
    const again = createSpeech(fakeEngine().engine, 'v/');
    again.say('npc:peaslee', LINE);
    await flush();
    expect(again.speaking).toBe(false);
  });

  it('plays nothing for a recording that will not load, and goes on', async () => {
    const id = clip('npc:peaslee', LINE);
    files['v/index.json'] = JSON.stringify([id]); // listed, but the file is missing
    const { engine, sources } = fakeEngine();
    const speech = createSpeech(engine, 'v/');
    speech.say('npc:peaslee', LINE);
    await flush();
    expect(sources).toHaveLength(0);
    speech.say('npc:peaslee', LINE); // asked again: remembered as not loading, no second fetch
    await flush();
    expect(asked.filter((a) => a === `v/${id}.mp3`)).toHaveLength(1);
  });

  it('is one voice at a time: the next cuts off the last, and stop cuts off whoever speaks', async () => {
    const [a, b] = [clip('npc:peaslee', LINE), clip('npc:peaslee', OTHER)];
    files['v/index.json'] = JSON.stringify([a, b]);
    files[`v/${a}.mp3`] = new ArrayBuffer(64);
    files[`v/${b}.mp3`] = new ArrayBuffer(64);
    const { engine, sources } = fakeEngine();
    const speech = createSpeech(engine, 'v/');
    speech.say('npc:peaslee', LINE);
    await flush();
    speech.say('npc:peaslee', OTHER);
    await flush();
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).toHaveBeenCalled(); // the first was faded out
    expect(sources[1].stop).not.toHaveBeenCalled();
    speech.stop();
    expect(sources[1].stop).toHaveBeenCalled();
    expect(speech.speaking).toBe(false);
  });

  it('does not play a line that was said and then cut off before it had loaded', async () => {
    const [a, b] = [clip('npc:peaslee', LINE), clip('npc:peaslee', OTHER)];
    files['v/index.json'] = JSON.stringify([a, b]);
    files[`v/${a}.mp3`] = new ArrayBuffer(64);
    files[`v/${b}.mp3`] = new ArrayBuffer(64);
    const { engine, sources } = fakeEngine();
    const speech = createSpeech(engine, 'v/');
    speech.say('npc:peaslee', LINE);
    speech.say('npc:peaslee', OTHER); // before the first has come
    await flush();
    expect(sources).toHaveLength(1); // only the one last said
    speech.say('npc:peaslee', LINE);
    speech.stop(); // a talk that ended
    await flush();
    expect(sources).toHaveLength(1);
  });

  it('has a talk\'s lines fetched ahead, only those that exist, and each once', async () => {
    const [a, b] = [clip('npc:peaslee', LINE), clip('npc:peaslee', OTHER)];
    files['v/index.json'] = JSON.stringify([a]); // only the first has been recorded
    files[`v/${a}.mp3`] = new ArrayBuffer(64);
    const { engine, sources } = fakeEngine();
    const speech = createSpeech(engine, 'v/');
    speech.ahead('npc:peaslee', [LINE, OTHER]);
    await flush();
    speech.ahead('npc:peaslee', [LINE, OTHER]);
    speech.say('npc:peaslee', LINE);
    await flush();
    expect(asked.filter((x) => x.endsWith('.mp3'))).toEqual([`v/${a}.mp3`]);
    expect(asked).not.toContain(`v/${b}.mp3`);
    expect(sources).toHaveLength(1); // it was ready when it was said
  });
});
