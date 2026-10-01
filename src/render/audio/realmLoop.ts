/**
 * A realm track's loop with no seam (round 28): the track's body (loudness.ts) is played again and
 * again, each pass fading out, equal power, over the last `overlap` seconds of the body as the next
 * pass fades in over its first `overlap`, begun from the body's start. Both sides of the seam are
 * steady stretches (the body is chosen so), and equal-power gains hold a steady total level across
 * two stretches that are not the same sound, so the seam is not heard. Passes are scheduled on the
 * audio clock a few ahead, sample-accurate, which a timer held back in a hidden tab cannot miss.
 * Nothing here touches the page but the audio graph it is handed.
 */

import { FADE_IN, FADE_OUT } from './themeLoop';
import { passLength, type Region } from './loudness';

const AHEAD = 3; // passes kept scheduled, the one sounding included

/** When each pass begins, from `at`: the first, then every passLength. */
export const passTimes = (at: number, r: Region, count: number): number[] => Array.from({ length: count }, (_, k) => at + k * passLength(r));

export interface RealmLoop {
  /** The first pass begins at audio time `at`. */
  begin(at: number): void;
  /** Keeps passes scheduled ahead. */
  tick(): void;
  /** Every pass stops. */
  stop(): void;
}

export function createRealmLoop(ctx: BaseAudioContext, out: AudioNode, buffer: AudioBuffer, region: Region): RealmLoop {
  const { start, end, overlap } = region;
  const [length, step] = [end - start, passLength(region)];
  const sounding = new Set<AudioBufferSourceNode>();
  let next = Infinity; // audio time the next pass to schedule begins
  let first = true;

  /** A pass from `next`: in over the last one's ending (the first is not faded: its voice's level is), out under the next one's beginning. */
  const schedule = (): void => {
    const at = next;
    next += step;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(first ? 1 : 0, at);
    if (!first) gain.gain.setValueCurveAtTime(FADE_IN, at, overlap);
    gain.gain.setValueCurveAtTime(FADE_OUT, at + length - overlap, overlap);
    first = false;
    source.connect(gain).connect(out);
    source.start(at, start, length);
    sounding.add(source);
    source.onended = () => {
      sounding.delete(source);
      gain.disconnect();
    };
  };

  return {
    begin(at) {
      [next, first] = [at, true];
      for (let k = 0; k < AHEAD; k++) schedule();
    },
    tick() {
      while (next - ctx.currentTime < step * (AHEAD - 1)) schedule();
    },
    stop() {
      next = Infinity;
      for (const s of sounding) {
        try {
          s.stop();
        } catch {
          // not started, or already stopped
        }
      }
      sounding.clear();
    },
  };
}
