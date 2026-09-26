/**
 * The people of the far realms (playtest round 12: Pnakotus, K'n-yan, R'lyeh, Yuggoth and the
 * Beyond had no one in them, and the Cavern of Flame's priests stood silent). Each asks a favour
 * (quests.ts) that pays in star-stones, a weapon, a vial or insight. Nasht and Kaman-Thah speak
 * through the ally who stands for them in the Cavern (`creature`). Data only.
 */

import type { NpcDef, When } from './npcs';

const at = (quest: string, stage: When['at']): When => ({ quest, at: stage });

export const FAR_NPCS: readonly NpcDef[] = [
  {
    id: 'nathaniel', name: 'Nathaniel Wingate Peaslee', title: 'Professor of Political Economy', sign: 'pnakotus_camp', side: 1,
    look: { coat: 'tweed', hat: 'fedora', hair: 'white', glasses: true, stoop: 0.12 },
    topics: [
      { when: [at('archives', 'unstarted')], starts: 'archives', lines: [
        "Peaslee. Nathaniel. My son is at the university, I think; if you've met a Wingate Peaslee, he's mine. Don't tell him you saw me here.",
        'In 1908 I fainted in front of a lecture hall, and for five years something else wore me. It was a scholar. It came from a race that lived here before there were people, and it wanted to know everything.',
        "It wrote an account of our time for their archives. In my hand, in their script. It's down there, past the reading hall. I want to see it with my own eyes before I believe any of this.",
        "And listen for whistling. They kept something walled in under the archives. It's out.",
      ] },
      { when: [at('archives', 0)], lines: ["The archives lie under the sand to the west. Look for the reading hall; they kept a sign there, like the ones outside."] },
      { when: [at('archives', 1)], lines: [
        "You found it? Then it's true, all of it. The things under the archives are the ones that finished the Great Race's cities. Polyps, they called them. They can't be seen all the time.",
        'The worst of them is in the vault below the manuscripts. While it lives the others follow it. Please.',
      ] },
      { when: [at('archives', 'done')], lines: ["It's quiet down there now. I remember more than I did. The scholar wasn't unkind. It only wanted to know.", 'Take these. The Great Race cut them for something. You will find a use.'] },
      { lines: ['The wind out of the desert carries sand into everything. Even here.'] },
    ],
  },
  {
    id: 'zamacona', name: 'Pánfilo de Zamacona', title: 'Of the company of Coronado, 1541', sign: 'knyan_depths', side: -1,
    look: { coat: 'rust', hat: 'none', hair: 'dark', beard: true },
    topics: [
      { when: [at('zamacona', 'unstarted')], starts: 'zamacona', lines: [
        "Pánfilo de Zamacona y Nuñez, of Luarca. I left Coronado's company to follow a story about a mound, and I found this.",
        "The people of Tsath do not age and do not die. They took me in, and I have been trying to leave since. I wrote it all down and I don't think anyone has ever read it.",
        "They have a god they worship, and a god they fear. The one they fear is below them, in black N'kai: Tsathoggua, the toad. While it sleeps there, nothing in K'n-yan can leave.",
        "Go down through Tsath, past the temple, and kill it. I will give you my sword. I have not been able to lift it since I came here.",
      ] },
      { when: [at('zamacona', 0)], lines: ["Tsath is below us. The way into N'kai is past the temple stair and over the span. Take a light. The dark there is not only dark."] },
      { when: [at('zamacona', 'done')], lines: ['It is quiet under Tsath now. I felt it go still.', "The espada is yours. It was made in Toledo, forty years before I was born. Don't let it rust."] },
      { lines: ['I dream of the plains sometimes. The grass was as high as a horse.'] },
    ],
  },
  {
    id: 'johansen', name: 'Gustaf Johansen', title: 'Second mate of the Emma, out of Auckland', sign: 'rlyeh_deck', side: 1,
    look: { coat: 'black', hat: 'cap', hair: 'grey', beard: true },
    topics: [
      { when: [at('alert', 'unstarted')], starts: 'alert', lines: [
        'Johansen. I was second mate on the Emma. We fought the yacht Alert in March of \'25 and took her when the Emma sank.',
        'The island came up out of the sea. Briden, Guerrera, Donovan, Ångstrom, Hawkins, Parker, Rodriguez: I took them ashore. Two of us came back to the boat.',
        "The thing that came out of the door followed us. I turned the Alert round and put her bows into it. It burst like a bladder, and then it began to come together again.",
        "She's here, the Alert. She's at the island's edge where I left her. If you mean to stand where I stood, take the helm and do what I did. It doesn't die. But it goes down.",
      ] },
      { when: [at('alert', 0)], lines: ['Go past the great door. When it comes out, get to the Alert and take the wheel. Full ahead. Don\'t look at it more than you have to.'] },
      { when: [at('alert', 'done')], lines: ["You did it. I heard it go down. I'm going to try to sleep now.", 'These came up with the island. I kept them. I didn\'t want them in my pockets any more.'] },
      { lines: ['The angles of the stones are wrong here. Walk where you can see the ground.'] },
    ],
  },
  {
    id: 'akeley', name: 'Henry Wentworth Akeley', title: 'Of Townshend, Vermont, as the Outer Ones keep him', sign: 'yuggoth_landing', side: -1,
    look: { coat: 'grey', hat: 'none', hair: 'white', beard: true, stoop: 0.18 },
    topics: [
      { when: [at('cylinders', 'unstarted')], starts: 'cylinders', lines: [
        "Akeley. You've read my letters, perhaps. Wilmarth has. Whatever sits in my chair in Vermont, it isn't me.",
        'They took my brain out and carried it across space in a metal cylinder. I thought it would be marvellous. I was wrong. I can see and hear through their machines when they allow it, and that is all.',
        "The cylinders are kept in their cities here, in the fungus. Mine is one of hundreds. Find the cities; there's one of those signs inside.",
      ] },
      { when: [at('cylinders', 0)], lines: ["The Fungoid Cities are east, past the landing. The Outer Ones won't stop to talk. Don't stop for them."] },
      { when: [at('cylinders', 1)], lines: [
        'You found them. Then you have seen what they feed. Rhan-Tegoth. It was old before they came. They keep it fed so it will keep still.',
        "While it lives in the hall of cylinders, none of them will open. Kill it and they must. I think I'd like to stop.",
      ] },
      { when: [at('cylinders', 'done')], lines: ["They're opening. I can feel mine. Thank you.", 'Take the vial, and these stones. The Outer Ones thought them important. I never learned why.'] },
      { lines: ['It is very cold on Yuggoth, and very dark. The sun is only a star from here.'] },
    ],
  },
  {
    id: 'carter', name: 'Randolph Carter', title: 'Of Boston and of Arkham', sign: 'beyond_threshold', side: 1,
    look: { coat: 'black', hat: 'fedora', hair: 'dark' },
    topics: [
      { when: [at('silver_key', 'unstarted')], starts: 'silver_key', lines: [
        "Carter. Yes, the key was mine. My great-great-grandfather's. He asked me for it very politely, and I said no, and he came back when I was asleep.",
        "I've been through this gate before. 'Umr at-Tawil will guide you if you let him. He offered me something once. I took it, and I have not been entirely myself since.",
        "Past him is Yog-Sothoth. It is the gate and the key and the guardian of the gate, all at once. While it holds, the tall man's way stays open.",
        'Put it down, and what is left is the Court, and a choice. Make it yourself.',
      ] },
      { when: [at('silver_key', 0)], lines: ["Yog-Sothoth waits past 'Umr at-Tawil. Its spheres are gates. Step through them and you'll be somewhere else in the same place."] },
      { when: [at('silver_key', 'done')], lines: ['It is closed, then. Or as closed as it ever was.', 'Go on to the Court. Whatever you decide there, you will have decided it.'] },
      { lines: ['I have seen the other side of this more than once. It does not get easier.'] },
    ],
  },
  {
    id: 'nasht', name: 'Nasht & Kaman-Thah', title: 'Priests of the Cavern of Flame', sign: 'dream_cavern', side: 1, creature: 'nasht_kaman_thah',
    look: { coat: 'robe', hat: 'band', hair: 'white', beard: true },
    topics: [
      { when: [at('kadath', 'unstarted')], lines: [
        'We are Nasht and Kaman-Thah. Seven hundred steps more lie below this cavern, down to the Gate of Deeper Slumber and the enchanted wood.',
        'Many who come this way seek Kadath. We tell them it will be the death of their souls, and they go on. You will go on.',
      ] },
      { when: [at('kadath', 'done')], lines: ['You have been beyond. We see it on you. We will not ask what you chose.'] },
      { lines: ['The seals of Kadath are in the waking world. We cannot break them for you; only tell you that the door will know when four have gone.', 'Go down, and do not look back up the stair.'] },
    ],
  },
];
