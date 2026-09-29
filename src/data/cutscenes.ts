/**
 * The cutscenes (playtest round 20): the wake that opens a new game, a horror's arrival and fall, and
 * the three endings. A scene is a run of shots (a camera that circles someone, or something, moving
 * from one stand to another) with beats laid over them (a line said, a fade, a sound, a burst of
 * motes). The simulation stands still through it (`frozen`) or runs slowed (`slow`), and the scene
 * blends in from the follow camera and out to it again. Data only; render/cinemaPlan.ts reads it.
 */

import type { SampleSetId } from './samples';
import type { StingerId } from './sounds';

export type Subject = 'target' | 'player' | 'sign'; // the horror, the investigator, the Elder Sign the scene is at
export type Ease = 'linear' | 'in' | 'out' | 'inout';
export type Tint = 'black' | 'white' | 'red' | 'violet' | 'gold' | 'clear'; // what the screen goes to; clear lifts it

/** A camera that stands `dist` from `on` at `yaw` from the line between it and the other party (0 between them, 180 behind `on`), and looks. Pairs run from the shot's first frame to its last. */
export interface Shot {
  dur: number; // seconds
  on: Subject;
  yaw: readonly [number, number]; // degrees
  dist: readonly [number, number]; // metres from it (of its height, with `body`)
  up: readonly [number, number]; // above its feet
  look: readonly [number, number]; // the height it aims at, of the aimed body's height (of the subject's, or of the other party's with aim: 'other')
  aim?: 'on' | 'other'; // at the subject (the default) or at the other party
  fov: readonly [number, number]; // degrees
  roll?: readonly [number, number]; // degrees
  ease?: Ease; // default inout
  body?: boolean; // dist, up and look are of the subject's (or, aimed at the other, its) height
  sway?: number; // hand-held drift, 0..1
}

/** A moment: whatever is set here happens together. */
export interface Beat {
  at: number; // seconds into the scene
  caption?: string; // a line said low on the screen
  title?: readonly [string, string?]; // the great words, and a line beneath them
  hold?: number; // seconds the caption or title stays (default 3)
  fade?: Tint; // the screen goes to this...
  over?: number; // ...over this many seconds (default 1)
  sound?: StingerId;
  set?: SampleSetId; // a recording, heard whole
  gain?: number;
  pitch?: number;
  burst?: { kind: 'ash' | 'motes' | 'embers' | 'stars'; on: Subject; count: number };
  shake?: number; // the camera trembles this hard (metres) for `hold` seconds
  rise?: boolean; // the investigator gets up from the knee
}

export interface Scene {
  id: string;
  sim: 'frozen' | 'slow'; // the world stands still, or runs at `slow` of its speed
  slow?: number;
  shots: readonly Shot[];
  beats: readonly Beat[];
  blend?: readonly [number, number]; // seconds to come in from the follow camera and to go back to it (default 0.7, 0.9; 0 for a scene that opens and closes on black)
  dark?: boolean; // it opens on black
  shut?: boolean; // it ends on black: the card that follows comes up out of it
}

const shot = (s: Partial<Shot> & Pick<Shot, 'dur'>): Shot => ({ on: 'target', yaw: [0, 0], dist: [3, 3], up: [1, 1], look: [1, 1], fov: [56, 56], body: false, ...s });
const to = (a: number, b: number): readonly [number, number] => [a, b];

export type Scale = 'person' | 'large' | 'giant' | 'colossal';

/** The size class of a horror by its height (metres). */
export const scaleOf = (height: number): Scale => (height < 3.2 ? 'person' : height < 8 ? 'large' : height < 18 ? 'giant' : 'colossal');

/** Over the shoulder: behind the investigator, looking at the horror that stands before them. */
const overShoulder = (dur: number, up: readonly [number, number], look: number, roll = to(0, 0)): Shot =>
  shot({ dur, on: 'player', aim: 'other', yaw: to(180, 172), dist: to(3, 3.9), up, look: to(look, look), fov: to(56, 61), roll, body: false, sway: 0.5 });

/** How each size of horror arrives: a stand a little off its line to the investigator, closing in on the face, then the view from behind the investigator. Distances are of the horror's own height. */
export const ARRIVAL: Readonly<Record<Scale, readonly Shot[]>> = {
  person: [
    shot({ dur: 2.4, yaw: to(24, 10), dist: to(3.6, 2.4), up: to(0.5, 0.75), look: to(0.85, 0.9), fov: to(54, 48), body: true, sway: 0.4 }),
    shot({ dur: 2, yaw: to(-34, -22), dist: to(1.7, 1.3), up: to(0.82, 0.86), look: to(0.9, 0.92), fov: to(42, 38), roll: to(-1.5, 1.5), body: true, sway: 0.5 }),
    overShoulder(2.6, to(1.75, 1.9), 0.75),
  ],
  large: [
    shot({ dur: 2.8, yaw: to(40, 15), dist: to(2.6, 2), up: to(0.12, 0.3), look: to(0.3, 0.75), fov: to(58, 52), body: true, sway: 0.3 }),
    shot({ dur: 2.2, yaw: to(-20, -8), dist: to(1.9, 1.5), up: to(0.65, 0.7), look: to(0.8, 0.8), fov: to(46, 40), roll: to(1.5, -1), body: true, sway: 0.5 }),
    overShoulder(2.6, to(1.9, 2.3), 0.65),
  ],
  giant: [
    shot({ dur: 3.6, yaw: to(55, 35), dist: to(1.35, 1.6), up: to(0.03, 0.1), look: to(0.08, 0.85), fov: to(62, 56), body: true, ease: 'inout', sway: 0.2 }),
    shot({ dur: 2.6, on: 'player', aim: 'other', yaw: to(180, 180), dist: to(4.2, 6), up: to(1.7, 3.5), look: to(0.55, 0.6), fov: to(60, 64), body: false, sway: 0.4 }),
    shot({ dur: 2, yaw: to(-15, -8), dist: to(1.7, 1.4), up: to(0.75, 0.78), look: to(0.85, 0.86), fov: to(46, 42), body: true, sway: 0.3 }),
  ],
  colossal: [
    shot({ dur: 4, on: 'player', aim: 'other', yaw: to(180, 168), dist: to(2.4, 3.2), up: to(0.9, 1.1), look: to(0.03, 0.92), fov: to(68, 60), body: false, sway: 0.2 }),
    shot({ dur: 3, yaw: to(70, 40), dist: to(1.1, 1.3), up: to(0.55, 0.62), look: to(0.8, 0.85), fov: to(54, 50), body: true, sway: 0.2 }),
    shot({ dur: 2.4, on: 'player', aim: 'other', yaw: to(130, 150), dist: to(3.4, 4.6), up: to(2, 2.6), look: to(0.5, 0.55), fov: to(60, 64), body: false, sway: 0.4 }),
  ],
};

/** A horror's fall, slowed: the camera circles the body as it goes. */
export const FALL: Readonly<Record<Scale, Shot>> = {
  person: shot({ dur: 3.4, yaw: to(95, 150), dist: to(2.6, 3.2), up: to(0.55, 0.8), look: to(0.6, 0.45), fov: to(50, 46), body: true, sway: 0.3 }),
  large: shot({ dur: 3.6, yaw: to(90, 145), dist: to(2.3, 2.9), up: to(0.3, 0.55), look: to(0.6, 0.5), fov: to(54, 50), body: true, sway: 0.3 }),
  giant: shot({ dur: 4, yaw: to(80, 130), dist: to(1.8, 2.3), up: to(0.08, 0.3), look: to(0.7, 0.5), fov: to(60, 54), body: true, sway: 0.2 }),
  colossal: shot({ dur: 4.4, yaw: to(75, 115), dist: to(1.5, 2), up: to(0.05, 0.25), look: to(0.75, 0.5), fov: to(62, 56), body: true, sway: 0.15 }),
};

/** A horror comes: its name, a beat after the close-up begins; then the scene lets go. */
export function arrival(scale: Scale, name: string, epithet: string | undefined): Scene {
  const shots = ARRIVAL[scale];
  const at = shots[0].dur + 0.3;
  return {
    id: `arrival:${scale}`,
    sim: 'frozen',
    shots,
    beats: [
      { at: 0.4, shake: scale === 'colossal' ? 0.35 : 0.12, hold: 1.4 },
      { at, title: [name.toUpperCase(), epithet], hold: 3.2 },
    ],
  };
}

/** A horror falls: a flash, the world slowed, and the camera about the body. */
export function fall(scale: Scale): Scene {
  return {
    id: `fall:${scale}`,
    sim: 'slow',
    slow: 0.28,
    shots: [FALL[scale]],
    beats: [
      { at: 0, fade: 'white', over: 0.06, shake: 0.4, hold: 1.2 },
      { at: 0.08, fade: 'clear', over: 0.9 },
    ],
    blend: [0.35, 1.1],
  };
}

/** A new game's wake (playtest round 20): out of black, a bell, the investigator rising in a strange town. */
export const WAKE: Scene = {
  id: 'wake',
  sim: 'frozen',
  blend: [0, 1.6],
  shots: [
    shot({ dur: 4.6, on: 'player', yaw: to(200, 178), dist: to(3.2, 3.6), up: to(0.25, 1.9), look: to(0.28, 0.83), fov: to(50, 58), body: false, ease: 'out', sway: 0.35 }),
    shot({ dur: 3.4, on: 'player', yaw: to(178, 176), dist: to(3.6, 4.2), up: to(1.9, 2.1), look: to(0.83, 0.89), fov: to(58, 60), body: false, sway: 0.3 }),
  ],
  beats: [
    { at: 0.3, sound: 'found', gain: 0.85 },
    { at: 0.6, burst: { kind: 'motes', on: 'player', count: 14 } },
    { at: 3.4, rise: true },
    { at: 1.2, caption: 'A stair going down.', hold: 2.6 },
    { at: 3.6, caption: 'A key. A tall man in a good coat.', hold: 3 },
    { at: 6.6, title: ['THE SLEEPERS', 'Somewhere in this dream, eleven of them wait'], hold: 3 },
  ],
};

/** The endings, each ending on black; the card comes up out of it (ui/endingCard.ts). */
export const ENDING_SCENES: Readonly<Record<string, Scene>> = {
  seal: {
    id: 'ending:seal',
    sim: 'frozen',
    shut: true,
    blend: [0.8, 0],
    shots: [
      shot({ dur: 5, on: 'player', yaw: to(180, 212), dist: to(3.4, 6), up: to(1.6, 3.6), look: to(0.72, 0.89), fov: to(52, 60), sway: 0.3 }),
      shot({ dur: 4.4, on: 'sign', yaw: to(0, 20), dist: to(4.5, 6.5), up: to(0.4, 0.6), look: to(0.42, 5), fov: to(60, 72), ease: 'in', sway: 0.2 }),
    ],
    beats: [
      { at: 0.2, fade: 'white', over: 0.5, sound: 'found', gain: 0.8 },
      { at: 0.7, fade: 'clear', over: 2.2 },
      { at: 1.2, caption: 'The key in your hand crumbles to ash.', hold: 3.2, burst: { kind: 'ash', on: 'player', count: 24 } },
      { at: 5.2, caption: 'It is morning in the reading room.', hold: 3 },
      { at: 7.2, fade: 'white', over: 1.6 },
      { at: 8.9, fade: 'black', over: 0.5 },
    ],
  },
  silver_key: {
    id: 'ending:silver_key',
    sim: 'frozen',
    shut: true,
    blend: [0.8, 0],
    shots: [
      shot({ dur: 4.4, on: 'player', yaw: to(180, 176), dist: to(4.2, 2.4), up: to(1.9, 1.7), look: to(0.78, 0.78), fov: to(52, 84), ease: 'in', sway: 0.2 }),
      shot({ dur: 4.2, on: 'player', yaw: to(176, 180), dist: to(2.4, 0.8), up: to(1.7, 1.6), look: to(0.78, 0.67), fov: to(84, 118), roll: to(0, 12), ease: 'in' }),
    ],
    beats: [
      { at: 0, fade: 'violet', over: 0.01, sound: 'teleport', gain: 0.9 },
      { at: 0.1, fade: 'clear', over: 1.6, burst: { kind: 'stars', on: 'player', count: 40 } },
      { at: 1.4, caption: 'You follow the Guide through the Gate.', hold: 3, set: 'choral', gain: 0.7 },
      { at: 4.2, burst: { kind: 'stars', on: 'player', count: 60 }, sound: 'rise', gain: 0.9 },
      { at: 6.2, fade: 'white', over: 1.6, sound: 'levelUp', gain: 0.6 },
      { at: 8, fade: 'black', over: 0.6 },
    ],
  },
  herald: {
    id: 'ending:herald',
    sim: 'frozen',
    shut: true,
    blend: [0.8, 0],
    shots: [
      shot({ dur: 4.4, on: 'player', yaw: to(12, -8), dist: to(2.8, 2), up: to(0.35, 0.45), look: to(0.56, 0.75), fov: to(44, 40), roll: to(2, -1), sway: 0.3 }),
      shot({ dur: 4.6, on: 'sign', yaw: to(0, 30), dist: to(3, 5), up: to(0.3, 6), look: to(0.58, 2.5), fov: to(54, 66), ease: 'in', sway: 0.15 }),
    ],
    beats: [
      { at: 0, fade: 'red', over: 0.01, sound: 'darkness', gain: 0.9 },
      { at: 0.1, fade: 'clear', over: 2.6, burst: { kind: 'embers', on: 'sign', count: 26 } },
      { at: 1.2, caption: 'The tall man thanks you, and helps you to your feet.', hold: 3.4, set: 'whisper', gain: 0.9, pitch: 0.8 },
      { at: 4.6, burst: { kind: 'embers', on: 'sign', count: 40 }, set: 'laugh', gain: 0.75, pitch: 0.7, shake: 0.08 },
      { at: 6.6, fade: 'red', over: 1.8 },
      { at: 8.5, fade: 'black', over: 0.5 },
    ],
  },
};
