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
      'You wake on the bench in the reading room at dawn. The key in your hand has crumbled to ash.',
      "Over the next week the sleepers at St. Mary's wake one by one. None of them remembers anything, and Peaslee goes back to teaching.",
    ],
  },
  silver_key: {
    choice: "Pass through the Gate with 'Umr at-Tawil",
    title: 'THROUGH THE ULTIMATE GATE',
    lines: [
      'You follow the Guide through the Gate.',
      'In Arkham, Armitage sits by your body for nine days. On the tenth morning the bench is empty, and nobody saw you leave.',
    ],
  },
  herald: {
    choice: "Kneel, and become Nyarlathotep's herald",
    title: 'HERALD OF THE CRAWLING CHAOS',
    lines: [
      'You kneel. The tall man thanks you and helps you to your feet.',
      'You wake in the reading room feeling rested. Armitage tells you the sleepers woke in the night. He does not look at you while he says it.',
    ],
  },
};
