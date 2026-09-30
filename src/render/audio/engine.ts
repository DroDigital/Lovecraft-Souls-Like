/**
 * The audio engine (Phase 6): one WebAudio graph. One-shot sounds and drones mix into a shared bus
 * that the sanity FX drives through a saturating waveshaper (the FX controller's audio half, spec §3A), then a
 * compressor and the volume setting. The title's theme joins after the compressor, under the volume
 * setting only (music.ts). The boss scores have a bus of their own beside the drones' (round 12), so
 * the music, effects and ambience settings each set one bus: music the theme's and the scores',
 * effects the one-shots', ambience the drones'. WebAudio starts on the first click or key press, as browsers require (or
 * sooner, `start`, where the browser already lets sound play); until then (or without WebAudio)
 * everything stays silent and nothing fails.
 */

import { AUDIO } from '../../data/tuning';

export interface AudioEngine {
  readonly ctx: AudioContext | null;
  readonly sfx: AudioNode | null; // one-shots in
  readonly bed: AudioNode | null; // drones and ambience in
  readonly score: AudioNode | null; // the boss scores in (sanity FX, like the bed)
  readonly music: AudioNode | null; // the title's theme in: the volume setting only, no sanity FX
  detune: number; // cents new one-shots start at: the sanity FX's sag and drift
  playing: number; // one-shots sounding now (synth.ts counts them against AUDIO.polyphony)
  setVolume(v: number): void;
  /** The music, effects and ambience settings (0..1), each its bus's level. */
  setLevels(l: Levels): void;
  /** The sanity waveshaper: 0 clean, 1 heavily driven. */
  setDistortion(amount: number): void;
  /** Near death the world's sound dulls (round 23): 0 not at all, 1 as far as AUDIO.muffle goes. Not the title's theme. */
  setMuffle(amount: number): void;
  /** Runs `fn` once WebAudio has started (at once if it has). */
  onStart(fn: (ctx: AudioContext) => void): void;
  /** Starts WebAudio now if it has not (a click or key press also starts it), or wakes it. */
  start(): void;
}

/**
 * The sanity saturation's curve: 0 is clean, 1 squashes loud sounds into grit. Its slope at silence
 * is always 1 and it never exceeds its input, so a failing mind never turns the ambience up (the
 * old soft clip's quiet-signal gain of 1 + 50 × amount did, by over 30 dB; playtest round 5).
 */
export function shaperCurve(amount: number): Float32Array<ArrayBuffer> {
  const g = 1 + 1.5 * amount;
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = (1 - amount) * x + (amount * Math.tanh(g * x)) / g;
  }
  return curve;
}

export interface Levels {
  music: number;
  sfx: number;
  ambience: number;
}

interface Graph {
  ctx: AudioContext;
  sfx: GainNode;
  bed: GainNode;
  score: GainNode;
  music: GainNode;
  shaper: WaveShaperNode;
  muffle: BiquadFilterNode;
  master: GainNode;
}

function build(volume: number, levels: Levels): Graph {
  const ctx = new AudioContext();
  const sfx = ctx.createGain();
  const bed = ctx.createGain();
  const score = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.curve = shaperCurve(0);
  const muffle = ctx.createBiquadFilter(); // near death (round 23): the world's high end closes...
  muffle.type = 'lowpass';
  muffle.frequency.value = AUDIO.muffle[0];
  muffle.Q.value = 0.5;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 8;
  const master = ctx.createGain();
  master.gain.value = volume;
  const music = ctx.createGain();
  sfx.connect(shaper);
  bed.connect(shaper);
  score.connect(shaper);
  shaper.connect(muffle).connect(limiter).connect(master).connect(ctx.destination);
  music.connect(master);
  const graph = { ctx, sfx, bed, score, music, shaper, muffle, master };
  setBusLevels(graph, levels);
  return graph;
}

function setBusLevels(g: Graph, l: Levels): void {
  const at = g.ctx.currentTime;
  for (const [node, v] of [[g.music, l.music], [g.score, l.music], [g.sfx, l.sfx], [g.bed, l.ambience]] as const) node.gain.setTargetAtTime(v, at, 0.05);
}

export function createAudioEngine(volume: number, levels: Levels = { music: 1, sfx: 1, ambience: 1 }): AudioEngine {
  let graph: Graph | null = null;
  let amount = 0;
  let muffled = 0; // how far the world's sound is dulled (setMuffle)
  const waiting: ((ctx: AudioContext) => void)[] = [];
  const start = (): void => {
    if (graph) {
      if (graph.ctx.state === 'suspended') void graph.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      graph = build(volume, levels);
    } catch {
      return; // No WebAudio: the game stays silent.
    }
    for (const fn of waiting.splice(0)) fn(graph.ctx);
  };
  addEventListener('pointerdown', start, true);
  addEventListener('keydown', start, true);
  return {
    get ctx() {
      return graph?.ctx ?? null;
    },
    get sfx() {
      return graph?.sfx ?? null;
    },
    get bed() {
      return graph?.bed ?? null;
    },
    get score() {
      return graph?.score ?? null;
    },
    get music() {
      return graph?.music ?? null;
    },
    detune: 0,
    playing: 0,
    setVolume(v) {
      volume = v;
      graph?.master.gain.setTargetAtTime(v, graph.ctx.currentTime, 0.05);
    },
    setLevels(l) {
      levels = { ...l };
      if (graph) setBusLevels(graph, levels);
    },
    setDistortion(a) {
      if (!graph || Math.abs(a - amount) <= 0.02) return;
      graph.shaper.curve = shaperCurve(a);
      amount = a;
    },
    setMuffle(a) {
      const k = Math.min(1, Math.max(0, a));
      if (!graph || (Math.abs(k - muffled) < 0.01 && !(k === 0 && muffled !== 0))) return; // asked every frame: the filter is told only of a change
      const [open, shut] = AUDIO.muffle;
      graph.muffle.frequency.setTargetAtTime(open * Math.pow(shut / open, k), graph.ctx.currentTime, 0.4);
      muffled = k;
    },
    onStart(fn) {
      if (graph) fn(graph.ctx);
      else waiting.push(fn);
    },
    start,
  };
}
