/**
 * Moves (spec §3B) as data: attacks with combo chains, dodges, parry, the off-hand revolver and
 * the hit reactions. Frames are 60 Hz sim steps since the move started; windows are [from, to).
 * Each combatant owns a MoveSet; poses are derived from these fields, so a move needs no anim code.
 */

export type Window = readonly [from: number, to: number];

export interface HitDef {
  window: Window; // active frames
  damage: number;
  poise: number; // poise damage
  guard: number; // stamina damage when blocked
  hitstop: number; // frames, 2–4
  reach: number; // metres from the attacker's axis to the hitbox centre
  radius: number; // hitbox sphere radius, swept across the arc each frame
  height: number; // hitbox centre above the feet
  arc: readonly [from: number, to: number]; // degrees swept over the window: 0 = ahead, + = attacker's right
}

export interface ShotDef {
  frame: number; // the frame the bullet leaves the barrel (hitscan)
  damage: number;
  poise: number;
  range: number;
  hitstop: number;
}

export interface MoveDef {
  frames: number;
  stamina?: number; // paid when the move starts
  cancel?: number; // from this frame a buffered action may cut the recovery short
  combo?: { light?: string; heavy?: string }; // chain: the next move for each attack button
  iframes?: Window; // invulnerable
  parry?: Window; // frontal melee hits are parried
  interrupt?: Window; // wind-up frames in which a revolver hit interrupts this move
  hit?: HitDef;
  shot?: ShotDef;
  motion?: { window: Window; distance: number; dir: 'facing' | 'input' | 'back' };
  track?: { window: Window; rate: number }; // turn toward the target during these frames (rad/s)
  hold?: boolean; // stays on its last frame until the game ends it (death)
}

export type MoveSet = Readonly<Record<string, MoveDef>>;

/** Reactions every combatant has. `parried` is also the riposte opening after a revolver interrupt. */
export const REACTIONS = {
  stagger: { frames: 34 },
  guardBreak: { frames: 70 },
  parried: { frames: 96 },
  death: { frames: 150, hold: true },
} satisfies MoveSet;

const slash = (arc: readonly [number, number], light: string): MoveDef => ({
  frames: 32,
  stamina: 14,
  cancel: 20,
  combo: { light, heavy: 'heavy1' },
  track: { window: [0, 8], rate: 8 },
  motion: { window: [2, 12], distance: 0.5, dir: 'facing' },
  hit: { window: [9, 13], damage: 22, poise: 14, guard: 18, hitstop: 2, reach: 1.3, radius: 0.45, height: 1.2, arc },
});

const cleave = (arc: readonly [number, number], heavy: string, damage: number, windup: number): MoveDef => ({
  frames: windup + 32,
  stamina: 26,
  cancel: windup + 16,
  combo: { light: 'light1', heavy },
  track: { window: [0, windup - 6], rate: 5 },
  motion: { window: [windup - 10, windup + 2], distance: 0.8, dir: 'facing' },
  hit: {
    window: [windup, windup + 6],
    damage,
    poise: 34,
    guard: 36,
    hitstop: 4,
    reach: 1.45,
    radius: 0.55,
    height: 1.1,
    arc,
  },
});

/** The investigator: sword-cane chains (light ×3, heavy ×2), roll, backstep, parry, revolver. */
export const PLAYER_MOVES = {
  ...REACTIONS,
  light1: slash([70, -70], 'light2'),
  light2: slash([-70, 70], 'light3'),
  light3: {
    frames: 44,
    stamina: 18,
    cancel: 30,
    combo: { light: 'light1', heavy: 'heavy1' },
    track: { window: [0, 12], rate: 6 },
    motion: { window: [6, 16], distance: 0.9, dir: 'facing' },
    hit: { window: [14, 18], damage: 30, poise: 22, guard: 26, hitstop: 3, reach: 1.6, radius: 0.4, height: 1.25, arc: [0, 0] },
  },
  heavy1: cleave([100, -60], 'heavy2', 44, 24),
  heavy2: cleave([-100, 60], 'heavy1', 48, 26),
  roll: { frames: 30, stamina: 18, cancel: 22, iframes: [2, 15], motion: { window: [0, 20], distance: 4.2, dir: 'input' } },
  backstep: { frames: 22, stamina: 12, cancel: 16, iframes: [1, 7], motion: { window: [0, 12], distance: 2.4, dir: 'back' } },
  parry: { frames: 36, stamina: 10, parry: [3, 11] },
  shoot: {
    frames: 28,
    stamina: 8,
    cancel: 18,
    track: { window: [0, 6], rate: 10 },
    shot: { frame: 7, damage: 7, poise: 4, range: 22, hitstop: 2 },
  },
} satisfies MoveSet;
