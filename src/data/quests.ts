/**
 * Quests (playtest round 1): what the people met in the dream ask of the investigator. The main
 * line runs from Peaslee on the university grounds to Gilman in Arkham, down the Sleeper's stair to
 * Kuranes, and on to the Gate; the others are favours along the way. Each stage has one goal and
 * the journal's line for it; finishing the last pays the reward. Data only.
 */

export type Goal =
  | { kind: 'talk'; npc: string } // speak with them
  | { kind: 'give'; npc: string; item: 'laudanum' } // speak with them holding it: they take one
  | { kind: 'slay'; boss: string } // a boss slain for good (its roster id)
  | { kind: 'reach'; sign: string } // an Elder Sign found
  | { kind: 'seals'; count: number }; // this many of the waking world's seals broken (systems/seals.ts)

export interface QuestStage {
  goal: Goal;
  note: string; // the journal's line while it is open
}

export interface QuestDef {
  title: string;
  main?: boolean; // the main line
  after?: string; // begins only once this one is done
  auto?: boolean; // begins by itself once `after` is done (no one need ask it)
  stages: readonly QuestStage[];
  done: string; // the journal's line once it is done
  reward: { echoes?: number; insight?: number; vial?: boolean; stones?: number; weapon?: WeaponId }; // star-stones and a weapon: round 12
}

import { SEALS } from './tuning';
import type { WeaponId } from './weapons';

export const QUESTS: Readonly<Record<string, QuestDef>> = {
  sleepers: {
    title: 'The Sleepers',
    main: true,
    stages: [{ goal: { kind: 'talk', npc: 'gilman' }, note: 'Peaslee says Walter Gilman, the second sleeper, is in Arkham, west of the university. Find him.' }],
    done: 'Found Gilman on the streets of Arkham. The tall man visited him too, the night before he slept.',
    reward: { echoes: 300 },
  },
  witch_house: {
    title: 'The Witch House',
    main: true,
    after: 'sleepers',
    stages: [{ goal: { kind: 'slay', boss: 'keziah_mason' }, note: 'Keziah Mason is still in the Witch House in Arkham. Gilman cannot think straight while she is there.' }],
    done: 'Keziah Mason is gone from the Witch House.',
    reward: { echoes: 1200, insight: 1 },
  },
  descent: {
    title: 'The Stair',
    main: true,
    after: 'witch_house',
    auto: true, // the stair opens as Keziah falls (round 12)
    stages: [{ goal: { kind: 'talk', npc: 'kuranes' }, note: "Find a dreamer called Kuranes: down the stair from the Sleeper's Sign on the university grounds, and on through the Gate of Deeper Slumber." }], // round 17: read well on either side of the stair
    done: 'Kuranes told me what the key opens.',
    reward: { echoes: 500 },
  },
  kadath: {
    title: 'The Gate',
    main: true,
    stages: [
      { goal: { kind: 'seals', count: SEALS.kadath }, note: "Kadath's door is sealed by the great horrors of the waking world. Kuranes says four must fall before it opens; Keziah Mason was one." },
      { goal: { kind: 'reach', sign: 'beyond_threshold' }, note: "Kadath's door stands open. The Silver Key opens the last gate, beyond Kadath. Cross the dream lands and find it." },
    ],
    done: 'I have reached the Threshold. What happens now is my choice.',
    reward: { insight: 2 },
  },
  zadok: {
    title: 'A Drink for Zadok',
    stages: [{ goal: { kind: 'give', npc: 'zadok', item: 'laudanum' }, note: 'Zadok Allen, in Innsmouth Square, will talk for a swallow of Laudanum.' }],
    done: 'Zadok told me about Devil Reef and the Marshes, and gave me a Silver Vial.',
    reward: { vial: true },
  },
  akeley: {
    title: "Akeley's Chair",
    stages: [{ goal: { kind: 'slay', boss: 'whisperer' }, note: "Something sits in Henry Akeley's chair at the farmhouse up the road in Vermont. Wilmarth does not think it is Akeley." }],
    done: 'The thing in the chair is finished. Wilmarth gave me Akeley\'s notes.',
    reward: { insight: 2, echoes: 1000 },
  },
  curwen: {
    title: 'The Curwen Business',
    stages: [{ goal: { kind: 'slay', boss: 'joseph_curwen' }, note: 'Joseph Curwen is back, in the catacombs under Pawtuxet in Providence. Dr. Willett asks me to finish what he started.' }],
    done: "Curwen is dust again. Willett gave me the formula he used.",
    reward: { insight: 2, echoes: 800 },
  },
  dunwich: {
    title: 'Sentinel Hill',
    stages: [{ goal: { kind: 'slay', boss: 'dunwich_horror' }, note: 'Something nobody can see walks the hills around Dunwich at night. Curtis Whateley asks me to finish it.' }],
    done: 'The whippoorwills around Dunwich have gone quiet.',
    reward: { echoes: 1500 },
  },
  elder_city: {
    title: 'The City Past the Ridge',
    stages: [{ goal: { kind: 'slay', boss: 'shoggoth' }, note: "One of the Elder Things' servants still lives in their city past the ridge. Professor Dyer warns me not to let it get between me and the way out." }],
    done: 'The servant in the Elder city is dead. Dyer gave me his drawings of the murals.',
    reward: { insight: 2 },
  },
  // The far realms' favours (round 12: npcsFar.ts).
  archives: {
    title: 'In His Own Hand',
    stages: [
      { goal: { kind: 'reach', sign: 'pnakotus_archives' }, note: "Nathaniel Peaslee says an account in his own hand lies in the Archives of the Great Race, under the desert. Find the Archive Reading Hall." },
      { goal: { kind: 'slay', boss: 'flying_polyp' }, note: 'The polyps the Great Race walled in below the archives are loose. Nathaniel asks me to put down the swarm that leads them, in the vault below.' },
    ],
    done: 'The whistling below the archives has stopped. Nathaniel Peaslee remembers a little more of what he was.',
    reward: { stones: 1, insight: 2 },
  },
  zamacona: {
    title: "The Toad of N'kai",
    stages: [{ goal: { kind: 'slay', boss: 'tsathoggua' }, note: "Zamacona says Tsathoggua sleeps in black N'kai, below Tsath, and while it sleeps nothing in K'n-yan can leave. The way is past the temple stair." }],
    done: "Tsathoggua is still. Zamacona gave me his espada; he says he cannot lift it here.",
    reward: { weapon: 'rapier', echoes: 2000 },
  },
  alert: {
    title: 'Where Johansen Stood',
    stages: [{ goal: { kind: 'slay', boss: 'cthulhu' }, note: "Johansen says the Alert still lies at R'lyeh's edge. When the thing comes out of the great door, take her helm and put her bows into it." }],
    done: "The Alert struck it, as she did once before, and R'lyeh went down again. Johansen gave me the stones that came up with the island.",
    reward: { stones: 2, insight: 1 },
  },
  cylinders: {
    title: 'The Cylinders',
    stages: [
      { goal: { kind: 'reach', sign: 'yuggoth_cities' }, note: "Akeley says the Outer Ones keep brains in metal cylinders in their Fungoid Cities, his among them. Find the cities, east of the landing." },
      { goal: { kind: 'slay', boss: 'rhan_tegoth' }, note: 'The Outer Ones feed Rhan-Tegoth in the hall of cylinders. Akeley says none will open while it lives.' },
    ],
    done: "Rhan-Tegoth is dead in the hall of cylinders, and they are opening. Akeley gave me a vial and the Outer Ones' stones.",
    reward: { vial: true, stones: 1 },
  },
  silver_key: {
    title: 'The Gate and the Key',
    stages: [{ goal: { kind: 'slay', boss: 'yog_sothoth' }, note: "Randolph Carter says Yog-Sothoth is the gate and the key and the guardian, and while it holds, the tall man's way stays open. It waits past 'Umr at-Tawil." }],
    done: 'Yog-Sothoth is put down. Carter says what is left is the Court, and a choice.',
    reward: { stones: 2, insight: 3 },
  },
};
