/**
 * The people met in the dream (playtest round 1): other sleepers from Essex County and beyond,
 * each standing by an Elder Sign. What they say depends on the quests (quests.ts): the first topic
 * whose conditions hold is the one they talk about, and hearing it may begin a quest. Data only.
 */

export type When = { quest: string; at: 'unstarted' | 'done' | number };

export interface Topic {
  when?: readonly When[]; // every one must hold
  has?: 'laudanum'; // the investigator carries some
  starts?: string; // hearing it begins this quest
  lines: readonly string[];
}

export interface NpcLook {
  coat: 'tweed' | 'black' | 'grey' | 'rust' | 'robe';
  hat: 'none' | 'fedora' | 'bowler' | 'cap' | 'band';
  hair: 'grey' | 'dark' | 'white';
  beard?: boolean;
  glasses?: boolean;
  stoop?: number; // resting forward lean, radians
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  sign: string; // the Elder Sign they stand by
  side: 1 | -1; // which side of it
  look: NpcLook;
  topics: readonly Topic[];
}

const at = (quest: string, stage: When['at']): When => ({ quest, at: stage });

export const NPCS: readonly NpcDef[] = [
  {
    id: 'peaslee', name: 'Wingate Peaslee', title: 'Professor of Psychology', sign: 'hub_quad', side: 1,
    look: { coat: 'tweed', hat: 'none', hair: 'grey', glasses: true },
    topics: [
      { when: [at('sleepers', 'unstarted')], starts: 'sleepers', lines: [
        "You came in through the reading room, didn't you? Armitage sent you. He always did like sending other people.",
        "I'm Peaslee. I've been here since the first of the month, as near as I can tell. It's hard to keep time.",
        "If you die here, you wake at the last of those carved signs you rested at. It hurts, and you lose whatever you were carrying. I've done it more often than I like.",
        'The others who fell asleep are out there somewhere. Walter Gilman was the second. He had a room in the old Witch House in Arkham, west of here. Find him. He talked with the tall man more than any of us.',
      ] },
      { when: [at('sleepers', 0)], lines: ["Gilman's in Arkham, west past the university grounds. Follow the road.", "Rest at the signs when you find them. Whatever you've killed will be back afterwards, but so will your strength."] },
      { when: [at('kadath', 'done')], lines: ["You've been to the Gate. I can tell by the way you stand.", "If you find the man who did this, don't take anything he offers you."] },
      { when: [at('descent', 0)], lines: ["If Gilman says the way on is down, then it's down. Use the sign at the edge of the grounds, the one set apart from the others. Rest there and you'll find the stair."] },
      { lines: ['Go on. I\'ll be here. I\'m not sure I could leave if I wanted to.', 'I was reading when it happened. I remember turning a page, and then I was standing out here in the dark.'] },
    ],
  },
  {
    id: 'gilman', name: 'Walter Gilman', title: 'Student of Mathematics', sign: 'arkham_streets', side: -1,
    look: { coat: 'black', hat: 'cap', hair: 'dark' },
    topics: [
      { when: [at('sleepers', 'unstarted')], lines: [
        "You're from the waking side? Then you want Professor Peaslee first. He's on the university grounds, east of here, by the carved sign on the quad.",
        'He worked out how this place goes before any of us did. Come back once you have seen him.',
      ] },
      { when: [at('witch_house', 'unstarted')], starts: 'witch_house', lines: [
        "Peaslee sent you? Then he's still all right. Good.",
        'I was studying Keziah Mason. They tried her for witchcraft in 1692 and she got out of Salem gaol through the corner of a cell. She knew a way to turn a corner that isn\'t in the room. I found it too.',
        'The tall man came to my room the night before I slept. He was very polite. He asked if I had ever wanted to see where her angles lead. He had a key on his watch chain, silver and very old.',
        "She's still in that house, her and the rat thing with the little hands. While they're there I can't think straight. Please.",
      ] },
      { when: [at('witch_house', 0)], lines: ['The Witch House is on the south side of town. Mind the attic. The ceiling slopes the wrong way.'] },
      { when: [at('witch_house', 'done'), at('descent', 'unstarted')], starts: 'descent', lines: [
        "It's quieter in my head now. Thank you.",
        "I've been thinking about that key. Randolph Carter had one like it, the writer from Boston. He's gone missing, the papers said. The tall man must have taken it from him.",
        "There's a way down from here, into deeper dreams. Peaslee knows the sign. Go down the stair and ask for Kuranes. He's been dreaming longer than any of us. If anyone knows what a silver key opens, he does.",
      ] },
      { when: [at('descent', 0)], lines: ["Down the stair, and find Kuranes. Don't eat anything they offer you down there."] },
      { lines: ['I keep counting the corners on this street. There are more of them than there should be.'] },
    ],
  },
  {
    id: 'kuranes', name: 'Kuranes', title: 'A dreamer who stayed', sign: 'dream_wood', side: 1,
    look: { coat: 'robe', hat: 'band', hair: 'white', beard: true },
    topics: [
      { when: [at('kadath', 'unstarted')], starts: 'kadath', lines: [
        'Another one from the waking world. You have the look. Tired, and very careful.',
        "My name is Kuranes. In London I had another name, and a room I couldn't pay for. I prefer it here.",
        "A silver key and a tall man. Yes. The key opens the last gate, the one past Kadath. Carter went through it once and came back changed. Whoever has it now has left the gate open, and what's on the other side is getting into every sleeper in your county.",
        "You'll have to cross the dream lands to Kadath and go on past it. The way runs through Ulthar. The cats there won't hurt you if you don't hurt them.",
      ] },
      { when: [at('kadath', 0)], lines: ["Ulthar first, then the mountains. When you reach the Gate there'll be a choice to make. Don't let anyone make it for you."] },
      { when: [at('kadath', 'done')], lines: ["You've been there. I can see it on you. Whatever you chose, I hope it was your own choice."] },
      { lines: ["Celephaïs is east of here, if you ever want to stop. People do."] },
    ],
  },
  {
    id: 'zadok', name: 'Zadok Allen', title: 'Of Innsmouth, ninety-six years old', sign: 'innsmouth_square', side: -1,
    look: { coat: 'rust', hat: 'cap', hair: 'white', beard: true, stoop: 0.35 },
    topics: [
      { when: [at('zadok', 'unstarted')], starts: 'zadok', lines: [
        "Heh. Ain't seen a dry face in this town in a month. You from Arkham? You look Arkham.",
        "I'll tell ye about the Reef, and the Marshes, and what come up out of the water in 'forty-six. But talkin's thirsty work, and I ain't had a drop since I went to sleep.",
        'That brown bottle ye carry. The laudanum. One swallow, that\'s all I\'m askin\'.',
      ] },
      { when: [at('zadok', 0)], has: 'laudanum', lines: [
        "Ahh. That's the stuff. Now listen, and don't interrupt.",
        'Cap\'n Obed Marsh went tradin\' in the South Seas and come back with a religion. Folks that joined got fish and gold. Folks that didn\'t went missin\'.',
        "Them things live under Devil Reef, in a city they call Y'ha-nthlei. The Marshes married into 'em. Half this town's got the look now, and sleep or wake, they'll all go down to the water in the end.",
        "Here. Found this in a Marsh warehouse, glowin' like a firefly. Take it. I got no use for it.",
      ] },
      { when: [at('zadok', 0)], lines: ['No drink? Then no stories. Come back when ye got some.'] },
      { lines: ['Keep away from the water after dark. They come up to look at the lights.'] },
    ],
  },
  {
    id: 'wilmarth', name: 'Albert Wilmarth', title: 'Instructor of Folklore', sign: 'vermont_road', side: 1,
    look: { coat: 'grey', hat: 'bowler', hair: 'dark', glasses: true },
    topics: [
      { when: [at('akeley', 'unstarted')], starts: 'akeley', lines: [
        'Wilmarth. I teach folklore at the university, or I did. I came up here to see a man named Akeley, who wrote to me about things in these hills.',
        'His last letters didn\'t sound like him. The handwriting was right but the words were wrong. When I got to the farmhouse he was sitting in the dark with a blanket over his knees, and he wouldn\'t let me light a lamp.',
        "I don't think whatever was in that chair was Akeley. I think it's still there. Would you go up and look? The farmhouse is further up the road.",
      ] },
      { when: [at('akeley', 0)], lines: ["The farmhouse is at the top of the road. If it offers to show you the stars, say no."] },
      { when: [at('akeley', 'done')], lines: [
        "So it's done. I found his face and his hands in that chair once. They were a mask. I've never told anyone that.",
        'Take these. Akeley kept notes on what came down from the mountains. They\'re better in your hands than in mine.',
      ] },
      { lines: ['The buzzing in the woods stops when you walk near it. That\'s worse than the buzzing.'] },
    ],
  },
  {
    id: 'willett', name: 'Dr. Marinus Willett', title: 'Physician to the Ward family', sign: 'prov_benefit', side: -1,
    look: { coat: 'black', hat: 'bowler', hair: 'grey', beard: true },
    topics: [
      { when: [at('curwen', 'unstarted')], starts: 'curwen', lines: [
        "Willett. I was the Ward family's doctor, for my sins. You've heard of young Charles Ward? No? Good. Nobody should have to.",
        'He dug up an ancestor of his, Joseph Curwen, and raised him from his salts. Curwen killed the boy and took his place. I thought I had put an end to him in April. It seems I did not.',
        "Curwen is down in the old catacombs under Pawtuxet. If you go, don't let him finish speaking. And if he calls up something he can't put down, run.",
      ] },
      { when: [at('curwen', 0)], lines: ['The catacombs are south of here, under the old farm. Bring a light. Bring two.'] },
      { when: [at('curwen', 'done')], lines: [
        "You've done what I couldn't. I don't know how to thank you.",
        'Here is the formula I used on him. Read backwards, it puts a thing like Curwen back into dust. I pray you never need it.',
      ] },
      { lines: ['Providence was a pleasant town when I was a boy. I suppose it still is, in the daytime.'] },
    ],
  },
  {
    id: 'curtis', name: 'Curtis Whateley', title: 'Of the undecayed Whateleys', sign: 'dunwich_village', side: 1,
    look: { coat: 'rust', hat: 'fedora', hair: 'dark', beard: true },
    topics: [
      { when: [at('dunwich', 'unstarted')], starts: 'dunwich', lines: [
        "You ain't from Dunwich. Nobody comes to Dunwich.",
        "I'm Curtis Whateley. Not them Whateleys. The other ones.",
        "Somethin' big's been walkin' the hills at night. You can't see it. You see the trees go down, and tracks like somebody rolled a hogshead through the mud. It went up Sentinel Hill last night.",
        "Old Wizard Whateley's grandson kept somethin' in that farmhouse. After the boy died it got loose. If you got the stomach, go up the hill and finish it.",
      ] },
      { when: [at('dunwich', 0)], lines: ["Sentinel Hill's to the east. Listen for the whippoorwills. When they all start up at once, it's close."] },
      { when: [at('dunwich', 'done')], lines: ['The whippoorwills stopped. They do that when they miss what they come for.', 'Take this. Ma kept it for bad times. I reckon these are bad times.'] },
      { lines: ["Folks in the village won't open their doors. Can't say I blame 'em."] },
    ],
  },
  {
    id: 'dyer', name: 'William Dyer', title: 'Professor of Geology', sign: 'mountains_camp', side: -1,
    look: { coat: 'grey', hat: 'fedora', hair: 'grey', glasses: true },
    topics: [
      { when: [at('elder_city', 'unstarted')], starts: 'elder_city', lines: [
        "Dyer, geology, Miskatonic. Don't ask me how I'm here. The university hasn't sent this expedition yet. I checked the date in my own notebook and it says 1931.",
        "Past the ridge there's a city. It isn't a human city, and it isn't a ruin in any ordinary sense. The things that built it were killed by their own servants.",
        "One of those servants is still in there, a black thing bigger than a railway carriage that talks in its masters' voices. If you go in, don't let it get between you and the way out.",
      ] },
      { when: [at('elder_city', 0)], lines: ['Tekeli-li. That\'s the sound it makes. If you hear it, it\'s already close.'] },
      { when: [at('elder_city', 'done')], lines: ["You came back. Danforth didn't, not all of him.", "I've been drawing the murals from memory. Take the pages. They show where the builders came from."] },
      { lines: ['The wind comes down off the plateau every afternoon, and it sounds like piping.'] },
    ],
  },
];

export const npcDef = (id: string): NpcDef | undefined => NPCS.find((n) => n.id === id);
