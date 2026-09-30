/**
 * The game's sound (Phase 6; recorded in playtest round 6): event stingers (cues.ts), creature calls,
 * the drones and recorded ambience for where the investigator stands, the foley of bodies moving
 * (foley.ts), and a boss fight's music (bossMusic.ts). A stinger or a voice with recordings
 * (data/samples.ts) plays one of them, dulled with distance (keeping a share of its recipe beneath,
 * where that gives it weight); until they have loaded, the recipes play. The investigator grunts as
 * blows land on them, and a creature cries out as it dies. A creature calls at random within its
 * voice's interval while it is in the world and not lying hidden, and at once when it turns on the
 * investigator (a snarl, for some); the listener is the camera. A failing mind (round 22) hears a
 * whisper now and then at one ear, and nothing else is added to the sound. Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Entity } from '../../core/ecs';
import type { V3 } from '../../core/geom';
import { soundOf, type CreatureSound } from '../../data/creatureSounds';
import { getEntity } from '../../data/registry';
import { AMBIENCE, DUNGEON_AMBIENCE, SAMPLE_SETS, STINGER_SAMPLES, VOICE_ALERTS, VOICE_SAMPLES, type Ambience, type SampleSetId } from '../../data/samples';
import { STINGERS, type StingerId } from '../../data/sounds';
import { AUDIO } from '../../data/tuning';
import { voiceIdOf, VOICES, type Voice, type VoiceId } from '../../data/voices';
import { engagedFights } from '../../systems/bossFight';
import { isAbsent, isConcealed, type Game, type GameEvents } from '../../systems/components';
import { kitOfRoom } from '../../world/dungeonKit';
import { dungeonRoomAt } from '../../world/terrain';
import type { FxParams } from '../fx';
import { createAmbience } from './ambience';
import { createBossMusic } from './bossMusic';
import { CUES, cueFor, dullness, nextCall, placeSound, type Cue } from './cues';
import { impactLayers, landedBlow } from './impact';
import type { Drones } from './drones';
import type { AudioEngine } from './engine';
import { createFoley } from './foley';
import { createSampler, setFiles } from './sampler';
import { beatRate } from '../feel';
import { playSound } from './synth';

export interface GameAudio {
  /** `paused`: the world stands still, and so do its creatures' voices. */
  update(fx: FxParams, seconds: number, camera: THREE.Camera, paused: boolean): void;
  /** A voice where `at` is, recorded if it can be (round 18: the small lives' cries as they take fright). */
  cry(id: VoiceId, at: V3, gain?: number): void;
  /** A recording from afar: panned anywhere, duller the quieter (round 18: the thunder after lightning). */
  far(set: SampleSetId, gain?: number): void;
  /** A stinger heard without place, recorded if it can be (round 20: an Echo drawn into the investigator). */
  stinger(sound: StingerId, o?: { gain?: number; pitch?: number }): void;
  /** A recording heard without place (round 20: a cutscene's laugh, its choir). */
  sample(set: SampleSetId, o?: { gain?: number; pitch?: number }): void;
}

interface Caller {
  next: number; // seconds of its next call
  last: number; // seconds of its last
  engaged: boolean; // hunting the investigator at the last look
}

const HURT: ReadonlySet<string> = new Set(['hit', 'stagger', 'guardBreak', 'riposte', 'interrupted']);
const CRY_GAP = 48; // frames between one creature's cries at blows

export function createGameAudio(e: AudioEngine, drones: Drones, g: Game): GameAudio {
  const listener = { x: 0, y: 0, z: 0 };
  const right = { x: 1, y: 0, z: 0 };
  const sampler = createSampler(e);
  void sampler.load(setFiles(Object.values(SAMPLE_SETS)));
  const ambience = createAmbience(e, sampler);
  const foley = createFoley(g, sampler);
  const place = (at: V3 | null, range: number): { gain: number; pan: number } => placeSound(listener, right, at, range);
  /** One of a set's takes where `at` is; false when none has loaded. */
  const recorded = (id: SampleSetId, at: V3 | null, range: number, o: { gain?: number; pitch?: number; delay?: number } = {}): boolean => {
    const { gain, pan } = place(at, range);
    return gain > 0 && sampler.play(SAMPLE_SETS[id], { gain: gain * (o.gain ?? 1), pan, pitch: o.pitch, delay: o.delay, lowpass: at ? dullness(gain) : undefined });
  };
  const play = (cue: Cue): void => {
    const { gain, pan } = place(cue.at, AUDIO.eventRange);
    const level = gain * (cue.gain ?? 1);
    const [set, beneath] = STINGER_SAMPLES[cue.sound] ?? [null, 1];
    const took = set !== null && recorded(set, cue.at, AUDIO.eventRange, { gain: cue.gain, pitch: cue.pitch });
    if (!took || beneath > 0) playSound(e, STINGERS[cue.sound], { gain: level * (took ? beneath : 1), pan, pitch: cue.pitch });
  };
  for (const type of Object.keys(CUES) as (keyof GameEvents)[]) {
    g.events.on(type, (ev) => {
      const cue = cueFor(g, type, ev);
      if (cue) play(cue);
    });
  }

  interface Voiced {
    id: VoiceId;
    voice: Voice;
    sound?: CreatureSound; // its own mix of the recorded families (data/creatureSounds.ts), if it has one
  }
  const voices = new Map<string, Voiced | null>(); // by roster id
  const voice = (rosterId: string): Voiced | null => {
    let v = voices.get(rosterId);
    if (v === undefined) {
      const def = getEntity(rosterId);
      const id = def ? voiceIdOf(def) : null;
      voices.set(rosterId, (v = id ? { id, voice: VOICES[id], sound: soundOf(rosterId) } : null));
    }
    return v;
  };
  /** The playback rate of one of a creature's cries: drawn from its own range, else nearly 1. */
  const pitchOf = (v: Voiced): number => (v.sound ? v.sound.pitch[0] + (v.sound.pitch[1] - v.sound.pitch[0]) * Math.random() : 0.94 + 0.12 * Math.random());
  /** A creature's call where it stands: recorded if it can be, else its recipe. */
  const call = (id: Entity, v: Voiced, o: { alert?: boolean; pitch?: number; gain?: number } = {}): boolean => {
    const at = g.ecs.c.transform.get(id)?.pos ?? null;
    const set = v.sound ? ((o.alert ? v.sound.alert : undefined) ?? v.sound.call ?? VOICE_SAMPLES[v.id]) : ((o.alert ? VOICE_ALERTS[v.id] : undefined) ?? VOICE_SAMPLES[v.id]);
    const pitch = o.pitch ?? pitchOf(v);
    if (set && recorded(set, at, v.voice.range, { pitch, gain: o.gain })) return true;
    const { gain, pan } = place(at, v.voice.range);
    return gain > 0 && playSound(e, v.voice.call, { gain: gain * (o.gain ?? 1), pan, pitch });
  };
  const cried = new Map<Entity, number>(); // the frame each creature last cried out at a blow
  g.events.on('Hit', (ev) => {
    if (ev.target === g.player.id && !ev.lingering && HURT.has(ev.outcome)) recorded('hurt', null, 1);
    if (ev.target !== g.player.id && !ev.lingering && HURT.has(ev.outcome)) {
      const rosterId = g.ecs.c.dread.get(ev.target)?.id; // a creature cries out as it is struck, in its own voice (round 20)
      const v = rosterId ? voice(rosterId) : null;
      const set = v?.sound?.hurt;
      if (v && set && g.frame - (cried.get(ev.target) ?? -1e9) >= CRY_GAP && Math.random() < 0.75) {
        cried.set(ev.target, g.frame);
        recorded(set, g.ecs.c.transform.get(ev.target)?.pos ?? null, v.voice.range, { pitch: pitchOf(v), gain: 0.85 });
      }
    }
    const landed = landedBlow(g, ev); // the investigator's blow lands: what it meets, layer on layer (round 20)
    if (!landed) return;
    const where = g.ecs.c.transform.get(ev.target)?.pos ?? null;
    for (const l of impactLayers(landed)) recorded(l.set, where, AUDIO.eventRange, { gain: l.gain, pitch: l.pitch, delay: l.delay });
  });
  g.events.on('Vanished', ({ at, struck }) => {
    if (!struck) return;
    play({ sound: 'vanish', at });
    recorded('whisper', at, 25, { pitch: 1.2 });
  });
  g.events.on('Died', ({ entity }) => {
    const rosterId = g.ecs.c.dread.get(entity)?.id;
    const v = rosterId ? voice(rosterId) : null;
    if (!v) return;
    const at = g.ecs.c.transform.get(entity)?.pos ?? null;
    if (v.sound?.die && recorded(v.sound.die, at, v.voice.range, { pitch: pitchOf(v), gain: 0.95 })) return; // its own dying, if it has one (round 20)
    call(entity, v, { pitch: 0.78 + 0.1 * Math.random(), gain: 0.9 }); // else its call, deeper
  });

  const callers = new Map<Entity, Caller>();
  const music = createBossMusic(e);
  let region: string | null = null;

  function calls(seconds: number): void {
    const c = g.ecs.c;
    for (const [id, dread] of c.dread) {
      const v = voice(dread.id);
      if (!v) continue;
      let s = callers.get(id);
      if (!s) callers.set(id, (s = { next: nextCall(v.voice, seconds, Math.random), last: -Infinity, engaged: false }));
      if (isAbsent(g, id) || isConcealed(g, id)) {
        s.engaged = false;
        continue;
      }
      const br = c.brain.get(id);
      const engaged = br?.state === 'engage' && br.target === g.player.id;
      const alert = engaged && !s.engaged && seconds - s.last >= AUDIO.callGap;
      s.engaged = engaged;
      if (!alert && seconds < s.next) continue;
      s.next = nextCall(v.voice, seconds, Math.random);
      if (call(id, v, { alert })) s.last = seconds;
    }
    for (const id of callers.keys()) if (!c.dread.has(id)) callers.delete(id);
  }

  /** Inside a legacy dungeon: what its room sounds like (its kit), else null (outside, or ruins under the sky). */
  const inside = (p: V3): Ambience | null => {
    const d = dungeonRoomAt(p.x, p.z);
    const sound = d ? kitOfRoom(d.layout, d.room).sound : 'open';
    return sound === 'open' ? null : DUNGEON_AMBIENCE[sound];
  };

  let lastBeat = -1;
  let whisperAt = Infinity; // seconds of the next whisper a failing mind hears
  /** Whispers, from the Fractured on: every so often, hard to one side, low, in a room where nobody speaks. */
  function whispers(stress: number, seconds: number): void {
    const k = (stress - AUDIO.whisper.from) / (1 - AUDIO.whisper.from);
    if (k < 0) {
      whisperAt = Infinity;
      return;
    }
    const [slow, quick] = AUDIO.whisper.every;
    if (!Number.isFinite(whisperAt)) whisperAt = seconds + slow * (0.5 + Math.random());
    if (seconds < whisperAt) return;
    whisperAt = seconds + (slow + (quick - slow) * Math.min(1, k)) * (0.6 + 0.8 * Math.random());
    const [lo, hi] = AUDIO.whisper.gain;
    sampler.play(SAMPLE_SETS.whisper, { gain: lo + (hi - lo) * Math.min(1, k), pan: Math.random() < 0.5 ? -0.9 : 0.9, pitch: 0.78 + 0.22 * Math.random() });
  }
  return {
    far(set, gain = 1) {
      sampler.play(SAMPLE_SETS[set], { gain, pan: (Math.random() * 2 - 1) * 0.7, lowpass: 900 + 4000 * gain, bus: e.bed ?? undefined });
    },
    stinger(sound, o = {}) {
      play({ sound, at: null, ...o });
    },
    sample(set, o = {}) {
      recorded(set, null, 1, o);
    },
    cry(id, at, gain = 1) {
      const [v, set, pitch] = [VOICES[id], VOICE_SAMPLES[id], 0.94 + 0.12 * Math.random()];
      if (set && recorded(set, at, v.range, { pitch, gain })) return;
      const { gain: level, pan } = place(at, v.range);
      if (level > 0) playSound(e, v.call, { gain: level * gain, pan, pitch });
    },
    update(fx, seconds, camera, paused) {
      camera.updateMatrixWorld();
      const m = camera.matrixWorld.elements;
      const len = Math.hypot(m[0], m[2]) || 1;
      Object.assign(listener, { x: camera.position.x, y: camera.position.y, z: camera.position.z });
      Object.assign(right, { x: m[0] / len, z: m[2] / len });
      e.detune = fx.detune + fx.wobble * Math.sin(seconds * 0.7);
      e.setDistortion(fx.distortion);
      region = g.overworld ? (g.overworld.region ?? region) : 'arena'; // out at sea, the last shore's drone
      const [fight] = engagedFights(g);
      drones.set(region, !!fight);
      const at = g.ecs.c.transform.get(g.player.id)?.pos;
      ambience.set((g.overworld && at && inside(at)) || (AMBIENCE[region ?? ''] ?? null));
      ambience.update(seconds);
      music.update(fight ? { id: fight[1].id, phase: fight[1].phase } : null);
      drones.update(fx, seconds);
      if (paused) return;
      const h = g.ecs.c.health.get(g.player.id);
      const rate = h ? beatRate(h.hp / h.max) : 0; // near death, the heart (round 14; hurtFx.ts pulses with it)
      const beat = Math.floor(seconds * rate);
      if (rate > 0 && beat !== lastBeat && lastBeat >= 0) playSound(e, STINGERS.heartbeat, { gain: 0.9 });
      lastBeat = rate > 0 ? beat : -1;
      whispers(fx.stress, seconds);
      calls(seconds);
      foley.update(seconds, place, (at) => play({ sound: 'danger', at: { ...at } }));
    },
  };
}
