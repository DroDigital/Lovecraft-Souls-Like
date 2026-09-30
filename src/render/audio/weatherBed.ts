/**
 * The weather heard (round 26): rain as a hiss of filtered noise, a gale as a low rush that swells and
 * falls in gusts, the dream's motes as nothing (they are silent). Made of the audio engine's own
 * context, in the bed (so the ambience setting governs it, and a horror's hush takes it too); under a
 * dungeon's roof it is a dull far patter.
 */

import type { AudioEngine } from './engine';

export interface WeatherBed {
  /** `kind` and how much of it (0..1), each frame; `inside`: under a roof. */
  set(kind: 'clear' | 'rain' | 'gale' | 'motes', amount: number, inside: boolean): void;
}

/** The levels (0..1) the rain's and the gale's beds are at, by spell and place: a third of the rain under a roof, a fifth of the gale. */
export function levelsOf(kind: 'clear' | 'rain' | 'gale' | 'motes', amount: number, inside: boolean): { rain: number; gale: number } {
  const a = Math.min(1, Math.max(0, amount));
  return { rain: kind === 'rain' ? a * (inside ? 0.33 : 1) : 0, gale: kind === 'gale' ? a * (inside ? 0.2 : 1) : 0 };
}

export function createWeatherBed(e: AudioEngine): WeatherBed {
  let rain: GainNode | null = null;
  let gale: GainNode | null = null;
  e.onStart((ctx) => {
    const out = e.bed;
    if (!out) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = (): AudioBufferSourceNode => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = 3200;
    hiss.Q.value = 0.4;
    rain = ctx.createGain();
    rain.gain.value = 0;
    source().connect(hiss).connect(rain).connect(out);
    const rush = ctx.createBiquadFilter();
    rush.type = 'lowpass';
    rush.frequency.value = 520;
    gale = ctx.createGain();
    gale.gain.value = 0;
    const swell = ctx.createGain(); // the gusts: a slow wave on the rush's level
    swell.gain.value = 0.7;
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.17;
    const depth = ctx.createGain();
    depth.gain.value = 0.3;
    gust.connect(depth).connect(swell.gain);
    gust.start();
    source().connect(rush).connect(swell).connect(gale).connect(out);
  });
  return {
    set(kind, amount, inside) {
      const l = levelsOf(kind, amount, inside);
      const at = (n: GainNode | null, v: number): void => void n?.gain.setTargetAtTime(v, n.context.currentTime, 1.2);
      at(rain, l.rain * 0.16);
      at(gale, l.gale * 0.3);
    },
  };
}
