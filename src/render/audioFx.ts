/**
 * The FX controller's audio half (spec §3A): one master chain that detunes and distorts as sanity
 * falls. For now it carries a single low drone, silent while lucid; Phase 6 routes its sounds
 * through the same chain. WebAudio starts on the first click or key press, as browsers require.
 */

import { AUDIO } from '../data/tuning';
import type { FxParams } from './fx';

export interface AudioFx {
  update(fx: FxParams, seconds: number): void;
}

interface Chain {
  ctx: AudioContext;
  voices: OscillatorNode[];
  shaper: WaveShaperNode;
  gain: GainNode;
  amount: number; // distortion the shaper's curve was built for
}

/** A soft-clipping curve: 0 is clean, 1 is heavily driven. */
function shaperCurve(amount: number): Float32Array<ArrayBuffer> {
  const k = amount * 50;
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

function build(): Chain {
  const ctx = new AudioContext();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = AUDIO.cutoff;
  const shaper = ctx.createWaveShaper();
  shaper.curve = shaperCurve(0);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  filter.connect(shaper).connect(gain).connect(ctx.destination);
  const voices = AUDIO.voices.map((ratio) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = AUDIO.droneHz * ratio;
    osc.connect(filter);
    osc.start();
    return osc;
  });
  return { ctx, voices, shaper, gain, amount: 0 };
}

export function createAudioFx(): AudioFx {
  let chain: Chain | null = null;
  const start = (): void => {
    if (chain) return;
    try {
      chain = build();
    } catch {
      // No WebAudio: the FX stay visual.
    }
  };
  addEventListener('pointerdown', start);
  addEventListener('keydown', start);
  return {
    update(fx, seconds) {
      if (!chain) return;
      const now = chain.ctx.currentTime;
      chain.gain.gain.setTargetAtTime(fx.drone, now, AUDIO.glide);
      chain.voices.forEach((v, i) => v.detune.setTargetAtTime(fx.detune + fx.wobble * Math.sin(seconds * (0.5 + 0.31 * i)), now, 0.1));
      if (Math.abs(fx.distortion - chain.amount) > 0.02) {
        chain.shaper.curve = shaperCurve(fx.distortion);
        chain.amount = fx.distortion;
      }
    },
  };
}
