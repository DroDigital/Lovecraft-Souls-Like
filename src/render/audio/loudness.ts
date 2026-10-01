/**
 * What a realm's track needs before it can sound (round 28; data/realmMusic.ts): its level, to
 * bring it to the music's one loudness whatever the take, and its loop points, so that it loops
 * from the middle of its body: where a track begins in a swell and ends in a fade, a crossfade of
 * its end into its start would dip. Read from the decoded samples in half-second windows; the
 * body is where a window reaches REALM_MUSIC.steady of the median. Pure: no WebAudio.
 */

import { REALM_MUSIC } from '../../data/realmMusic';

export interface Analysis {
  gain: number; // × the track, to reach the target RMS without a peak over the ceiling
  start: number; // seconds: the loop's first and last instants, within the body
  end: number;
  rms: number; // of the body, before the gain (linear)
  peak: number; // of the body, before the gain
  levels: number; // windows read
}

/** The level (RMS across the channels) of each `window`-second stretch. */
export function windowLevels(channels: readonly Float32Array[], rate: number, window: number = REALM_MUSIC.window): { rms: number[]; peak: number[] } {
  const n = Math.max(1, Math.round(rate * window));
  const count = Math.floor((channels[0]?.length ?? 0) / n);
  const [rms, peak] = [new Array<number>(count).fill(0), new Array<number>(count).fill(0)];
  for (let w = 0; w < count; w++) {
    let [sum, top] = [0, 0];
    for (const ch of channels) {
      for (let i = w * n; i < (w + 1) * n; i++) {
        const v = ch[i];
        sum += v * v;
        top = Math.max(top, Math.abs(v));
      }
    }
    rms[w] = Math.sqrt(sum / (n * channels.length));
    peak[w] = top;
  }
  return { rms, peak };
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
export const dB = (linear: number): number => 20 * Math.log10(Math.max(1e-9, linear));
export const fromDB = (db: number): number => Math.pow(10, db / 20);

/** The gain, and the loop's body, of a decoded track. A silent track has a gain of 1 and the whole file for its body. */
export function analyse(channels: readonly Float32Array[], rate: number): Analysis {
  const { window, steady, target, ceiling } = REALM_MUSIC;
  const { rms, peak } = windowLevels(channels, rate, window);
  const mid = median(rms.filter((x) => x > 1e-5));
  const whole = (channels[0]?.length ?? 0) / rate;
  if (!mid || rms.length < 4) return { gain: 1, start: 0, end: whole, rms: 0, peak: 0, levels: rms.length };
  const steadyAt = rms.map((x) => x >= steady * mid);
  const first = steadyAt.indexOf(true);
  const last = steadyAt.lastIndexOf(true);
  const [a, b] = [first * window, (last + 1) * window];
  let [sum, top, n] = [0, 0, 0];
  for (let w = first; w <= last; w++) {
    sum += rms[w] * rms[w];
    top = Math.max(top, peak[w]);
    n++;
  }
  const body = Math.sqrt(sum / Math.max(1, n));
  const gain = Math.min(fromDB(target) / Math.max(1e-6, body), ceiling / Math.max(1e-6, top));
  return { gain, start: a, end: Math.min(b, whole), rms: body, peak: top, levels: rms.length };
}

export interface Region {
  start: number;
  end: number;
  overlap: number; // seconds a pass gives way to the next
}

/** The loop of a track `duration` long: its body, with a crossfade of REALM_MUSIC.overlap, or, where the body is too short for that, a shorter one, or the whole file. */
export function loopRegion(a: Pick<Analysis, 'start' | 'end'>, duration: number): Region {
  const { overlap, least } = REALM_MUSIC;
  let [start, end] = [a.start, a.end];
  if (end - start < least) [start, end] = [0, duration]; // no body to speak of: the whole file
  const length = end - start;
  return { start, end, overlap: Math.max(0.5, Math.min(overlap, length / 4)) };
}

/** Seconds from one pass's beginning to the next's: the loop's length less the crossfade. */
export const passLength = (r: Region): number => r.end - r.start - r.overlap;
