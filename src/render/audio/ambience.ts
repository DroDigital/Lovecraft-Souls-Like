/**
 * Recorded ambience (playtest round 6): where the investigator stands, its beds (data/samples.ts)
 * loop under the drone. Each bed is read twice, half a loop apart and panned apart, so one mono
 * recording surrounds the listener without repeating in step. Another place's beds crossfade in over
 * AUDIO.fade as the last ones fade, once they have loaded; faded, the last place's beds are let go (a
 * decoded bed is megabytes). Spot sounds come now and then, far off: panned anywhere, dulled, each at
 * random within its interval.
 */

import { SAMPLE_SETS, type Ambience, type Spot } from '../../data/samples';
import { AUDIO } from '../../data/tuning';
import type { AudioEngine } from './engine';
import type { Sampler } from './sampler';

export interface AmbienceBeds {
  /** Holds `a` (null: silence). Its beds start once they have loaded. */
  set(a: Ambience | null): void;
  /** Spot sounds, on the game's clock (seconds). */
  update(seconds: number): void;
}

const EDGE = 0.06; // seconds of each end a loop skips: an MP3's encoder padding, where a browser keeps it
const WIDTH = 0.6; // how far apart a bed's two readers are panned

interface Playing {
  a: Ambience;
  stop(): void;
}

/** When a spot next sounds: `now` plus a wait drawn from its interval. */
export const nextSpot = (s: Spot, now: number, rand: () => number): number => now + s.every[0] + (s.every[1] - s.every[0]) * rand();

export function createAmbience(e: AudioEngine, sampler: Sampler): AmbienceBeds {
  let want: Ambience | null = null;
  let playing: Playing | null = null;
  let spots: { spot: Spot; next: number }[] = [];
  let clock = 0;
  let asked: Ambience | null = null; // whose beds are loading

  function start(ctx: AudioContext, out: AudioNode, a: Ambience): Playing {
    const now = ctx.currentTime;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, now);
    level.gain.linearRampToValueAtTime(1, now + AUDIO.fade);
    level.connect(out);
    const sources: AudioBufferSourceNode[] = [];
    for (const [file, gain] of a.beds) {
      const buf = sampler.buffer(`amb/${file}`);
      if (!buf || buf.duration < 4 * EDGE) continue;
      for (const side of [-1, 1]) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        [src.loopStart, src.loopEnd] = [EDGE, buf.duration - EDGE];
        const g = ctx.createGain();
        g.gain.value = gain * Math.SQRT1_2; // two unrelated readers sum to the bed's level
        const pan = ctx.createStereoPanner();
        pan.pan.value = side * WIDTH;
        src.connect(g).connect(pan).connect(level);
        src.start(now, side < 0 ? EDGE : buf.duration / 2);
        sources.push(src);
      }
    }
    return {
      a,
      stop() {
        const t = ctx.currentTime;
        level.gain.cancelScheduledValues(t);
        level.gain.setValueAtTime(level.gain.value, t);
        level.gain.linearRampToValueAtTime(0, t + AUDIO.fade);
        for (const s of sources) s.stop(t + AUDIO.fade + 0.1);
        setTimeout(() => {
          const keep = new Set(want?.beds.map(([file]) => file));
          sampler.forget(a.beds.map(([file]) => file).filter((f) => !keep.has(f)).map((f) => `amb/${f}`)); // decoded, a bed is megabytes
        }, (AUDIO.fade + 0.5) * 1000);
      },
    };
  }

  function reconcile(): void {
    const { ctx, bed } = e;
    if (!ctx || !bed || playing?.a === want) return;
    const a = want;
    if (a === null) {
      playing?.stop();
      playing = null;
      spots = [];
      return;
    }
    if (!a.beds.every(([file]) => sampler.settled(`amb/${file}`))) {
      if (asked !== a) void sampler.load(a.beds.map(([file]) => `amb/${file}`)).then(() => want === a && reconcile()); // until then the last beds play on
      asked = a;
      return;
    }
    playing?.stop();
    playing = start(ctx, bed, a);
    spots = a.spots.map((spot) => ({ spot, next: nextSpot(spot, clock, Math.random) }));
  }

  return {
    set(a) {
      if (a === want) return;
      want = a;
      reconcile();
    },
    update(seconds) {
      clock = seconds;
      reconcile();
      for (const s of spots) {
        if (seconds < s.next) continue;
        s.next = nextSpot(s.spot, seconds, Math.random);
        sampler.play(SAMPLE_SETS[s.spot.set], { pan: (Math.random() * 2 - 1) * 0.85, lowpass: 2500 + 3500 * Math.random(), bus: e.bed ?? undefined });
      }
    },
  };
}
