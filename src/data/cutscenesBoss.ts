/**
 * Arrivals of their own (round 34): the great horrors of the story each come in a way the others do not,
 * where the rest arrive by their size alone (data/cutscenes.ts `arrival`): the witch by a corner of the
 * room that tilts, the Haunter as the lamps go out one by one, Cthulhu as the great door opens, the tall
 * man as himself, polite, with the key on its chain. Each is a scene like any other (shots, then beats)
 * and the director lays the horror's own line over it as it does over the rest (render/cinemaDirector.ts).
 * Data only.
 */

import { shot, to, type Beat, type Scene } from './cutscenes';

type Maker = (name: string, epithet: string | undefined) => Scene;

const named = (at: number, name: string, epithet: string | undefined, hold = 3.4): Beat => ({ at, title: [name.toUpperCase(), epithet], hold });
const scene = (id: string, shots: Scene['shots'], beats: Beat[], extra: Partial<Scene> = {}): Scene => ({ id: `arrival:${id}`, sim: 'frozen', shots, beats, ...extra });

/** Over the investigator's shoulder at the horror, closing in or drawing back. */
const behind = (dur: number, yaw: readonly [number, number], dist: readonly [number, number], up: readonly [number, number], look: readonly [number, number], fov: readonly [number, number], extra = {}) =>
  shot({ dur, on: 'player', aim: 'other', yaw, dist, up, look, fov, sway: 0.5, ...extra });

export const BESPOKE: Readonly<Record<string, Maker>> = {
  // The corners of the room do not agree: the world tilts as she is seen, and again as she is.
  keziah_mason: (name, epithet) =>
    scene('keziah_mason', [
      behind(2.8, to(180, 170), to(3.2, 2.4), to(0.6, 1.5), to(0.55, 0.8), to(64, 54), { roll: to(-9, 8), sway: 0.6 }),
      shot({ dur: 2.2, yaw: to(24, 10), dist: to(1.5, 1.05), up: to(0.82, 0.86), look: to(0.9, 0.92), fov: to(38, 32), roll: to(5, -4), body: true, sway: 0.4 }),
      behind(2.6, to(172, 180), to(2.6, 3.8), to(1.8, 2.1), to(0.7, 0.8), to(54, 60), { roll: to(6, 0) }),
    ], [
      { at: 0.3, sound: 'darkness', gain: 0.5, shake: 0.1, hold: 1.2 },
      { at: 1.1, caption: 'The corners of the room do not agree.', hold: 2.4 },
      { at: 3, burst: { kind: 'motes', on: 'target', count: 16 } },
      named(4.3, name, epithet),
    ]),

  // The lamps go out one by one, and the picture with them; it is in the dark that is left.
  haunter_of_the_dark: (name, epithet) =>
    scene('haunter_of_the_dark', [
      shot({ dur: 2.2, yaw: to(20, 10), dist: to(1.9, 1.5), up: to(0.2, 0.35), look: to(0.5, 0.8), fov: to(58, 50), body: true, sway: 0.3 }),
      behind(2.6, to(180, 176), to(2.2, 3), to(0.9, 1.6), to(0.4, 0.7), to(60, 66), { sway: 0.7 }),
      shot({ dur: 2.6, yaw: to(-30, -10), dist: to(1.4, 1.1), up: to(0.5, 0.6), look: to(0.85, 0.9), fov: to(46, 38), body: true, sway: 0.5 }),
    ], [
      { at: 0.4, caption: 'The lamps are going out, one by one.', hold: 2.2 },
      { at: 0.9, fade: 'black', over: 0.12, sound: 'darkness', gain: 0.6 },
      { at: 1.15, fade: 'clear', over: 0.3 },
      { at: 2.7, fade: 'black', over: 0.1 },
      { at: 2.95, fade: 'clear', over: 0.25, shake: 0.14, hold: 1 },
      named(4.6, name, epithet),
    ]),

  // A colour, and then the world's colours drained toward it.
  colour_out_of_space: (name, epithet) =>
    scene('colour_out_of_space', [
      shot({ dur: 3, on: 'target', yaw: to(50, 25), dist: to(2.6, 1.6), up: to(0.3, 0.9), look: to(0.4, 0.8), fov: to(66, 52), body: true, sway: 0.3, roll: to(-3, 3) }),
      behind(3.4, to(180, 168), to(3, 2.4), to(1.4, 1.2), to(0.5, 0.65), to(58, 50), { roll: to(3, -3) }),
    ], [
      { at: 0.2, fade: 'violet', over: 0.4, sound: 'worse', gain: 0.7 },
      { at: 0.7, fade: 'clear', over: 1.6, burst: { kind: 'motes', on: 'target', count: 30 } },
      { at: 1.4, caption: 'It is a colour. It is not any of the colours.', hold: 2.6 },
      named(3.4, name, epithet),
    ]),

  // Low and wide, the great door; the whole of the sky in the frame; it does not so much come as open.
  cthulhu: (name, epithet) =>
    scene('cthulhu', [
      behind(4.2, to(180, 172), to(2.4, 3.2), to(0.5, 0.9), to(0.04, 0.95), to(70, 62), { sway: 0.15 }),
      shot({ dur: 3.4, yaw: to(70, 35), dist: to(1.0, 1.2), up: to(0.5, 0.7), look: to(0.75, 0.9), fov: to(58, 48), body: true, sway: 0.15 }),
      shot({ dur: 3, on: 'player', aim: 'other', yaw: to(135, 160), dist: to(3.6, 5), up: to(2, 3), look: to(0.5, 0.6), fov: to(62, 68), sway: 0.4 }),
    ], [
      { at: 0.3, caption: 'The angles are wrong.', hold: 2, shake: 0.2 },
      { at: 2.1, set: 'boom', gain: 1, pitch: 0.5, shake: 0.5, hold: 2.5, caption: 'The great door opens.' },
      { at: 4.6, set: 'whale', gain: 0.9, pitch: 0.55 },
      named(5.4, name, epithet, 3.8),
    ]),

  // The sea has come to the temple.
  father_dagon: (name, epithet) =>
    scene('father_dagon', [
      shot({ dur: 3.6, yaw: to(60, 35), dist: to(1.1, 1.35), up: to(0.05, 0.15), look: to(0.1, 0.8), fov: to(64, 56), body: true, sway: 0.25 }),
      behind(2.8, to(180, 176), to(3.6, 4.6), to(0.7, 1.4), to(0.5, 0.6), to(62, 66)),
    ], [
      { at: 0.3, set: 'boom', gain: 0.8, pitch: 0.6, shake: 0.35, hold: 1.6 },
      { at: 1.1, caption: 'The sea has come up into the temple.', hold: 2.6 },
      { at: 2.2, burst: { kind: 'motes', on: 'target', count: 24 } },
      named(3.6, name, epithet),
    ]),

  // The yellow sign, and a name that has been said twice.
  hastur: (name, epithet) =>
    scene('hastur', [
      behind(3, to(180, 172), to(2.8, 2.2), to(1.2, 1.7), to(0.6, 0.85), to(60, 52), { roll: to(0, 6) }),
      shot({ dur: 3.6, yaw: to(-10, 12), dist: to(1.3, 1.0), up: to(0.7, 0.75), look: to(0.88, 0.9), fov: to(44, 34), roll: to(-5, 4), body: true, sway: 0.5 }),
    ], [
      { at: 0.2, fade: 'gold', over: 0.3, sound: 'sight', gain: 0.7 },
      { at: 0.55, fade: 'clear', over: 1.4 },
      { at: 1.2, caption: 'You have heard the name. Do not say it again.', hold: 2.6, set: 'whisper', gain: 0.8, pitch: 0.7 },
      named(3.8, name, epithet),
    ]),

  // The gate: the sky fills with its spheres, and past, present and future are one.
  yog_sothoth: (name, epithet) =>
    scene('yog_sothoth', [
      behind(3.6, to(180, 170), to(2.6, 3.4), to(1.1, 1.4), to(0.3, 0.8), to(70, 60), { sway: 0.2 }),
      shot({ dur: 3.2, yaw: to(80, 45), dist: to(1.0, 1.3), up: to(0.4, 0.6), look: to(0.6, 0.85), fov: to(56, 48), body: true, sway: 0.2 }),
    ], [
      { at: 0.1, fade: 'violet', over: 0.2, sound: 'teleport', gain: 0.8 },
      { at: 0.35, fade: 'clear', over: 1.6, burst: { kind: 'stars', on: 'target', count: 50 } },
      { at: 1.3, caption: 'Past, present, future: all are one.', hold: 2.8, set: 'choral', gain: 0.6, pitch: 0.7 },
      named(4.2, name, epithet),
    ]),

  // It does not see you. Over the piping the shot holds, and holds.
  azathoth: (name, epithet) =>
    scene('azathoth', [
      behind(4.4, to(180, 174), to(2.2, 3.4), to(0.6, 1.1), to(0.1, 0.9), to(72, 64), { sway: 0.1 }),
      shot({ dur: 3.6, yaw: to(100, 60), dist: to(0.9, 1.15), up: to(0.2, 0.5), look: to(0.7, 0.9), fov: to(60, 52), body: true, sway: 0.1 }),
    ], [
      { at: 0.4, set: 'choral', gain: 0.8, pitch: 0.5, caption: 'It does not see you. It does not need to.', hold: 3 },
      { at: 3.6, burst: { kind: 'stars', on: 'target', count: 40 }, shake: 0.2, hold: 1.5 },
      named(4.8, name, epithet, 3.8),
    ]),

  // A tall man in a good coat, who thanks you for coming.
  nyarlathotep: (name, epithet) =>
    scene('nyarlathotep', [
      behind(3, to(180, 175), to(2.6, 2.1), to(1.6, 1.7), to(0.7, 0.85), to(54, 46), { sway: 0.4 }),
      shot({ dur: 2.8, yaw: to(14, 4), dist: to(1.6, 1.2), up: to(0.85, 0.85), look: to(0.7, 0.86), fov: to(40, 34), body: true, sway: 0.3 }),
      behind(2.8, to(168, 180), to(2, 3.4), to(1.7, 2.4), to(0.6, 0.7), to(48, 60), { roll: to(0, -4) }),
    ], [
      { at: 0.6, caption: 'A tall man in a good coat.', hold: 2, set: 'whisper', gain: 0.8, pitch: 0.85 },
      { at: 3.3, caption: 'There is a key on his watch chain.', hold: 2.4 },
      { at: 5.6, burst: { kind: 'embers', on: 'target', count: 20 } },
      named(5.8, name, epithet, 3.6),
    ]),

  // The woods answer.
  shub_niggurath: (name, epithet) =>
    scene('shub_niggurath', [
      shot({ dur: 3.4, yaw: to(40, 20), dist: to(1.0, 1.25), up: to(0.1, 0.3), look: to(0.4, 0.8), fov: to(66, 56), body: true, sway: 0.3 }),
      behind(2.8, to(180, 172), to(3, 2.4), to(1.2, 1.5), to(0.5, 0.6), to(60, 52)),
    ], [
      { at: 0.2, set: 'gust', gain: 0.9, pitch: 0.6, shake: 0.2, hold: 1.4 },
      { at: 1, caption: 'The forest is breathing.', hold: 2.4 },
      { at: 2.4, set: 'whale', gain: 0.8, pitch: 0.5, burst: { kind: 'ash', on: 'target', count: 20 } },
      named(3.6, name, epithet),
    ]),
};

/** The arrival scene of its own that horror `id` has, if it has one. */
export const bespokeArrival = (id: string, name: string, epithet: string | undefined): Scene | undefined => BESPOKE[id]?.(name, epithet);
