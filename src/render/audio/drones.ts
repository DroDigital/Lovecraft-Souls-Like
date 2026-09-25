/**
 * Drones (Phase 6): the held beds under play. The region's drone crossfades into the next region's,
 * and a boss fight swells a darker bed beneath it. Every drone oscillator sags and drifts with the
 * sanity FX's detune and wobble; a failing mind bends the sound but never turns it up (playtest
 * round 5: the sanity drone that rose with madness is gone).
 */

import { AUDIO } from '../../data/tuning';
import { DRONES, droneOf, type Drone } from '../../data/voices';
import type { FxParams } from '../fx';
import type { AudioEngine } from './engine';
import { noiseSource } from './synth';

export interface Drones {
  /** Holds `bed` (a region id, 'arena', 'title', or null for silence), with a boss fight's bed beneath it or not. */
  set(bed: string | null, boss: boolean): void;
  /** Follows the sanity FX (none on the title screen). */
  update(fx: FxParams | null, seconds: number): void;
}

interface Bed {
  level: GainNode; // fades in and out
  oscs: OscillatorNode[];
  stop(): void;
}

function startBed(ctx: AudioContext, out: AudioNode, d: Drone, fade: number, swellHz: number): Bed {
  const now = ctx.currentTime;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, now);
  if (fade > 0) level.gain.linearRampToValueAtTime(d.gain, now + fade);
  const swell = ctx.createGain(); // breathes around 1
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = swellHz;
  depth.gain.value = AUDIO.swell;
  lfo.connect(depth).connect(swell.gain);
  swell.connect(level).connect(out);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = d.cutoff;
  tone.connect(swell);
  const oscs = d.ratios.map((r) => {
    const osc = ctx.createOscillator();
    osc.type = d.wave;
    osc.frequency.value = d.hz * r;
    osc.connect(tone);
    return osc;
  });
  const sources: AudioScheduledSourceNode[] = [lfo, ...oscs];
  if (d.noise) {
    const hiss = noiseSource(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = d.noiseHz ?? 400;
    const g = ctx.createGain();
    g.gain.value = d.noise / d.gain; // relative to the bed's level
    hiss.connect(f).connect(g).connect(swell);
    sources.push(hiss);
  }
  for (const s of sources) s.start(now);
  return {
    level,
    oscs,
    stop() {
      const t = ctx.currentTime;
      level.gain.cancelScheduledValues(t);
      level.gain.setValueAtTime(level.gain.value, t);
      level.gain.linearRampToValueAtTime(0, t + fade);
      for (const s of sources) s.stop(t + fade + 0.1);
    },
  };
}

export function createDrones(e: AudioEngine): Drones {
  let want: string | null = null;
  let wantBoss = false;
  let bedId: string | null = null;
  let bed: Bed | null = null;
  let boss: Bed | null = null;
  let swells = 0;
  const nextSwell = (): number => AUDIO.swellHz * (1 + 0.37 * (swells++ % 3));

  function reconcile(ctx: AudioContext, out: AudioNode): void {
    if (want !== bedId) {
      bed?.stop();
      const d = want === null ? undefined : droneOf(want);
      bed = d ? startBed(ctx, out, d, AUDIO.fade, nextSwell()) : null;
      bedId = want;
    }
    if (wantBoss !== (boss !== null)) {
      boss?.stop();
      boss = wantBoss ? startBed(ctx, out, DRONES.boss, AUDIO.bossFade, nextSwell()) : null;
    }
  }

  return {
    set(id, b) {
      want = id;
      wantBoss = b;
    },
    update(fx, seconds) {
      const { ctx, bed: out } = e;
      if (!ctx || !out) return;
      reconcile(ctx, out);
      const now = ctx.currentTime;
      const detune = fx?.detune ?? 0;
      const wobble = fx?.wobble ?? 0;
      let i = 0;
      for (const b of [bed, boss]) {
        for (const osc of b?.oscs ?? []) osc.detune.setTargetAtTime(detune + wobble * Math.sin(seconds * (0.5 + 0.31 * i++)), now, 0.1);
      }
    },
  };
}
