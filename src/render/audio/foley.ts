/**
 * Foley (playtest round 6): the sounds of bodies moving, read off the simulation each frame. The
 * investigator's footsteps, one a stride, on what they walk on (the sea's shallows, a dungeon's stone,
 * a road, open ground); the whoosh of every blow a moment before it lands (the investigator's cuts
 * and swings, a creature's lower the bigger it is); a roll's tumble and a backstep's scuffs; the
 * Laudanum's cork; and a warning as a grab winds up. Read-only on the simulation.
 */

import type { Entity } from '../../core/ecs';
import type { V3 } from '../../core/geom';
import { ATTACK_SOUNDS, soundOf, type AttackSound } from '../../data/creatureSounds';
import { SAMPLE_SETS, type SampleSetId } from '../../data/samples';
import type { AttackId } from '../../data/schema';
import { WORLD } from '../../data/tuning';
import type { MoveDef } from '../../data/moves';
import { moveDef } from '../../systems/actions';
import { isAbsent, type Game } from '../../systems/components';
import { chunkContent } from '../../world/chunks';
import { worldLayout } from '../../world/placements';
import { segmentDistance } from '../../world/roads';
import { chunkOf } from '../../world/worldMap';
import { wetness } from '../wetness';
import { dullness } from './cues';
import type { Sampler } from './sampler';

export type Surface = 'water' | 'stone' | 'road' | 'dirt';

const STEPS: Record<Surface, SampleSetId> = { water: 'stepWater', stone: 'stepStone', road: 'stepRoad', dirt: 'stepDirt' };
const STRIDE = [0.75, 1.3] as const; // metres a step at a walk, and at a sprint
const PACE = [1.5, 6.4] as const; // m/s: a walk, a sprint
const SWING_LEAD = 4; // frames before a blow lands that its whoosh is heard
const SWING_RANGE = 26; // metres a creature's swing carries

/** What the ground is at (x, y, z): the arena's flags are stone. */
export function surfaceAt(g: Game, x: number, y: number, z: number): Surface {
  if (!g.overworld) return 'stone';
  if (y < WORLD.seaLevel - 0.05) return 'water';
  const [cx, cz] = [chunkOf(x), chunkOf(z)];
  if (worldLayout().chunk(cx, cz).dungeons.some(({ rect: r }) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)) return 'stone';
  if (chunkContent(cx, cz).roads.some((s) => segmentDistance(x, z, s.a, s.b) < s.width / 2)) return 'road';
  return 'dirt';
}

/** Metres between footfalls at `speed`. */
export const strideAt = (speed: number): number => {
  const t = Math.min(1, Math.max(0, (speed - PACE[0]) / (PACE[1] - PACE[0])));
  return STRIDE[0] + (STRIDE[1] - STRIDE[0]) * t;
};

/** The frame a creature's attack lands, its bolt leaves or its roar begins: where its own sound is heard (round 20). */
export const strikeFrame = (def: MoveDef): number | undefined => def.hit?.window[0] ?? def.volley?.frame ?? def.pool?.frame ?? def.marks?.frame ?? def.wave?.frame ?? def.sanity?.window[0];

/** How the attack `move` of creature `rosterId` sounds as it lands: the creature's own, else the attack library's, else nothing beyond the whoosh. */
export function attackSound(rosterId: string | undefined, move: string): AttackSound | undefined {
  const base = ATTACK_SOUNDS[move as AttackId];
  const own = rosterId ? soundOf(rosterId)?.attacks?.[move as AttackId] : undefined;
  return own ? { gain: 0.8, ...base, set: own } : base;
}

/** Whether a move running `frame` (at `was` the frame before, or a new move) has just reached `at`. */
export const reached = (at: number, frame: number, was: number | null): boolean => frame >= at && (was === null || was < at);

export interface Foley {
  /** `place` says how a sound at a spot is heard; `warn` sounds a grab winding up there. */
  update(seconds: number, place: (at: V3, range: number) => { gain: number; pan: number }, warn: (at: V3) => void): void;
}

export function createFoley(g: Game, sampler: Sampler): Foley {
  const seen = new Map<Entity, { move: string | null; frame: number }>();
  let last: V3 | null = null;
  let walked = 0;
  let before = 0;
  const play = (id: SampleSetId, gain = 1, pan = 0, pitch = 1, lowpass?: number): boolean => sampler.play(SAMPLE_SETS[id], { gain, pan, pitch, lowpass });

  function steps(seconds: number): void {
    const { transform, actor } = g.ecs.c;
    const tr = transform.get(g.player.id);
    const a = actor.get(g.player.id);
    const dt = Math.max(1e-3, seconds - before);
    before = seconds;
    if (!tr || !a) return;
    const moved = last ? Math.hypot(tr.pos.x - last.x, tr.pos.z - last.z) : 0;
    last = { ...tr.pos };
    if (moved > 3 || a.move !== null || g.ecs.c.dead.has(g.player.id)) return (walked = 0), undefined; // a jump, a move or a fall: no stride
    const speed = moved / dt;
    if (speed < 0.3) return;
    walked += moved;
    const stride = strideAt(speed);
    if (walked < stride) return;
    walked %= stride;
    const surface = surfaceAt(g, tr.pos.x, tr.pos.y, tr.pos.z);
    play(STEPS[surface], 0.55 + 0.45 * Math.min(1, speed / PACE[1]));
    if (surface !== 'water' && wetness.value > 0.3 && Math.random() < wetness.value) play('stepWater', 0.32 * wetness.value, 0, 1.1 + 0.25 * Math.random()); // a stride on ground the rain has soaked splashes (round 34)
  }

  function moves(place: (at: V3, range: number) => { gain: number; pan: number }, warn: (at: V3) => void): void {
    const { actor, transform, body } = g.ecs.c;
    for (const [id, a] of actor) {
      const was = seen.get(id);
      seen.set(id, { move: a.move, frame: a.frame });
      const def = moveDef(a);
      if (!def || !a.move || isAbsent(g, id)) continue;
      const prev = was && was.move === a.move && was.frame <= a.frame ? was.frame : null; // a new move, or the same begun again
      const player = id === g.player.id;
      if (player) {
        const surface = (): Surface => {
          const p = transform.get(id)!.pos;
          return surfaceAt(g, p.x, p.y, p.z);
        };
        if (a.move === 'roll' && reached(5, a.frame, prev)) play('roll');
        if (a.move === 'roll' && reached(26, a.frame, prev)) play('roll', 0.55);
        if (a.move === 'backstep' && (reached(2, a.frame, prev) || reached(10, a.frame, prev))) play(STEPS[surface()], 0.8);
        if (a.move === 'drink' && reached(10, a.frame, prev)) play('cork');
      }
      if (!player && def.hit?.unblockable && prev === null) warn(transform.get(id)!.pos); // a grab: no guard will stop it
      const strike = player ? undefined : strikeFrame(def);
      if (strike !== undefined && reached(strike, a.frame, prev)) {
        const sound = attackSound(g.ecs.c.dread.get(id)?.id, a.move); // its jaws, its claws, its lash, its spit (round 20)
        const at = transform.get(id)?.pos;
        if (sound && at) {
          const { gain, pan } = place(at, SWING_RANGE);
          const size = body.get(id)?.radius ?? 0.5;
          if (gain > 0) play(sound.set, gain * sound.gain, pan, Math.max(0.55, Math.min(1.2, 1.25 - 0.25 * size)) * (sound.pitch ?? 1), dullness(gain));
        }
      }
      if (!def.hit || !reached(Math.max(0, def.hit.window[0] - SWING_LEAD), a.frame, prev)) continue;
      if (player) {
        const heavy = a.move.startsWith('heavy') || def.hit.poise >= 30;
        play(heavy ? 'swingHeavy' : 'swingLight');
        continue;
      }
      const at = transform.get(id)?.pos;
      if (!at) continue;
      const { gain, pan } = place(at, SWING_RANGE);
      const size = body.get(id)?.radius ?? 0.5;
      if (gain > 0) play('swingHeavy', gain * 0.8, pan, Math.max(0.55, Math.min(1.15, 1.2 - 0.3 * size)), dullness(gain));
    }
    for (const id of seen.keys()) if (!actor.has(id)) seen.delete(id);
  }

  return {
    update(seconds, place, warn) {
      steps(seconds);
      moves(place, warn);
    },
  };
}
