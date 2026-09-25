/**
 * The audio engine (Phase 6): one WebAudio graph. One-shot sounds and drones mix into a shared bus
 * that the sanity FX drives through a saturating waveshaper (the FX controller's audio half, spec §3A), then a
 * compressor and the volume setting. The title's theme joins after the compressor, under the volume
 * setting only (music.ts). WebAudio starts on the first click or key press, as browsers require (or
 * sooner, `start`, where the browser already lets sound play); until then (or without WebAudio)
 * everything stays silent and nothing fails.
 */

export interface AudioEngine {
  readonly ctx: AudioContext | null;
  readonly sfx: AudioNode | null; // one-shots in
  readonly bed: AudioNode | null; // drones in
  readonly music: AudioNode | null; // the title's theme in: the volume setting only, no sanity FX
  detune: number; // cents new one-shots start at: the sanity FX's sag and drift
  playing: number; // one-shots sounding now (synth.ts counts them against AUDIO.polyphony)
  setVolume(v: number): void;
  /** The sanity waveshaper: 0 clean, 1 heavily driven. */
  setDistortion(amount: number): void;
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

interface Graph {
  ctx: AudioContext;
  sfx: GainNode;
  bed: GainNode;
  music: GainNode;
  shaper: WaveShaperNode;
  master: GainNode;
}

function build(volume: number): Graph {
  const ctx = new AudioContext();
  const sfx = ctx.createGain();
  const bed = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.curve = shaperCurve(0);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 8;
  const master = ctx.createGain();
  master.gain.value = volume;
  const music = ctx.createGain();
  sfx.connect(shaper);
  bed.connect(shaper);
  shaper.connect(limiter).connect(master).connect(ctx.destination);
  music.connect(master);
  return { ctx, sfx, bed, music, shaper, master };
}

export function createAudioEngine(volume: number): AudioEngine {
  let graph: Graph | null = null;
  let amount = 0;
  const waiting: ((ctx: AudioContext) => void)[] = [];
  const start = (): void => {
    if (graph) {
      if (graph.ctx.state === 'suspended') void graph.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      graph = build(volume);
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
    get music() {
      return graph?.music ?? null;
    },
    detune: 0,
    playing: 0,
    setVolume(v) {
      volume = v;
      graph?.master.gain.setTargetAtTime(v, graph.ctx.currentTime, 0.05);
    },
    setDistortion(a) {
      if (!graph || Math.abs(a - amount) <= 0.02) return;
      graph.shaper.curve = shaperCurve(a);
      amount = a;
    },
    onStart(fn) {
      if (graph) fn(graph.ctx);
      else waiting.push(fn);
    },
    start,
  };
}
