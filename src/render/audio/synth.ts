/**
 * Plays sound recipes (data/sounds.ts) on the engine: each layer is an oscillator (with its glide
 * and vibrato) or a loop of generated white noise, through its filter sweep and envelope, into one
 * gain and stereo panner per sound. New oscillators start at the engine's sanity detune. Beyond
 * AUDIO.polyphony one-shots at once, new ones are dropped.
 */

import type { Layer, Sound } from '../../data/sounds';
import { AUDIO } from '../../data/tuning';
import type { AudioEngine } from './engine';

export interface PlayOptions {
  gain?: number;
  pan?: number; // -1 left .. 1 right
  pitch?: number; // frequency ratio
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, generated once per context. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 1926;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = seed / 2 ** 31 - 1;
    }
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

/** A looping noise source starting at a random point. */
export function noiseSource(ctx: BaseAudioContext): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  return src;
}

function source(ctx: AudioContext, l: Layer, t0: number, t1: number, pitch: number, detune: number): AudioScheduledSourceNode {
  if (l.src === 'noise') return noiseSource(ctx);
  const osc = ctx.createOscillator();
  osc.type = l.src;
  osc.frequency.setValueAtTime((l.hz ?? 440) * pitch, t0);
  if (l.to) osc.frequency.exponentialRampToValueAtTime(l.to * pitch, t1);
  osc.detune.value = detune;
  if (l.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = l.vibrato[0];
    depth.gain.value = l.vibrato[1];
    lfo.connect(depth).connect(osc.detune);
    lfo.start(t0);
    lfo.stop(t1);
  }
  return osc;
}

/** Plays `sound` now; returns false when it was dropped (no WebAudio yet, or too many playing). */
export function playSound(e: AudioEngine, sound: Sound, o: PlayOptions = {}): boolean {
  const { ctx, sfx } = e;
  if (!ctx || !sfx || sound.length === 0 || e.playing >= AUDIO.polyphony || (o.gain ?? 1) <= 0.001) return false;
  const start = ctx.currentTime + 0.005;
  const pitch = o.pitch ?? 1;
  const out = ctx.createGain();
  out.gain.value = o.gain ?? 1;
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.max(-1, Math.min(1, o.pan ?? 0));
  out.connect(pan).connect(sfx);
  let last: AudioScheduledSourceNode | null = null;
  let end = 0;
  for (const l of sound) {
    const t0 = start + (l.at ?? 0);
    const t1 = t0 + l.dur;
    const src = source(ctx, l, t0, t1, pitch, e.detune);
    let node: AudioNode = src;
    if (l.filter) {
      const f = ctx.createBiquadFilter();
      f.type = l.filter.type;
      f.frequency.setValueAtTime(l.filter.hz * pitch, t0);
      if (l.filter.to) f.frequency.exponentialRampToValueAtTime(l.filter.to * pitch, t1);
      f.Q.value = l.filter.q ?? 1;
      node = node.connect(f);
    }
    const env = ctx.createGain();
    const attack = Math.min(l.attack ?? 0.005, l.dur * 0.9);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(l.gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0005, t1);
    node.connect(env).connect(out);
    if (src instanceof AudioBufferSourceNode) src.start(t0, Math.random() * 1.9);
    else src.start(t0);
    src.stop(t1 + 0.02);
    if (t1 >= end) [end, last] = [t1, src];
  }
  e.playing++;
  last!.onended = () => {
    e.playing--;
    pan.disconnect();
  };
  return true;
}
