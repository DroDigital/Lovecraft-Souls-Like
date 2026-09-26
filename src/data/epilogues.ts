/**
 * What became of the people met (playtest round 12: an ending was two paragraphs on black). After
 * an ending, each person the investigator talked with gets a line: the ending's own when it has one
 * for them, else the one for their favour done, else the one for it left undone. Data only.
 */

import type { EndingId } from './endings';

export interface Fate {
  quest?: string; // their favour
  done: string;
  undone?: string; // their favour left undone (else `done` serves)
  endings?: Partial<Record<EndingId, string>>;
}

export const FATES: Readonly<Record<string, Fate>> = {
  peaslee: {
    done: 'Wingate Peaslee went back to teaching psychology at Miskatonic. He never wrote about the autumn of 1928, though he kept his notes.',
    endings: { herald: 'Wingate Peaslee woke with the others. He asked twice to speak with you, and then stopped asking.' },
  },
  gilman: {
    quest: 'witch_house',
    done: 'Walter Gilman passed his examinations that spring. He moved out of the Witch House and would not say why.',
    undone: 'Walter Gilman did not wake. The doctors at St. Mary\'s moved him to a room without corners.',
  },
  kuranes: {
    quest: 'kadath',
    done: 'Kuranes stayed in Celephaïs. Sometimes, on the coast below Kingsport, people say they see a galley on the fog.',
  },
  morgan: {
    done: 'Dr. Morgan kept a flask of lamp oil in his desk drawer for the rest of his life. His students thought it an old man\'s joke.',
  },
  zadok: {
    quest: 'zadok',
    done: 'Zadok Allen was found on the Innsmouth breakwater a week later, quite dead, with his bottle still stoppered.',
    undone: 'Nobody in Innsmouth would say where Zadok Allen had gone.',
  },
  wilmarth: {
    quest: 'akeley',
    done: 'Albert Wilmarth published nothing about Vermont. He kept Akeley\'s notes in a locked drawer, and burned them in 1932.',
    undone: 'Albert Wilmarth went back to Vermont alone that winter. The farmhouse was empty when the sheriff came.',
  },
  willett: {
    quest: 'curwen',
    done: 'Dr. Willett went back to his practice on Benefit Street. He never again went down into a cellar.',
    undone: 'Dr. Willett was seen on the Pawtuxet road at night, carrying a lantern and a book.',
  },
  curtis: {
    quest: 'dunwich',
    done: 'The whippoorwills of Dunwich stayed quiet. Curtis Whateley put a new roof on his barn.',
    undone: 'Curtis Whateley left Dunwich for Aylesbury, and later for Boston.',
  },
  dyer: {
    quest: 'elder_city',
    done: 'Professor Dyer spoke against the Starkweather-Moore expedition until it was called off.',
    undone: 'Professor Dyer would not sign on for the second expedition. He gave no reason.',
  },
  nathaniel: {
    quest: 'archives',
    done: 'Nathaniel Peaslee wrote his account at last. His son read it, and put it with his own notes.',
    undone: 'Nathaniel Peaslee went back to Australia in 1935, alone, and walked out into the desert at night.',
  },
  zamacona: {
    quest: 'zamacona',
    done: 'Pánfilo de Zamacona\'s manuscript turned up at last in a mound in Oklahoma. Nobody who read it believed it.',
  },
  johansen: {
    quest: 'alert',
    done: 'Gustaf Johansen slept through the night for the first time since 1925.',
    undone: 'In Oslo a sailor\'s widow found her husband\'s papers, and a manuscript in English she could not read.',
  },
  akeley: {
    quest: 'cylinders',
    done: 'Somewhere past Neptune a metal cylinder stands open and empty. Henry Akeley is at rest.',
    undone: 'Henry Akeley\'s cylinder stands on a shelf with hundreds of others. He sees and hears when they allow it.',
  },
  carter: {
    quest: 'silver_key',
    done: 'Randolph Carter\'s cousins still wait for him to come back and claim his estate.',
    endings: { silver_key: 'Randolph Carter went through the Gate beside you. Neither of you was seen again.' },
  },
};

/** The line for someone met, under the ending chosen, their favour done or not. */
export function fateOf(npc: string, ending: EndingId, done: boolean): string | undefined {
  const f = FATES[npc];
  if (!f) return undefined;
  return f.endings?.[ending] ?? (f.quest && !done ? (f.undone ?? f.done) : f.done);
}
