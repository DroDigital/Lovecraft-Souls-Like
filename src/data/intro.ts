/**
 * How a new game begins (playtest round 1): a telegram and four entries from the investigator's
 * notebook, shown one card at a time before they wake in the dream. Plain prose. Data only.
 */

export interface IntroCard {
  heading: string;
  text: readonly string[]; // paragraphs
}

export const INTRO: readonly IntroCard[] = [
  {
    heading: 'WESTERN UNION · ARKHAM MASS · OCT 3 1928',
    text: ['COME AT ONCE STOP PEASLEE FOUND ASLEEP IN THE LIBRARY FOUR DAYS AGO AND CANNOT BE WOKEN STOP SIX MORE IN TOWN THE SAME STOP WILL MEET THE BOSTON TRAIN STOP ARMITAGE'],
  },
  {
    heading: 'From the notebook. October 5th.',
    text: [
      "Armitage took me to St. Mary's Hospital this morning. There are eleven sleepers now, two of them children. Their eyes move under the lids as if they were reading.",
      'The night nurses say they all talk in their sleep, and about the same things: a stair going down, a key, and a tall man in a good coat who came to see them.',
    ],
  },
  {
    heading: 'October 6th.',
    text: [
      'Armitage let me into the restricted room. He thinks Peaslee read something he should have left alone, and that the sleepers are not so much asleep as somewhere else. He wants me to go after them.',
      'He drew me the sign they used to cut over doorways in the old towns, and said that wherever I find it I will be safe to rest. He also gave me a lamp. I asked him what the lamp was for, and he did not answer.',
    ],
  },
  {
    heading: 'October 6th, late.',
    text: [
      'I lay down on a bench in the reading room a little after eleven. I remember the clock striking.',
      'When I opened my eyes the lamps were out and the building was empty. Through the windows I could see the quadrangle, and beyond it a town I did not recognise.',
    ],
  },
];

/** Under the title: the time and place, and what is wrong there. */
export const TITLE_LINES = ['Arkham, Massachusetts · October 1928', 'Eleven people in Arkham have fallen asleep and cannot be woken.'] as const;
