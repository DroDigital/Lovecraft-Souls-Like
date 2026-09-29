import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME } from '../src/data/tuning';
import type { AudioEngine } from '../src/render/audio/engine';
import { playMenuMusic } from '../src/render/audio/music';

/** A browser's answers to the title's theme (round 20: after Quit to title, the element could play while WebAudio stayed suspended, and the theme never sounded). */
class FakeAudio {
  static allow = true;
  static made: FakeAudio[] = [];
  paused = true;
  volume = 0;
  currentTime = 0;
  duration = 100;
  loop = false;
  preload = '';
  constructor(public src: string) {
    FakeAudio.made.push(this);
  }
  addEventListener(): void {}
  play(): Promise<void> {
    if (!FakeAudio.allow) return Promise.reject(new Error('NotAllowedError'));
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
}

class FakeContext {
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  private listeners: (() => void)[] = [];
  addEventListener(_: string, fn: () => void): void {
    this.listeners.push(fn);
  }
  removeEventListener(_: string, fn: () => void): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }
  run(): void {
    this.state = 'running';
    for (const l of [...this.listeners]) l();
  }
  createGain(): never {
    throw new Error('no graph in a test: the element plays by itself');
  }
}

const listeners = new Map<string, ((e: unknown) => void)[]>();
const settled = async (p: Promise<void>): Promise<boolean> => Promise.race([p.then(() => true), Promise.resolve().then(() => Promise.resolve()).then(() => false)]);

function browser(o: { allow: boolean; running: boolean }): { engine: AudioEngine; ctx: FakeContext; started: () => number } {
  FakeAudio.allow = o.allow;
  const ctx = new FakeContext();
  if (o.running) ctx.state = 'running';
  let made = false;
  let starts = 0;
  const engine = {
    get ctx() {
      return made ? (ctx as unknown as AudioContext) : null;
    },
    music: null,
    start(): void {
      starts++;
      made = true;
    },
  } as unknown as AudioEngine;
  return { engine, ctx, started: () => starts };
}

describe('the title theme sounds only where it can be heard (round 20)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudio.made = [];
    listeners.clear();
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('addEventListener', (type: string, fn: (e: unknown) => void) => listeners.set(type, [...(listeners.get(type) ?? []), fn]));
    vi.stubGlobal('removeEventListener', (type: string, fn: (e: unknown) => void) => listeners.set(type, (listeners.get(type) ?? []).filter((l) => l !== fn)));
    vi.stubGlobal('requestAnimationFrame', () => 0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const press = (): void => void (listeners.get('keydown') ?? []).forEach((fn) => fn({}));

  it('everything allowed: it sounds at once, with no key asked for', async () => {
    const { engine } = browser({ allow: true, running: true });
    const music = playMenuMusic(engine, 1);
    await vi.advanceTimersByTimeAsync(10);
    expect(await settled(music.sounding)).toBe(true);
    expect(FakeAudio.made[0].paused).toBe(false);
  });

  it('autoplay refused: the key is asked for, and the theme sounds on it', async () => {
    const { engine } = browser({ allow: false, running: true });
    const music = playMenuMusic(engine, 1);
    await vi.advanceTimersByTimeAsync(10);
    expect(await settled(music.refused)).toBe(true);
    expect(await settled(music.sounding)).toBe(false);
    FakeAudio.allow = true; // a key press is a gesture
    press();
    await vi.advanceTimersByTimeAsync(10);
    expect(await settled(music.sounding)).toBe(true);
  });

  it('the element may play but WebAudio sleeps: the theme waits, paused, and asks for a key (it used to play into the void and open the menu over silence)', async () => {
    const { engine, ctx } = browser({ allow: true, running: false });
    const music = playMenuMusic(engine, 1);
    await vi.advanceTimersByTimeAsync(THEME.wake * 1000 + 50);
    expect(await settled(music.refused)).toBe(true);
    expect(await settled(music.sounding)).toBe(false);
    expect(FakeAudio.made[0].paused).toBe(true);
    press(); // the key: WebAudio wakes
    ctx.run();
    await vi.advanceTimersByTimeAsync(10);
    expect(await settled(music.sounding)).toBe(true);
    expect(FakeAudio.made[0].paused).toBe(false);
  });

  it('WebAudio waking a moment after the element plays is waited for, not refused', async () => {
    const { engine, ctx } = browser({ allow: true, running: false });
    const music = playMenuMusic(engine, 1);
    await vi.advanceTimersByTimeAsync(THEME.wake * 500);
    ctx.run();
    await vi.advanceTimersByTimeAsync(10);
    expect(await settled(music.sounding)).toBe(true);
  });
});
