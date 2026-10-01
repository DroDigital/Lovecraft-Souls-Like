/**
 * The realms' background music (round 28; data/realmMusic.ts): the track of the realm the
 * investigator is in sounds on a seamless loop (realmLoop.ts), at the music's one loudness
 * (loudness.ts), and as they cross into another realm it gives way to that realm's by a crossfade
 * of REALM_MUSIC.change seconds, equal power, so there is no gap. A track is fetched and decoded when
 * first wanted (so the realm's music is ready a moment after they arrive, the world's own ambience
 * having carried it), and the one before is let go. Under a boss's score it gives way, and returns
 * after; while the ground has gone quiet before a horror (the hush) it gives way to a murmur; and
 * its level breathes very slowly, so a loop of four minutes is not heard to turn. It joins the
 * music's bus, so the music setting is its level. A file that cannot be had is passed over
 * quietly and asked for again after a while. Without WebAudio it is silent.
 */

import { REALM_MUSIC, realmFile, type RealmTrackId } from '../../data/realmMusic';
import type { AudioEngine } from './engine';
import { analyse, loopRegion, type Analysis, type Region } from './loudness';
import { createRealmLoop, type RealmLoop } from './realmLoop';
import { FADE_IN, FADE_OUT } from './themeLoop';

export interface RealmState {
  track: RealmTrackId | null; // the realm's, or null (in the arena, at sea)
  fight: boolean; // a boss's score sounds
  hush: number; // 0..1: the ground has gone quiet before a horror
  paused: boolean;
}

export interface RealmMusic {
  update(seconds: number, state: RealmState): void;
  /** What sounds now (for the debug panel and tests). */
  readonly sounding: RealmTrackId | null;
}

interface Loaded {
  buffer: AudioBuffer;
  analysis: Analysis;
  region: Region;
}

interface Voice {
  id: RealmTrackId;
  loop: RealmLoop;
  gain: GainNode; // the track's own level, faded in and out
  level: number; // what it fades to: its normalising gain (loudness.ts)
  endsAt: number; // audio time it is silent and may be let go (Infinity while it sounds)
}

/** The level the music holds, 0..1: given way under a score, and in the hush, and breathing. */
export function realmLevel(state: Pick<RealmState, 'fight' | 'hush'>, seconds: number): number {
  const { swell, hushTo } = REALM_MUSIC;
  const breath = 1 - swell.depth * (0.5 - 0.5 * Math.cos((2 * Math.PI * seconds) / swell.period));
  const quiet = 1 - (1 - hushTo) * Math.min(1, Math.max(0, state.hush));
  return (state.fight ? 0 : 1) * quiet * breath * REALM_MUSIC.level;
}

export function createRealmMusic(e: AudioEngine): RealmMusic {
  const loaded = new Map<RealmTrackId, Promise<Loaded | null>>();
  const failed = new Map<RealmTrackId, number>(); // seconds it may be asked for again
  let mix: GainNode | null = null; // under the music bus: the fight's, the hush's, the swell's level
  let current: Voice | null = null;
  const leaving = new Set<Voice>();
  let wanted: RealmTrackId | null = null;
  let waiting: RealmTrackId | null = null; // the track being fetched
  let clock = 0;

  const fetchTrack = async (ctx: AudioContext, id: RealmTrackId): Promise<Loaded | null> => {
    try {
      const res = await fetch(realmFile(id));
      if (!res.ok) throw new Error(String(res.status));
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const analysis = analyse(Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c)), buffer.sampleRate);
      return { buffer, analysis, region: loopRegion(analysis, buffer.duration) };
    } catch {
      failed.set(id, clock + REALM_MUSIC.retry);
      return null;
    }
  };

  /** Decoded tracks held: the one sounding, the one wanted, and no more. */
  const trim = (): void => {
    for (const id of [...loaded.keys()]) {
      if (loaded.size <= REALM_MUSIC.keep) break;
      if (id !== current?.id && id !== wanted) loaded.delete(id);
    }
  };

  /** The voice's level rises from nothing to its own, or falls from where it is to nothing, equal power. */
  const fade = (v: Voice, ctx: AudioContext, dir: 'in' | 'out', seconds: number): void => {
    const now = ctx.currentTime;
    const from = dir === 'in' ? 0 : v.gain.gain.value;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(from, now);
    const top = dir === 'in' ? v.level : from;
    v.gain.gain.setValueCurveAtTime((dir === 'in' ? FADE_IN : FADE_OUT).map((x) => x * top) as unknown as Float32Array<ArrayBuffer>, now, seconds);
    if (dir === 'out') v.endsAt = now + seconds + 0.1;
  };

  /** The wanted track comes in under the one sounding, which goes out. */
  const enter = (ctx: AudioContext, bus: AudioNode, id: RealmTrackId, t: Loaded): void => {
    if (!mix) {
      mix = ctx.createGain();
      mix.gain.value = 0;
      mix.connect(bus);
    }
    if (current) {
      fade(current, ctx, 'out', REALM_MUSIC.change);
      leaving.add(current);
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(mix);
    const voice: Voice = { id, loop: createRealmLoop(ctx, gain, t.buffer, t.region), gain, level: t.analysis.gain, endsAt: Infinity };
    fade(voice, ctx, 'in', current ? REALM_MUSIC.change : REALM_MUSIC.change * 0.6); // the first track of a visit comes in a little faster
    voice.loop.begin(ctx.currentTime + 0.05);
    current = voice;
  };

  return {
    get sounding() {
      return current && current.endsAt === Infinity ? current.id : null;
    },
    update(seconds, state) {
      clock = seconds;
      const [ctx, bus] = [e.ctx, e.music];
      if (!ctx || !bus || ctx.state !== 'running') return;
      wanted = state.track;
      for (const v of leaving) {
        if (ctx.currentTime >= v.endsAt) {
          v.loop.stop();
          v.gain.disconnect();
          leaving.delete(v);
        }
      }
      if (mix) mix.gain.setTargetAtTime(realmLevel(state, seconds), ctx.currentTime, state.fight ? REALM_MUSIC.fight / 3 : 1.2);
      current?.loop.tick();
      if (!wanted) {
        if (current && current.endsAt === Infinity) {
          fade(current, ctx, 'out', REALM_MUSIC.change);
          leaving.add(current);
          current = null;
        }
        return;
      }
      if (current?.id === wanted || (failed.get(wanted) ?? 0) > seconds) return;
      if (waiting === wanted) return; // already asked for, and coming
      const asked = (waiting = wanted);
      let pending = loaded.get(asked);
      if (!pending) loaded.set(asked, (pending = fetchTrack(ctx, asked)));
      void pending.then((t) => {
        if (waiting === asked) waiting = null;
        if (!t) return void loaded.delete(asked);
        if (wanted !== asked || current?.id === asked) return; // they have gone on, or it is already sounding
        enter(ctx, bus, asked, t);
        trim();
      });
    },
  };
}
