/** The three endings (spec §5, Phase 5): their names and the words that close the dream. */

export const ENDING_IDS = ['seal', 'silver_key', 'herald'] as const;
export type EndingId = (typeof ENDING_IDS)[number];

export interface Ending {
  choice: string; // what the investigator chooses
  title: string;
  lines: readonly string[];
}

export const ENDINGS: Readonly<Record<EndingId, Ending>> = {
  seal: {
    choice: 'Wake, and seal the Gate',
    title: 'THE GATE IS SEALED',
    lines: [
      'You wake in Arkham to a cold grey dawn, the Silver Key gone to ash in your hand.',
      'What waits beyond the Gate waits still, but it waits outside.',
    ],
  },
  silver_key: {
    choice: "Pass through the Gate with 'Umr at-Tawil",
    title: 'THROUGH THE ULTIMATE GATE',
    lines: [
      "The Guide's veiled face turns to you, and you pass with it into the light where all selves are one self.",
      'Of the investigator nothing remains that anyone could mourn.',
    ],
  },
  herald: {
    choice: "Kneel, and become Nyarlathotep's herald",
    title: 'HERALD OF THE CRAWLING CHAOS',
    lines: [
      'You kneel, and the black pharaoh smiles.',
      'You will walk the waking world in its name now, and the lamps of men will gutter as you pass.',
    ],
  },
};
