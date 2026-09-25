/** The events the systems send each other over the typed bus (spec §1), and the sanity bands. Pure. */

import type { Entity } from '../core/ecs';
import type { V3 } from '../core/geom';

export type HitOutcome =
  | 'dodged'
  | 'parried'
  | 'blocked'
  | 'guardBreak'
  | 'hit'
  | 'stagger'
  | 'riposte'
  | 'interrupted'
  | 'kill';

/** Sanity bands (spec §3A), from the sanest. */
export const BANDS = ['lucid', 'uneasy', 'fractured', 'unmoored'] as const;
export type Band = (typeof BANDS)[number];

export interface GameEvents {
  Hit: { attacker: Entity; target: Entity; outcome: HitOutcome; damage: number; lingering?: boolean }; // lingering: a pool's or the void's tick
  Shot: { shooter: Entity; from: V3; to: V3; target: Entity | null };
  Died: { entity: Entity; killer: Entity | null; at: V3 };
  Respawned: { entity: Entity };
  Echoes: { change: 'earned' | 'dropped' | 'recovered' | 'lost'; amount: number; total: number };
  LockChanged: { target: Entity | null };
  SanityBandChanged: { from: Band; to: Band; sanity: number };
  SanityLost: { amount: number; sanity: number }; // a loss of at least SANITY.jolt at once (a blow, a sight, a burst), not a slow drain
  InsightChanged: { insight: number; change: number; cause: 'sight' | 'tome' | 'upgrade' | 'debug' | 'load' | 'quest'; source: string };
  FirstSight: { entity: Entity; name: string; sanity: number; insight: number }; // sanity lost, insight gained
  Discovered: { sign: string; name: string }; // an Elder Sign found
  Rested: { sign: string; name: string };
  RestRefused: { sign: string };
  Travelled: { via: 'sign' | 'gate' | 'dream'; to: string; name: string };
  RegionEntered: { region: string; name: string };
  Vanquished: { entity: Entity; name: string }; // a boss or optional boss, slain for good
  BossEngaged: { entity: Entity; name: string };
  BossPhase: { entity: Entity; phase: number };
  Teleported: { entity: Entity; from: V3; to: V3 };
  Summoned: { entity: Entity; by: Entity };
  GazeBurst: { sanity: number };
  Darkened: { by: Entity };
  TimeSkipped: { entity: Entity };
  BodyStolen: { frames: number };
  Rewired: { entity: Entity };
  Revealed: { entity: Entity; doses: number };
  LampChanged: { lamp: Entity; lit: boolean };
  Petrified: { by: Entity };
  Named: { name: string; count: number }; // Hastur's name, flickering onto the HUD
  Rammed: { entity: Entity };
  Title: { text: string }; // a set piece's words across the screen
  Notice: { text: string }; // a short line mid-screen
  Ending: { id: string }; // one of the three endings (endings.ts)
  Healed: { entity: Entity; amount: number }; // a shot of West's Reagent
  Erupted: { at: V3; radius: number; by: Entity }; // a marked spot bursts
  Quaked: { at: V3; by: Entity }; // a ring goes racing out
  Marked: { at: V3; by: Entity }; // ground marked to erupt (at the first spot)
  Swept: { by: Entity }; // a sweeping beam begins its sweep
  Explored: { region: string }; // more of a region seen (exploration.ts)
  Talked: { npc: string; name: string; title: string; lines: readonly string[] }; // someone spoke (npcs.ts)
  QuestChanged: { id: string; title: string; stage: number; done: boolean }; // a quest begun, moved on or done (quests.ts)
  Read: { name: string }; // a tome or a note picked up (documents.ts has its text)
}
