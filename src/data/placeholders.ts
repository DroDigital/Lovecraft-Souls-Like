/**
 * Phase 1 combatants: a training dummy and one placeholder Deep One (spec §5, Phase 1).
 * They stay as the default arena's sparring partners; roster creatures arrive via `?spawn` (Phase 2).
 */

import { brainOf, type BrainDef } from './archetypes';
import { REACTIONS, type MoveSet } from './moves';

export interface CombatantDef {
  name: string;
  model: string; // which primitive figure renders it
  hp: number;
  poise: number;
  speed: number; // m/s
  radius: number; // capsule
  height: number;
  aimHeight: number;
  bounty: number; // Echoes for the kill
  immortal?: boolean; // hp never drops below 1 and refills when left alone
  fixed?: boolean; // never moves or gets pushed
  brain?: BrainDef;
  moves: MoveSet;
}

export const TRAINING_DUMMY: CombatantDef = {
  name: 'Training Dummy',
  model: 'dummy',
  hp: 300,
  poise: 40,
  speed: 0,
  radius: 0.35,
  height: 1.8,
  aimHeight: 1.3,
  bounty: 0,
  immortal: true,
  fixed: true,
  moves: { ...REACTIONS, stagger: { frames: 40 } },
};

export const DEEP_ONE: CombatantDef = {
  name: 'Deep One',
  model: 'deepOne',
  hp: 190,
  poise: 36,
  speed: 3.2,
  radius: 0.45,
  height: 1.95,
  aimHeight: 1.35,
  bounty: 150,
  brain: brainOf('pack_hunter', { aggro: 15, leash: 28, range: [0, 1.5], strafe: 0, turnRate: 6, cooldown: [30, 75] }, [
    { move: 'claw', weight: 3, range: [0, 2.2] },
    { move: 'lunge', weight: 2, range: [2.8, 5.5] },
  ]),
  moves: {
    ...REACTIONS,
    death: { frames: 80, hold: true },
    claw: {
      frames: 50,
      interrupt: [6, 20],
      track: { window: [0, 16], rate: 4 },
      motion: { window: [14, 22], distance: 0.6, dir: 'facing' },
      hit: { window: [20, 25], damage: 16, poise: 12, guard: 22, hitstop: 3, reach: 1.3, radius: 0.5, height: 1.2, arc: [80, -60] },
    },
    lunge: {
      frames: 72,
      interrupt: [8, 26],
      track: { window: [0, 24], rate: 3 },
      motion: { window: [24, 36], distance: 4.2, dir: 'facing' },
      hit: { window: [28, 36], damage: 26, poise: 22, guard: 34, hitstop: 4, reach: 1.1, radius: 0.55, height: 1.1, arc: [15, -15] },
    },
  },
};
