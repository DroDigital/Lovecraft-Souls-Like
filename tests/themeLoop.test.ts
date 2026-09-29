import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME } from '../src/data/tuning';
import type { AudioEngine } from '../src/render/audio/engine';
import { leapAt, playMenuMusic } from '../src/render/audio/music';
import { createThemeLoop, FADE_IN, FADE_OUT, passLength, seamAt, seamIn } from '../src/render/audio/themeLoop';

const DURATION = 209.16; // the track's length
const LAST_HIT = 202.76; // where its last hit lands (measured offline: the ending rings on from there)

/** A gain's automation, recorded. */
class FakeParam {
  value = 1;
  events: { kind: 'set' | 'curve' | 'cancel'; at: number; curve?: Float32Array; duration?: number; value?: number }[] = [];
  setValueAtTime(value: number, at: number): void {
    this.events.push({ kind: 'set', at, value });
  }
  setValueCurveAtTime(curve: Float32Array, at: number, duration: number): void {
    this.events.push({ kind: 'curve', at, curve, duration });
  }
  cancelScheduledValues(at: number): void {
    this.events.push({ kind: 'cancel', at });
  }
  linearRampToValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
  setTargetAtTime(): void {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = '';
  buffer: { duration: number } | null = null;
  started: { at: number; offset: number } | null = null;
  stopped = false;
  onended: (() => void) | null = null;
  connect(to: unknown): unknown {
    return to;
  }
  disconnect(): void {}
  start(at: number, offset: number): void {
    this.started = { at, offset };
  }
  stop(): void {
    this.stopped = true;
  }
}
class FakeContext {
  currentTime = 0;
  state = 'running';
  sampleRate = 44100;
  gains: FakeNode[] = [];
  sources: FakeNode[] = [];
  decoded: { duration: number } | null = null;
  createGain(): FakeNode {
    const n = new FakeNode();
    this.gains.push(n);
    return n;
  }
  createBiquadFilter(): FakeNode {
    return new FakeNode();
  }
  createMediaElementSource(): FakeNode {
    return new FakeNode();
  }
  createBufferSource(): FakeNode {
    const n = new FakeNode();
    this.sources.push(n);
    return n;
  }
  decodeAudioData(): Promise<{ duration: number }> {
    return Promise.resolve((this.decoded = { duration: DURATION }));
  }
  addEventListener(): void {}
  removeEventListener(): void {}
}
const asCtx = (c: FakeContext): AudioContext => c as unknown as AudioContext;
const asBuffer = (b: { duration: number }): AudioBuffer => b as unknown as AudioBuffer;

describe("the title theme loops by a crossfade (round 22), where a leap was heard", () => {
  it('overlaps the ending and the lead-in so the first hit lands as the fade ends, after the last hit has rung', () => {
    expect(seamIn() + THEME.overlap).toBeCloseTo(THEME.hit, 9); // the incoming pass reaches its first hit as the fade ends
    expect(seamIn()).toBeGreaterThanOrEqual(0); // the overlap fits in the lead-in
    expect(seamAt(DURATION)).toBeGreaterThan(LAST_HIT + 2); // the last hit rings on, whole, before it is faded
    expect(seamAt(DURATION) + THEME.overlap).toBeCloseTo(DURATION - THEME.trim, 9); // the fade ends short of the file's padding
    expect(passLength(DURATION)).toBeCloseTo(seamAt(DURATION) - seamIn(), 9);
    expect(THEME.overlap).toBeGreaterThan(2); // slow enough that it cannot be told from the decay itself
  });

  it('fades at equal power: the two gains always sum, in power, to one', () => {
    expect(FADE_OUT[0]).toBe(1);
    expect(FADE_IN[0]).toBe(0);
    expect(FADE_OUT.at(-1)!).toBeCloseTo(0, 9);
    expect(FADE_IN.at(-1)!).toBeCloseTo(1, 9);
    for (let i = 0; i < FADE_IN.length; i++) {
      expect(FADE_IN[i] ** 2 + FADE_OUT[i] ** 2, `step ${i}`).toBeCloseTo(1, 6);
      if (i) {
        expect(FADE_IN[i]).toBeGreaterThan(FADE_IN[i - 1]);
        expect(FADE_OUT[i]).toBeLessThan(FADE_OUT[i - 1]);
      }
    }
  });

  it('schedules passes on the audio clock, each coming in exactly as the last goes out, and keeps some ahead', () => {
    const ctx = new FakeContext();
    const loop = createThemeLoop(asCtx(ctx), new FakeNode() as unknown as AudioNode, asBuffer({ duration: DURATION }));
    loop.begin(10);
    const L = passLength(DURATION);
    expect(ctx.sources).toHaveLength(3);
    ctx.sources.forEach((s, k) => {
      expect(s.started!.at).toBeCloseTo(10 + k * L, 9);
      expect(s.started!.offset).toBeCloseTo(seamIn(), 9); // each from its lead-in
    });
    const [a, b] = ctx.gains;
    const curves = (g: FakeNode) => g.gain.events.filter((e) => e.kind === 'curve');
    expect(curves(a)).toEqual([
      { kind: 'curve', at: 10, curve: FADE_IN, duration: THEME.overlap },
      { kind: 'curve', at: 10 + L, curve: FADE_OUT, duration: THEME.overlap },
    ]);
    expect(curves(b)[0].at).toBeCloseTo(curves(a)[1].at, 9); // the next comes in as this one goes out
    expect(curves(b)[0].duration).toBe(curves(a)[1].duration);
    expect(curves(a)[0].at + THEME.overlap).toBeLessThan(curves(a)[1].at); // and no curve overlaps another on one gain
    ctx.currentTime = 10 + L * 1.5; // two passes on: another is scheduled, so three stay ahead
    loop.tick();
    expect(ctx.sources.length).toBeGreaterThan(3);
    expect(ctx.sources.at(-1)!.started!.at).toBeGreaterThan(ctx.currentTime);
    const before = ctx.sources.length;
    loop.tick();
    expect(ctx.sources).toHaveLength(before); // and no more than that
    loop.stop();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
    loop.tick();
    expect(ctx.sources).toHaveLength(before); // stopped: nothing more is scheduled
  });
});

/** The title's theme in a page where everything is allowed, the graph and decoder faked. */
describe('the theme crosses over to the loop near its end, and leaps only where the track is not yet decoded', () => {
  class FakeAudio {
    static made: FakeAudio[] = [];
    paused = true;
    volume = 0;
    currentTime = 0;
    duration = DURATION;
    loop = false;
    preload = '';
    constructor(public src: string) {
      FakeAudio.made.push(this);
    }
    addEventListener(): void {}
    play(): Promise<void> {
      this.paused = false;
      return Promise.resolve();
    }
    pause(): void {
      this.paused = true;
    }
  }
  let ctx: FakeContext;
  let engine: AudioEngine;
  let fetches: number;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudio.made = [];
    fetches = 0;
    ctx = new FakeContext();
    engine = { ctx: asCtx(ctx), music: new FakeNode() as unknown as AudioNode, start: () => undefined } as unknown as AudioEngine;
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('addEventListener', () => undefined);
    vi.stubGlobal('removeEventListener', () => undefined);
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('fetch', () => (fetches++, Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const started = async (): Promise<FakeAudio> => {
    playMenuMusic(engine, 1);
    await vi.advanceTimersByTimeAsync(10);
    return FakeAudio.made[0];
  };

  it('decodes the track only as its end nears, and crosses over once it has, fading the element out under the loop', async () => {
    const audio = await started();
    audio.currentTime = 60;
    await vi.advanceTimersByTimeAsync(100);
    expect(fetches).toBe(0); // a title left sooner never pays for it
    audio.currentTime = seamAt(DURATION) - THEME.prepare + 1;
    await vi.advanceTimersByTimeAsync(100);
    expect(fetches).toBe(1);
    audio.currentTime = seamAt(DURATION) + 0.05;
    await vi.advanceTimersByTimeAsync(100);
    expect(ctx.sources.length).toBeGreaterThanOrEqual(3); // the loop has the theme
    const [seam] = ctx.gains; // the element's own (made first, in the route): it fades out under the loop
    expect(seam.gain.events.filter((e) => e.kind === 'curve')).toEqual([{ kind: 'curve', at: expect.any(Number), curve: FADE_OUT, duration: THEME.overlap }]);
    expect(audio.currentTime).toBeCloseTo(seamAt(DURATION) + 0.05, 5); // no leap: the element is left to play its ending out
    expect(audio.paused).toBe(false);
    await vi.advanceTimersByTimeAsync((THEME.overlap + 0.4) * 1000);
    expect(audio.paused).toBe(true); // and stops once it has faded
  });

  it('leaps, as before, where the track has not been decoded in time', async () => {
    const audio = await started();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    audio.currentTime = seamAt(DURATION) - THEME.prepare + 1;
    await vi.advanceTimersByTimeAsync(100);
    audio.currentTime = leapAt(DURATION) + 0.05;
    await vi.advanceTimersByTimeAsync(200);
    expect(audio.currentTime).toBe(THEME.leap[1]); // back to the lead-in
    expect(ctx.sources).toHaveLength(0);
  });
});
