/**
 * Signature mechanics (spec §3E): the only bespoke boss logic, keyed by roster id. Each one hangs
 * off its boss's fight (bossFight.ts): it may act when the fight begins, every step while it lasts,
 * when it resets or ends, offer the investigator an action on E, or lend the boss more attacks.
 * Every other boss is composed from the shared attack library and reality hooks alone. Hastur's is
 * not a fight's: its name calls it into the world (signatures/hastur.ts, registered by game.ts).
 */

import type { Entity } from '../core/ecs';
import type { AttackChoice } from '../data/archetypes';
import type { Fight, Game } from './components';
import { COLOUR_SIGNATURE } from './signatures/colour';
import { CTHULHU_SIGNATURE } from './signatures/cthulhu';
import { DUNWICH_SIGNATURE } from './signatures/dunwichHorror';

/** Something the investigator can do in a fight with E. */
export interface FightAction {
  label: string;
  run(): void;
}

export interface Signature {
  engage?(g: Game, e: Entity, f: Fight): void;
  step?(g: Game, e: Entity, f: Fight): void;
  reset?(g: Game, e: Entity, f: Fight): void; // the investigator died, or the boss gave up the chase
  end?(g: Game, e: Entity, f: Fight): void; // the boss died
  action?(g: Game, e: Entity, f: Fight): FightAction | null;
  extra?(g: Game, e: Entity, f: Fight): AttackChoice[]; // attacks beyond its phase's own
}

export const SIGNATURES: Readonly<Record<string, Signature>> = {
  colour_out_of_space: COLOUR_SIGNATURE,
  dunwich_horror: DUNWICH_SIGNATURE,
  cthulhu: CTHULHU_SIGNATURE,
};
