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
  | { kind: 'reach'; sign: string }; // an Elder Sign found

export interface QuestStage {
  goal: Goal;
  note: string; // the journal's line while it is open
}

export interface QuestDef {
  title: string;
  main?: boolean; // the main line
  after?: string; // begins only once this one is done
  stages: readonly QuestStage[];
  done: string; // the journal's line once it is done
  reward: { echoes?: number; insight?: number; vial?: boolean };
}

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
    stages: [{ goal: { kind: 'talk', npc: 'kuranes' }, note: "Rest at the Sleeper's Sign on the university grounds and go down the stair. Find a dreamer called Kuranes." }],
    done: 'Kuranes told me what the key opens.',
    reward: { echoes: 500 },
  },
  kadath: {
    title: 'The Gate',
    main: true,
    stages: [{ goal: { kind: 'reach', sign: 'beyond_threshold' }, note: 'The Silver Key opens the last gate, beyond Kadath. Cross the dream lands and find it.' }],
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
};
