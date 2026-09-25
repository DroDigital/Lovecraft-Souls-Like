/**
 * Which sound answers which game event, and how a sound at a place is heard (Phase 6). Blows, shots,
 * summons and lamps sound where they happen; what befalls the investigator's mind sounds inside their
 * head. Pure: gameAudio.ts plays the cues.
 */

import type { V3 } from '../../core/geom';
import type { StingerId } from '../../data/sounds';
import { AUDIO } from '../../data/tuning';
import type { Voice } from '../../data/voices';
import type { Game, GameEvents, HitOutcome } from '../../systems/components';
import { bandIndex } from '../../systems/sanity';

export interface Cue {
  sound: StingerId;
  at: V3 | null; // null: heard without place (the investigator's own mind, the HUD's words)
  gain?: number;
  pitch?: number;
}

const HIT: Record<HitOutcome, StingerId> = {
  dodged: 'dodged',
  parried: 'parried',
  blocked: 'blocked',
  guardBreak: 'guardBreak',
  hit: 'hit',
  stagger: 'hit',
  riposte: 'riposte',
  interrupted: 'hit',
  kill: 'kill',
};

const at = (g: Game, id: number): V3 | null => {
  const p = g.ecs.c.transform.get(id)?.pos;
  return p ? { ...p } : null;
};
const inside = (sound: StingerId): Cue => ({ sound, at: null });

type Handlers = { [K in keyof GameEvents]?: (e: GameEvents[K], g: Game) => Cue | null };

export const CUES: Handlers = {
  Hit: (e, g) => (e.lingering ? null : { sound: HIT[e.outcome], at: at(g, e.target), gain: e.attacker === g.player.id || e.target === g.player.id ? 1 : 0.6 }),
  Shot: (e) => ({ sound: 'shot', at: { ...e.from } }),
  Died: (e, g) => (e.entity === g.player.id ? inside('death') : null),
  Respawned: (e, g) => (e.entity === g.player.id ? inside('rise') : null),
  Echoes: (e) => (e.change === 'recovered' ? inside('echoes') : null),
  LockChanged: (e) => (e.target !== null ? inside('lock') : null),
  SanityBandChanged: (e) => inside(bandIndex(e.to) > bandIndex(e.from) ? 'worse' : 'better'),
  InsightChanged: (e) => (e.change > 0 && e.cause !== 'load' && e.cause !== 'debug' ? inside('insight') : null),
  FirstSight: (e) => (e.sanity > 0 ? { sound: 'sight', at: null, pitch: Math.max(0.5, 1.1 - e.sanity / 40) } : null), // the greater the horror, the lower
  Discovered: () => inside('found'),
  Rested: () => inside('rested'),
  RestRefused: () => inside('refused'),
  Travelled: () => inside('travel'),
  Vanquished: () => inside('vanquished'),
  BossEngaged: () => inside('boss'),
  BossPhase: (e) => (e.phase > 0 ? inside('phase') : null),
  Teleported: (e) => ({ sound: 'teleport', at: { ...e.to } }),
  Summoned: (e, g) => ({ sound: 'summon', at: at(g, e.entity) }),
  GazeBurst: () => inside('gaze'),
  Darkened: () => inside('darkness'),
  TimeSkipped: () => inside('timeSkip'),
  BodyStolen: () => inside('stolen'),
  Rewired: () => inside('rewired'),
  Revealed: () => inside('revealed'),
  LampChanged: (e, g) => ({ sound: e.lit ? 'lampLit' : 'lampOut', at: at(g, e.lamp) }),
  Petrified: () => inside('petrified'),
  Named: () => inside('named'),
  Rammed: () => inside('rammed'),
  Title: () => inside('title'),
  Ending: () => inside('ending'),
  Healed: () => inside('healed'),
  Marked: (e) => ({ sound: 'marked', at: { ...e.at } }),
  Erupted: (e) => ({ sound: 'erupted', at: { ...e.at } }),
  Quaked: (e) => ({ sound: 'quaked', at: { ...e.at } }),
  Swept: (e, g) => ({ sound: 'swept', at: at(g, e.by) }),
  Read: () => inside('page'),
  QuestChanged: () => inside('quest'),
};

/** The cue for an event, or null when it makes no sound. */
export function cueFor<K extends keyof GameEvents>(g: Game, type: K, e: GameEvents[K]): Cue | null {
  const handler = CUES[type] as ((e: GameEvents[K], g: Game) => Cue | null) | undefined;
  return handler?.(e, g) ?? null;
}

/**
 * How loud and where a sound at `at` is heard by a listener with the given right vector: whole within
 * AUDIO.near, fading (squared) to nothing at `range`; panned by its horizontal bearing.
 */
export function placeSound(listener: V3, right: V3, at: V3 | null, range: number): { gain: number; pan: number } {
  if (!at) return { gain: 1, pan: 0 };
  const [dx, dy, dz] = [at.x - listener.x, at.y - listener.y, at.z - listener.z];
  const k = 1 - Math.max(0, Math.hypot(dx, dy, dz) - AUDIO.near) / Math.max(1e-6, range - AUDIO.near);
  const flat = Math.hypot(dx, dz);
  return { gain: k > 0 ? k * k : 0, pan: flat < 1e-3 ? 0 : (AUDIO.pan * (dx * right.x + dz * right.z)) / flat };
}

/** When a creature next calls: `now` plus a wait drawn from its voice's interval. */
export const nextCall = (v: Voice, now: number, rand: () => number): number => now + v.every[0] + (v.every[1] - v.every[0]) * rand();
