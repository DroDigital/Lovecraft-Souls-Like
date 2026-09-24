/**
 * The game's sound (Phase 6): event stingers (cues.ts), creature calls, and the drones for where the
 * investigator stands. A creature calls at random within its voice's interval while it is in the world
 * and not lying hidden, and at once when it turns on the investigator; the listener is the camera.
 * Read-only on the simulation.
 */

import type * as THREE from 'three';
import type { Entity } from '../../core/ecs';
import { getEntity } from '../../data/registry';
import { STINGERS } from '../../data/sounds';
import { AUDIO } from '../../data/tuning';
import { voiceOf, type Voice } from '../../data/voices';
import { engagedFights } from '../../systems/bossFight';
import { isAbsent, isConcealed, type Game, type GameEvents } from '../../systems/components';
import type { FxParams } from '../fx';
import { CUES, cueFor, nextCall, placeSound, type Cue } from './cues';
import type { Drones } from './drones';
import type { AudioEngine } from './engine';
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

export function createGameAudio(e: AudioEngine, drones: Drones, g: Game): GameAudio {
  const listener = { x: 0, y: 0, z: 0 };
  const right = { x: 1, y: 0, z: 0 };
  const play = (cue: Cue): void => {
    const { gain, pan } = placeSound(listener, right, cue.at, AUDIO.eventRange);
    playSound(e, STINGERS[cue.sound], { gain: gain * (cue.gain ?? 1), pan, pitch: cue.pitch });
  };
  for (const type of Object.keys(CUES) as (keyof GameEvents)[]) {
    g.events.on(type, (ev) => {
      const cue = cueFor(g, type, ev);
      if (cue) play(cue);
    });
  }

  const voices = new Map<string, Voice | null>(); // by roster id
  const voice = (id: string): Voice | null => {
    let v = voices.get(id);
    if (v === undefined) {
      const def = getEntity(id);
      voices.set(id, (v = def ? voiceOf(def) : null));
    }
    return v;
  };
  const callers = new Map<Entity, Caller>();
  let region: string | null = null;

  function calls(seconds: number): void {
    const c = g.ecs.c;
    for (const [id, dread] of c.dread) {
      const v = voice(dread.id);
      if (!v) continue;
      let s = callers.get(id);
      if (!s) callers.set(id, (s = { next: nextCall(v, seconds, Math.random), last: -Infinity, engaged: false }));
      if (isAbsent(g, id) || isConcealed(g, id)) {
        s.engaged = false;
        continue;
      }
      const br = c.brain.get(id);
      const engaged = br?.state === 'engage' && br.target === g.player.id;
      const alert = engaged && !s.engaged && seconds - s.last >= AUDIO.callGap;
      s.engaged = engaged;
      if (!alert && seconds < s.next) continue;
      s.next = nextCall(v, seconds, Math.random);
      const place = placeSound(listener, right, c.transform.get(id)?.pos ?? null, v.range);
      if (place.gain > 0 && playSound(e, v.call, { ...place, pitch: 0.94 + 0.12 * Math.random() })) s.last = seconds;
    }
    for (const id of callers.keys()) if (!c.dread.has(id)) callers.delete(id);
  }

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
      drones.set(region, engagedFights(g).length > 0);
      drones.update(fx, seconds);
      if (!paused) calls(seconds);
    },
  };
}
