/**
 * Achievements (playtest round 12, for Steam): what earns each, said as data. Earned ones are kept
 * with the records, beyond any save (systems/records.ts), and the desktop shell is told of each, so
 * Steam's can follow once the shell speaks to it. Data only.
 */

import type { EndingId } from './endings';

export type AchievementGoal =
  | { slay: readonly string[] } // every one of these bosses slain for good
  | { reach: string } // an Elder Sign found
  | { signs: number } // this many found
  | { seals: number } // Kadath's seals broken
  | { ending: EndingId } // this ending chosen
  | { endings: number } // this many endings reached, over every dream
  | { reinforced: number } // a weapon reinforced this far
  | { level: number } // the investigator's level
  | { journey: number } // the journey (NG+) under way
  | { met: 'all' } // everyone who can be talked with
  | { kills: number }; // foes killed in one dream

export interface AchievementDef {
  name: string;
  note: string;
  goal: AchievementGoal;
}

export const ACHIEVEMENTS = {
  signs: { name: 'Signs in the Dark', note: 'Find another Elder Sign.', goal: { signs: 2 } },
  witch: { name: 'The Angles of the House', note: 'Put down Keziah Mason in the Witch House.', goal: { slay: ['keziah_mason'] } },
  colour: { name: 'What the Heath Remembers', note: 'Put down the Colour Out of Space.', goal: { slay: ['colour_out_of_space'] } },
  dunwich: { name: 'The Powder of Ibn Ghazi', note: 'Put down the Dunwich Horror.', goal: { slay: ['dunwich_horror'] } },
  deep: { name: "Y'ha-nthlei", note: 'Put down Father Dagon and Mother Hydra.', goal: { slay: ['father_dagon', 'mother_hydra'] } },
  steps: { name: 'Seventy Steps', note: 'Go down to the Cavern of Flame.', goal: { reach: 'dream_cavern' } },
  seals: { name: "Kadath's Door", note: 'Break four of the seals on Kadath.', goal: { seals: 4 } },
  cthulhu: { name: 'Where Johansen Stood', note: 'Ram Cthulhu with the Alert.', goal: { slay: ['cthulhu'] } },
  hastur: { name: 'The Third Naming', note: 'Put down Hastur.', goal: { slay: ['hastur'] } },
  shub: { name: 'The Thousand Young', note: 'Put down Shub-Niggurath.', goal: { slay: ['shub_niggurath'] } },
  chaos: { name: 'The Crawling Chaos', note: 'Put down Nyarlathotep.', goal: { slay: ['nyarlathotep'] } },
  piping: { name: 'The Piping Fades', note: 'Outlast Azathoth.', goal: { slay: ['azathoth'] } },
  sealed: { name: 'The Gate Is Sealed', note: 'Wake, and seal the Gate.', goal: { ending: 'seal' } },
  through: { name: 'Through the Ultimate Gate', note: "Pass through with 'Umr at-Tawil.", goal: { ending: 'silver_key' } },
  herald: { name: 'Herald of the Crawling Chaos', note: 'Kneel.', goal: { ending: 'herald' } },
  every: { name: 'Every Door', note: 'Reach all three endings.', goal: { endings: 3 } },
  stones: { name: 'Set in Star-stone', note: 'Reinforce a weapon to +5.', goal: { reinforced: 5 } },
  strength: { name: 'The Weight of Echoes', note: 'Reach level 30.', goal: { level: 30 } },
  people: { name: 'The Other Sleepers', note: 'Talk with everyone in the dream.', goal: { met: 'all' } },
  hundred: { name: 'A Hundred Horrors', note: 'Kill a hundred foes in one dream.', goal: { kills: 100 } },
  again: { name: 'Once More into the Dream', note: 'Begin a second journey, carrying your strength.', goal: { journey: 2 } },
} satisfies Record<string, AchievementDef>;

export type AchievementId = keyof typeof ACHIEVEMENTS;
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
