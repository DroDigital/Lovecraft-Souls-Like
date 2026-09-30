/** The open world's state (spec §3D), kept in the Game (components.ts); absent in the arena. Pure. */

import type { Entity } from '../core/ecs';
import type { Explored } from './exploration';
import type { Tally } from './tally';

/** Open-world state (spec §3D); absent in the arena. */
export interface Overworld {
  sign: string; // the Elder Sign last rested at: the respawn point
  discovered: Set<string>; // Elder Signs found: fast-travel destinations
  slain: Set<string>; // spawn ids of bosses and optional bosses, gone for good
  killed: Set<string>; // spawn ids of foes killed since the last rest or death
  wounds: Map<string, number>; // spawn id → health fraction of a wounded foe let go: it comes back so, until a rest or death
  read: Set<string>; // tomes read
  named: number; // times Hastur's name has appeared (signatures/hastur.ts)
  called: Set<string>; // bosses called into the world: until then their spawn stays empty
  watched: Set<string>; // horrors whose arrival has been shown (round 20: the cutscene plays once)
  ending: string | null; // the ending chosen, once one has been (endings.ts)
  alive: Map<string, Entity>; // spawn id → the creature standing for it
  region: string | null; // where the investigator is
  chunk: number; // the investigator's chunk key
  dirty: boolean; // spawn points need another look
  explored: Explored; // the ground seen, for the map (exploration.ts)
  lookedFrom: number; // the cell the investigator last looked around from
  quests: Map<string, number>; // each quest begun: its open stage, or its stage count once done (quests.ts)
  met: Set<string>; // the people talked with (npcs.ts)
  sold: Map<string, number>; // wares bought from merchants, by ware (trade.ts; round 12)
  tally: Tally; // the run's numbers (tally.ts; round 12)
  said: Set<string>; // dungeon rooms that have said their words since the last rest or death (roomWords.ts)
  places: Set<string>; // the named places found (places.ts; round 18)
  told: Set<string>; // what has been told or shown once, and is not again: a rumour of a horror's fall, a wandering sight, a hint of what a second journey changes (round 26)
}
