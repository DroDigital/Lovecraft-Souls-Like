/**
 * The title theme's loop, as a crossfade (playtest round 22). Before it, the theme leapt from its
 * ending back to its lead-in, with a dip of 30 ms either side, and a leap is heard: measured offline,
 * the level jumped by 5 dB and the timbre changed (a centroid of 200 Hz to 540 Hz) inside a tenth of a
 * second. The track ends with its last hit ringing out on a low C, and opens with a lead-in swelling
 * toward its first hit on the same C, so each pass gives way to the next by overlapping them: the
 * ending's decay fades out (equal power, THEME.overlap seconds) under the next pass's lead-in fading in,
 * and the first hit lands as the fade ends. The level runs smoothly from the ring to the swell, in one
 * key, with nothing cut, dipped or repeated; and the gap between the last hit and the first is what
 * the track always had, six seconds.
 *
 * The element cannot be crossfaded with itself, and a second element may be refused sound (round 9), so
 * from the first crossfade on the theme plays from the whole track decoded, its passes scheduled on the
 * audio clock, sample-accurate and several ahead, which a timer held back in a hidden tab cannot miss.
 * Nothing here touches the page but the audio graph it is handed.
 */

import { THEME } from '../../data/tuning';

const STEPS = 96;
const curve = (f: (x: number) => number): Float32Array<ArrayBuffer> => Float32Array.from({ length: STEPS }, (_, i) => f(i / (STEPS - 1)));

/** Equal-power gains across a crossfade: the outgoing voice's, and the incoming's. */
export const FADE_OUT = curve((x) => Math.cos((x * Math.PI) / 2));
export const FADE_IN = curve((x) => Math.sin((x * Math.PI) / 2));

/** Where, in a track `duration` seconds long, a pass begins to give way to the next: its ending has rung on, and the last of the file (its encoder's padding) is left out. */
export const seamAt = (duration: number): number => duration - THEME.trim - THEME.overlap;

/** Where the next pass comes in from, so that its first hit lands as the crossfade ends. */
export const seamIn = (): number => THEME.hit - THEME.overlap;

/** Seconds from one crossfade's beginning to the next. */
export const passLength = (duration: number): number => seamAt(duration) - seamIn();

const AHEAD = 3; // passes kept scheduled, the one sounding included

export interface ThemeLoop {
  /** The first pass comes in at audio time `at` (the element's pass fades out under it, music.ts). */
  begin(at: number): void;
  /** Keeps passes scheduled ahead. */
  tick(): void;
  /** Every pass stops. */
  stop(): void;
}

/** The whole track, fetched and decoded for `ctx`. */
export async function decodeTheme(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  return ctx.decodeAudioData(await res.arrayBuffer());
}

export function createThemeLoop(ctx: BaseAudioContext, out: AudioNode, buffer: AudioBuffer): ThemeLoop {
  const length = passLength(buffer.duration);
  const sounding = new Set<AudioBufferSourceNode>();
  let next = Infinity; // audio time the next pass to schedule comes in

  /** A pass from `next`: in over the last one's ending, out under the next one's lead-in. */
  const schedule = (): void => {
    const at = next;
    next += length;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.setValueCurveAtTime(FADE_IN, at, THEME.overlap);
    gain.gain.setValueCurveAtTime(FADE_OUT, at + length, THEME.overlap);
    source.connect(gain).connect(out);
    source.start(at, seamIn());
    source.stop(at + length + THEME.overlap + 0.05);
    sounding.add(source);
    source.onended = () => {
      sounding.delete(source);
      gain.disconnect();
    };
  };

  return {
    begin(at) {
      next = at;
      for (let k = 0; k < AHEAD; k++) schedule();
    },
    tick() {
      while (next - ctx.currentTime < length * (AHEAD - 1)) schedule();
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
