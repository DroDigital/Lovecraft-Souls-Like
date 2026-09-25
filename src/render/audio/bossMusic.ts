/**
 * Boss music (playtest round 4): while a boss fight is engaged, its tier's score (data/music.ts)
 * plays — a low bowed ostinato, timpani, and a choir holding a chord a bar — and each phase
 * quickens it and adds to it (a second drum and a shaker on the off-beats; in the last phase a
 * bell line above). It swells in with the fight and fades when the fight ends or another begins.
 * Notes are scheduled a moment ahead on the audio clock, into the drones' bus, so the sanity FX
 * bends the music too.
 */

import { getEntity } from '../../data/registry';
import { pitchOf, THEMES, type Theme } from '../../data/music';
import { MUSIC } from '../../data/tuning';
import type { AudioEngine } from './engine';
import { noiseSource } from './synth';

/** The fight to score: the boss's roster id and its phase. */
export interface Scored {
  id: string;
  phase: number;
}

export interface BossMusic {
  /** Each frame: the fight to score, or null. */
  update(fight: Scored | null): void;
}

interface Playing {
  id: string;
  theme: Theme;
  out: GainNode;
  next: number; // audio-clock time of the next eighth note
  step: number; // eighth notes played
}

/** A gain that rises to `peak` over `attack` and falls away over the rest of `dur`. */
function env(ctx: AudioContext, t: number, attack: number, peak: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  return g;
}

function osc(ctx: AudioContext, type: OscillatorType, hz: number, t: number, stop: number, detune = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(hz, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

/** A bowed low note: a sawtooth and its sub-octave through a closing low-pass. */
function bass(ctx: AudioContext, out: AudioNode, hz: number, t: number, dur: number, accent: number): void {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(700 + 500 * accent, t);
  f.frequency.exponentialRampToValueAtTime(200, t + dur);
  const sub = ctx.createGain();
  sub.gain.value = 0.4;
  osc(ctx, 'sawtooth', hz, t, t + dur + 0.1).connect(f);
  osc(ctx, 'square', hz / 2, t, t + dur + 0.1).connect(sub).connect(f);
  f.connect(env(ctx, t, 0.012, 0.15 * accent, dur + 0.08)).connect(out);
}

/** A timpano: a sine that drops onto its pitch, and the skin's thud. */
function timpani(ctx: AudioContext, out: AudioNode, hz: number, t: number, level: number): void {
  const o = osc(ctx, 'sine', hz * 1.5, t, t + 1.4);
  o.frequency.exponentialRampToValueAtTime(hz, t + 0.06);
  o.connect(env(ctx, t, 0.004, 0.5 * level, 1.3)).connect(out);
  const n = noiseSource(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 450;
  n.connect(f).connect(env(ctx, t, 0.002, 0.3 * level, 0.18)).connect(out);
  n.start(t, Math.random() * 1.5);
  n.stop(t + 0.2);
}

function shaker(ctx: AudioContext, out: AudioNode, t: number): void {
  const n = noiseSource(ctx);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 5200;
  n.connect(f).connect(env(ctx, t, 0.003, 0.06, 0.08)).connect(out);
  n.start(t, Math.random() * 1.5);
  n.stop(t + 0.1);
}

/** A held chord of voices: two detuned saws a note through an "ah" formant, swelling and falling away. */
function choir(ctx: AudioContext, out: AudioNode, hzs: readonly number[], t: number, dur: number): void {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 820;
  f.Q.value = 2.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.035, t + dur * 0.85);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.35);
  for (const hz of hzs) for (const cents of [-9, 8]) osc(ctx, 'sawtooth', hz, t, t + dur + 0.4, cents).connect(f);
  f.connect(g).connect(out);
}

/** A bell: a sine and an inharmonic partial above it, struck and ringing. */
function bell(ctx: AudioContext, out: AudioNode, hz: number, t: number): void {
  osc(ctx, 'sine', hz, t, t + 1.9).connect(env(ctx, t, 0.003, 0.07, 1.8)).connect(out);
  osc(ctx, 'sine', hz * 2.76, t, t + 1.0).connect(env(ctx, t, 0.002, 0.025, 0.9)).connect(out);
}

/** One eighth note of `p`'s score, in `phase` (0, 1, or 2 and after), at `t`. */
function play(ctx: AudioContext, p: Playing, phase: number, t: number, eighth: number): void {
  const th = p.theme;
  const [beat, bar] = [p.step % 8, Math.floor(p.step / 8)];
  const note = th.ostinato[beat];
  if (note !== null) bass(ctx, p.out, pitchOf(th, note), t, eighth * 0.92, beat === 0 ? 1 : 0.75);
  if (beat === 0) choir(ctx, p.out, th.chords[bar % th.chords.length].map((d) => pitchOf(th, d, 2)), t, eighth * 8);
  if (beat === 0) timpani(ctx, p.out, pitchOf(th, 0), t, 1);
  if (phase >= 1 && beat === 4) timpani(ctx, p.out, pitchOf(th, -3), t, 0.75);
  if (phase >= 1 && bar % 4 === 3 && beat >= 6) timpani(ctx, p.out, pitchOf(th, 0), t, 0.6); // a roll into the next four bars
  if (phase >= 1 && beat % 2 === 1) shaker(ctx, p.out, t);
  const chime = th.bells[beat / 2];
  if (phase >= 2 && beat % 2 === 0 && chime !== null && chime !== undefined) bell(ctx, p.out, pitchOf(th, chime, 3), t);
}

export function createBossMusic(e: AudioEngine): BossMusic {
  let now: Playing | null = null;
  const stop = (ctx: AudioContext, p: Playing): void => {
    const g = p.out.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0, ctx.currentTime + MUSIC.fadeOut);
    setTimeout(() => p.out.disconnect(), (MUSIC.fadeOut + 1) * 1000);
  };
  return {
    update(fight) {
      const { ctx, bed } = e;
      if (!ctx || !bed) return;
      if (now && (!fight || fight.id !== now.id)) {
        stop(ctx, now);
        now = null;
      }
      if (!fight) return;
      if (!now) {
        const out = ctx.createGain();
        out.gain.setValueAtTime(0, ctx.currentTime);
        out.gain.linearRampToValueAtTime(MUSIC.level, ctx.currentTime + MUSIC.fadeIn);
        out.connect(bed);
        now = { id: fight.id, theme: THEMES[getEntity(fight.id)?.tier ?? 'named'], out, next: ctx.currentTime + 0.05, step: 0 };
      }
      const phase = Math.min(fight.phase, 2);
      const eighth = 30 / now.theme.bpm[phase];
      if (now.next < ctx.currentTime) now.next = ctx.currentTime + 0.02; // after a stall, pick up the beat rather than rush the missed notes
      while (now.next < ctx.currentTime + MUSIC.ahead) {
        play(ctx, now, phase, now.next, eighth);
        now.next += eighth;
        now.step++;
      }
    },
  };
}
