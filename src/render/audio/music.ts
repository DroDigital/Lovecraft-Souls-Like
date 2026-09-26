/**
 * The title's theme: "Subterranean Pulse", looped. It sounds the moment the browser allows: at once
 * where sound may play on opening, else on the first key press or click (until then browsers refuse
 * sound, whatever the page does), which the title's opening asks for (main.ts); the desktop shell
 * lets it sound on opening (desktop/main.js), so there it plays as the game boots. It is buffered while
 * it waits and begins where the track first swells rather than in its near-silent lead-in.
 * It loops by a leap (playtest round 9): one element throughout, since a browser may refuse to start
 * a second one without a key press or click (Safari does, so a second pass never sounded and the
 * theme stopped at its end). Near its end, where the ending has all but decayed, it leaps back to
 * where the lead-in has swelled to the same level a moment before the first hit (THEME.leap), under a
 * dip of a few hundredths of a second so the jump cannot click: no cut and no silence. Should the
 * leap be missed (a throttled timer), the file loops by itself, and the leap skips its lead-in.
 * Played through the audio engine (under the volume setting, beside the sanity FX), its fades run
 * on the audio clock, smooth however long the world takes to build. Spawning in, it sinks away: its
 * level falls evenly in loudness (an exponential fade, not a linear one that holds and then drops)
 * under a closing low-pass, while the world's ambience rises beneath it. Without WebAudio the element
 * plays by itself and fades by its volume.
 */

import { THEME } from '../../data/tuning';
import type { AudioEngine } from './engine';

export interface Music {
  /** Resolves once the theme sounds. */
  readonly sounding: Promise<void>;
  /** Resolves if the browser refused it before a key press or click (it sounds on the first). */
  readonly refused: Promise<void>;
  setVolume(v: number): void;
  /** Sinks away over `seconds`, then stops. */
  fadeOut(seconds?: number): void;
}

export const MENU_MUSIC = 'music/subterranean-pulse.mp3'; // served from public/, beside the page
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const; // what lets a browser play sound
const DIP = 0.03; // seconds the level dips for a leap, on either side of it

/** The theme's level `t` seconds into a sink of `seconds`, from 1: even in loudness, about −43 dB at the end. */
export const sinkLevel = (t: number, seconds: number): number => (t >= seconds ? 0 : Math.exp((-5 * t) / seconds));

/** When, in a track `duration` seconds long, the theme leaps back to THEME.leap[1]. */
export const leapAt = (duration: number): number => duration - THEME.leap[0];

export function playMenuMusic(engine: AudioEngine, volume: number): Music {
  let level = volume;
  let state: 'waiting' | 'playing' | 'sinking' = 'waiting';
  let route: { ctx: AudioContext; gain: GainNode; tone: BiquadFilterNode; seam: GainNode } | null = null;
  const audio = new Audio(MENU_MUSIC);
  audio.preload = 'auto'; // buffered while the title waits, so the first key or click sounds at once
  audio.loop = true; // should a leap be missed, it loops by itself
  audio.volume = 0; // silent until it sounds, then it rises
  audio.currentTime = THEME.from;
  audio.addEventListener('loadedmetadata', () => {
    if (state === 'waiting') audio.currentTime = THEME.from; // in case the start set before loading was not kept
  }, { once: true });
  let [sound, refuse] = [(): void => undefined, (): void => undefined];
  const sounding = new Promise<void>((r) => (sound = r));
  const refused = new Promise<void>((r) => (refuse = r));

  /** Into the engine's graph once WebAudio runs: its fades then run on the audio clock. */
  const connect = (): void => {
    const [ctx, out] = [engine.ctx, engine.music];
    if (route || !ctx || !out) return;
    try {
      const seam = ctx.createGain(); // dips for a leap
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = Math.min(20000, ctx.sampleRate / 2);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(audio).connect(seam).connect(tone).connect(gain).connect(out);
      route = { ctx, gain, tone, seam };
    } catch {
      // It plays by itself, as without WebAudio.
    }
  };
  const rise = (): void => {
    if (route) {
      audio.volume = 1; // the graph sets the level (browsers differ on whether the element's volume reaches it)
      const { ctx, gain } = route;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + THEME.fadeIn);
      return;
    }
    const start = performance.now();
    const step = (): void => {
      if (state !== 'playing') return;
      const t = Math.min(1, (performance.now() - start) / (THEME.fadeIn * 1000));
      audio.volume = level * t;
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  };

  /** The seam's level ramps to `to` over DIP seconds. */
  const dip = (to: number): void => {
    if (!route) return;
    const { ctx, seam } = route;
    const now = ctx.currentTime;
    seam.gain.cancelScheduledValues(now);
    seam.gain.setValueAtTime(seam.gain.value, now);
    seam.gain.linearRampToValueAtTime(to, now + DIP);
  };
  let leaping = false;
  let last = 0; // where it was at the last look
  const leap = setInterval(() => {
    const [t, duration] = [audio.currentTime, audio.duration];
    const looped = t < last - 1 && t < THEME.leap[1]; // it looped by itself: skip the lead-in
    last = t;
    if (state !== 'playing' || leaping || !(duration > 0) || (t < leapAt(duration) && !looped)) return;
    leaping = true;
    dip(0);
    setTimeout(() => {
      audio.currentTime = THEME.leap[1];
      last = THEME.leap[1];
      leaping = false;
      setTimeout(() => dip(1), DIP * 1000); // back up once the jump has been made
    }, route ? DIP * 1000 : 0);
  }, 40);
  const off = (): void => {
    for (const type of GESTURES) removeEventListener(type, gesture, true);
  };
  const begin = (): void => {
    if (state !== 'waiting') return;
    state = 'playing';
    engine.start(); // sound may play now, so WebAudio may start too
    connect();
    rise();
    off();
    sound();
  };
  const tryPlay = (): void => {
    if (state === 'waiting') audio.play().then(begin, refuse);
  };
  function gesture(): void {
    engine.start();
    connect();
    tryPlay();
  }
  for (const type of GESTURES) addEventListener(type, gesture, true);
  tryPlay();
  const stop = (): void => {
    clearInterval(leap);
    audio.pause();
  };

  return {
    sounding,
    refused,
    setVolume(v) {
      level = v;
      if (state === 'playing' && !route) audio.volume = v; // through the graph, the master carries the setting
    },
    fadeOut(seconds = THEME.sink) {
      const was = state;
      if (was === 'sinking') return;
      state = 'sinking';
      off();
      if (was === 'waiting') {
        stop();
        return;
      }
      if (route) {
        const { ctx, gain, tone } = route;
        const now = ctx.currentTime;
        for (const p of [gain.gain, tone.frequency]) {
          p.cancelScheduledValues(now);
          p.setValueAtTime(p.value, now);
        }
        gain.gain.setTargetAtTime(0, now, seconds / 5);
        tone.frequency.exponentialRampToValueAtTime(THEME.sinkTo, now + seconds);
        setTimeout(() => (stop(), gain.disconnect()), seconds * 1000 + 100);
        return;
      }
      const [start, from] = [performance.now(), audio.volume];
      const step = (): void => {
        const t = (performance.now() - start) / 1000;
        audio.volume = from * sinkLevel(t, seconds);
        if (t < seconds) requestAnimationFrame(step);
        else stop();
      };
      step();
    },
  };
}
