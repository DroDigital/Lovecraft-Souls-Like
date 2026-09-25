/**
 * Recorded sounds (playtest round 6): each file fetched and decoded once (from public/audio), and a
 * set (data/samples.ts) played as one of its takes, never the same one twice running, at a pitch
 * drawn from its range, through its own gain and panner (and a low-pass, to dull what is far off)
 * into the one-shots bus, where the sanity FX bend it as they bend the recipes. A set with nothing
 * loaded plays nothing, and says so: the caller falls back to the recipe.
 */

import { SAMPLE_PITCH, type SampleSet } from '../../data/samples';
import { AUDIO } from '../../data/tuning';
import type { AudioEngine } from './engine';
import type { PlayOptions } from './synth';

export const AUDIO_BASE = 'audio/'; // served from public/, beside the page

export interface SampleOptions extends PlayOptions {
  lowpass?: number; // Hz: dulled by distance
  bus?: AudioNode; // the one-shots bus by default
}

export interface Sampler {
  /** Fetches and decodes these files (paths under audio/, no extension) once WebAudio runs. */
  load(files: readonly string[]): Promise<void>;
  /** A decoded file, or null while it loads (or if it failed). */
  buffer(file: string): AudioBuffer | null;
  /** Whether a file has finished loading, or failing to. */
  settled(file: string): boolean;
  /** Lets decoded files go (a place's beds once they have faded): they load again when asked for. */
  forget(files: readonly string[]): void;
  /** Plays one take of `set` now; false when none has loaded (or too many sounds play). */
  play(set: SampleSet, o?: SampleOptions): boolean;
}

/** The take to play: any loaded one but the last, at random. */
export function pickTake(loaded: readonly string[], last: string | undefined, rand: () => number): string | undefined {
  const pool = loaded.length > 1 ? loaded.filter((f) => f !== last) : loaded;
  return pool[Math.floor(rand() * pool.length)];
}

export function createSampler(e: AudioEngine, base = AUDIO_BASE): Sampler {
  const buffers = new Map<string, AudioBuffer | null>(); // null: it failed
  const pending = new Map<string, Promise<void>>();
  const last = new WeakMap<SampleSet, string>();
  const fetchOne = (ctx: BaseAudioContext, file: string): Promise<void> => {
    let p = pending.get(file);
    if (!p) {
      p = fetch(`${base}${file}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${file}: ${r.status}`))))
        .then((bytes) => ctx.decodeAudioData(bytes))
        .then(
          (buf) => void buffers.set(file, buf),
          () => void buffers.set(file, null), // the recipe plays instead
        );
      pending.set(file, p);
    }
    return p;
  };
  return {
    load(files) {
      return new Promise((resolve) => e.onStart((ctx) => void Promise.all(files.map((f) => fetchOne(ctx, f))).then(() => resolve())));
    },
    buffer: (file) => buffers.get(file) ?? null,
    settled: (file) => buffers.has(file),
    forget(files) {
      for (const f of files) {
        buffers.delete(f);
        pending.delete(f);
      }
    },
    play(set, o = {}) {
      const { ctx, sfx } = e;
      if (!ctx || !sfx || e.playing >= AUDIO.polyphony || (o.gain ?? 1) <= 0.001) return false;
      const file = pickTake(set.files.filter((f) => buffers.get(`sfx/${f}`)), last.get(set), Math.random);
      if (!file) return false;
      last.set(set, file);
      const [lo, hi] = set.pitch ?? SAMPLE_PITCH;
      const src = ctx.createBufferSource();
      src.buffer = buffers.get(`sfx/${file}`)!;
      src.playbackRate.value = (lo + (hi - lo) * Math.random()) * (o.pitch ?? 1);
      src.detune.value = e.detune; // the sanity FX's sag, as the recipes take it
      const out = ctx.createGain();
      out.gain.value = set.gain * (o.gain ?? 1);
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, o.pan ?? 0));
      let node: AudioNode = src;
      if (o.lowpass && o.lowpass < 18000) {
        const dull = ctx.createBiquadFilter();
        dull.type = 'lowpass';
        dull.frequency.value = o.lowpass;
        node = node.connect(dull);
      }
      node.connect(out).connect(pan).connect(o.bus ?? sfx);
      e.playing++;
      src.onended = () => {
        e.playing--;
        pan.disconnect();
      };
      src.start();
      return true;
    },
  };
}

/** Every one-shot file the sets name, as the sampler loads them. */
export const setFiles = (sets: Iterable<SampleSet>): string[] => [...new Set([...sets].flatMap((s) => s.files.map((f) => `sfx/${f}`)))];
