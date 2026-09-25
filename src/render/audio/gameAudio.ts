/**
 * The game's sound (Phase 6; recorded in playtest round 6): event stingers (cues.ts), creature calls,
 * the drones and recorded ambience for where the investigator stands, the foley of bodies moving
 * (foley.ts), and a boss fight's music (bossMusic.ts). A stinger or a voice with recordings
 * (data/samples.ts) plays one of them, dulled with distance (keeping a share of its recipe beneath,
 * where that gives it weight); until they have loaded, the recipes play. The investigator grunts as
 * blows land on them, and a creature cries out as it dies. A creature calls at random within its
 * voice's interval while it is in the world and not lying hidden, and at once when it turns on the
 * investigator (a snarl, for some); the listener is the camera. Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Entity } from '../../core/ecs';
import type { V3 } from '../../core/geom';
import { getEntity } from '../../data/registry';
import { AMBIENCE, DUNGEON_AMBIENCE, SAMPLE_SETS, STINGER_SAMPLES, VOICE_ALERTS, VOICE_SAMPLES, type SampleSetId } from '../../data/samples';
import { STINGERS } from '../../data/sounds';
import { AUDIO } from '../../data/tuning';
import { voiceIdOf, VOICES, type Voice, type VoiceId } from '../../data/voices';
import { engagedFights } from '../../systems/bossFight';
import { isAbsent, isConcealed, type Game, type GameEvents } from '../../systems/components';
import { chunkOf } from '../../world/worldMap';
import { worldLayout } from '../../world/placements';
import type { FxParams } from '../fx';
import { createAmbience } from './ambience';
import { createBossMusic } from './bossMusic';
import { CUES, cueFor, dullness, nextCall, placeSound, type Cue } from './cues';
import type { Drones } from './drones';
import type { AudioEngine } from './engine';
import { createFoley } from './foley';
import { createSampler, setFiles } from './sampler';
import { playSound } from './synth';

export interface GameAudio {
  /** `paused`: the world stands still, and so do its creatures' voices. */
  update(fx: FxParams, seconds: number, camera: THREE.Camera, paused: boolean): void;
}

interface Caller {
  next: number; // seconds of its next call
  last: number; // seconds of its last
  engaged: boolean; // hunting the investigator at the last look
}

const HURT: ReadonlySet<string> = new Set(['hit', 'stagger', 'guardBreak', 'riposte', 'interrupted']);

export function createGameAudio(e: AudioEngine, drones: Drones, g: Game): GameAudio {
  const listener = { x: 0, y: 0, z: 0 };
  const right = { x: 1, y: 0, z: 0 };
  const sampler = createSampler(e);
  void sampler.load(setFiles(Object.values(SAMPLE_SETS)));
  const ambience = createAmbience(e, sampler);
  const foley = createFoley(g, sampler);
  const place = (at: V3 | null, range: number): { gain: number; pan: number } => placeSound(listener, right, at, range);
  /** One of a set's takes where `at` is; false when none has loaded. */
  const recorded = (id: SampleSetId, at: V3 | null, range: number, o: { gain?: number; pitch?: number } = {}): boolean => {
    const { gain, pan } = place(at, range);
    return gain > 0 && sampler.play(SAMPLE_SETS[id], { gain: gain * (o.gain ?? 1), pan, pitch: o.pitch, lowpass: at ? dullness(gain) : undefined });
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

  const voices = new Map<string, { id: VoiceId; voice: Voice } | null>(); // by roster id
  const voice = (rosterId: string): { id: VoiceId; voice: Voice } | null => {
    let v = voices.get(rosterId);
    if (v === undefined) {
      const def = getEntity(rosterId);
      const id = def ? voiceIdOf(def) : null;
      voices.set(rosterId, (v = id ? { id, voice: VOICES[id] } : null));
    }
    return v;
  };
  /** A creature's call where it stands: recorded if it can be, else its recipe. */
  const call = (id: Entity, v: { id: VoiceId; voice: Voice }, o: { alert?: boolean; pitch?: number; gain?: number } = {}): boolean => {
    const at = g.ecs.c.transform.get(id)?.pos ?? null;
    const set = (o.alert ? VOICE_ALERTS[v.id] : undefined) ?? VOICE_SAMPLES[v.id];
    const pitch = o.pitch ?? 0.94 + 0.12 * Math.random();
    if (set && recorded(set, at, v.voice.range, { pitch, gain: o.gain })) return true;
    const { gain, pan } = place(at, v.voice.range);
    return gain > 0 && playSound(e, v.voice.call, { gain: gain * (o.gain ?? 1), pan, pitch });
  };
  g.events.on('Hit', (ev) => {
    if (ev.target === g.player.id && !ev.lingering && HURT.has(ev.outcome)) recorded('hurt', null, 1);
  });
  g.events.on('Died', ({ entity }) => {
    const rosterId = g.ecs.c.dread.get(entity)?.id;
    const v = rosterId ? voice(rosterId) : null;
    if (v) call(entity, v, { pitch: 0.78 + 0.1 * Math.random(), gain: 0.9 }); // its death cry
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

  /** Inside a legacy dungeon: its stone and water, whatever the region outside. */
  const underground = (p: V3): boolean =>
    worldLayout().chunk(chunkOf(p.x), chunkOf(p.z)).dungeons.some(({ rect: r }) => p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1);

  return {
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
      ambience.set(g.overworld && at && underground(at) ? DUNGEON_AMBIENCE : (AMBIENCE[region ?? ''] ?? null));
      ambience.update(seconds);
      music.update(fight ? { id: fight[1].id, phase: fight[1].phase } : null);
      drones.update(fx, seconds);
      if (paused) return;
      calls(seconds);
      foley.update(seconds, place);
    },
  };
}
