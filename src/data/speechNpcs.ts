/**
 * How the people of the near realms say what they say (data/npcs.ts has the words; the voices):
 * each line again with [audio tags] for Eleven v4 where the voice changes, a [pause] where a beat is
 * wanted, an ellipsis for a trailing off, and a capital on the word that is leaned on (v4's own
 * guidance: tags say HOW a line is spoken, never what the speaker does, and change only where the
 * delivery does). The words are never changed (tests/speech.test.ts holds them to the words shown).
 * Keyed by person; the far realms' are in speechFar.ts. Data only.
 */

export const NPC_SAID: Readonly<Record<string, readonly string[]>> = {
  peaslee: [
    "[weary] You came in through the reading room, didn't you? [sighs] Armitage sent you. [dryly] [short pause] He always did like sending OTHER people.",
    "[calmly] I'm Peaslee. I've been here since the first of the month... [pause] as near as I can tell. [tired] [sighs] It's hard to keep time.",
    "[seriously] If you die here, you wake at the last of those carved signs you rested at. [quietly] It hurts... and you lose whatever you were carrying. [grimly] [pause] I've done it more often than I like.",
    "[gravely] The others who fell asleep are out there somewhere. [thoughtfully] Walter Gilman was the second. He had a room in the old Witch House in Arkham, west of here. [urgently] Find HIM. [uneasy] [low voice] He talked with the tall man more than any of us.",
    "[encouragingly] Gilman's in Arkham, west past the university grounds. [warmly] Follow the road.",
    "[gently] Rest at the signs when you find them. [wryly] Whatever you've killed will be back afterwards... [pause] but so will your STRENGTH.",
    "[quietly] You've been to the Gate. [long pause] [softly] I can tell by the way you stand.",
    "[gravely] If you find the man who did this... [pause] don't take ANYTHING he offers you.",
    "[matter of fact] If Gilman says the way on is down, then it's down. Use the sign at the edge of the grounds, the one set apart from the others. [softly] Rest there, and you'll find the stair.",
    "[tired] Go on. I'll be here. [sadly] [pause] I'm not sure I could leave... if I wanted to.",
    "[distant] I was reading when it happened. I remember turning a page... [long pause] [whispers] and then I was standing out here in the dark.",
  ],
  gilman: [
    "[surprised] You're from the WAKING side? [relieved] [exhales] Then you want Professor Peaslee first. [quickly] He's on the university grounds, east of here, by the carved sign on the quad.",
    "[quickly] He worked out how this place goes before any of us did. [nervous] [pause] Come back once you have seen him.",
    "[hopeful] Peaslee sent you? [exhales] [relieved] Then he's still all right. [softly] Good.",
    "[intense] I was studying Keziah Mason. They tried her for witchcraft in 1692... [pause] and she got out of Salem gaol through the corner of a CELL. [whispers] She knew a way to turn a corner that isn't in the room. [haunted] [trembling voice] I found it too.",
    "[low voice] The tall man came to my room the night before I slept. [uneasy] He was very polite. He asked if I had ever wanted to see where her angles LEAD. [trembling voice] [pause] He had a key on his watch chain... silver, and very old.",
    "[anxious] She's still in that house, her and the rat thing with the little hands. [breathless] While they're there I can't think straight. [pleading] [voice cracking] Please.",
    "[nervous] The Witch House is on the south side of town. [whispers] Mind the attic. [pause] The ceiling slopes the WRONG way.",
    "[softly] [exhales] It's quieter in my head now. [long pause] [grateful] Thank you.",
    "[thoughtful] I've been thinking about that key. Randolph Carter had one like it, the writer from Boston. He's gone missing, the papers said. [darkly] [pause] The tall man must have TAKEN it from him.",
    "[earnestly] There's a way down from here, into deeper dreams. Peaslee knows the sign. Go down the stair and ask for Kuranes. He's been dreaming longer than any of us. [hopeful] [pause] If anyone knows what a silver key opens... HE does.",
    "[distant] I keep counting the corners on this street. [long pause] [whispers] There are more of them than there should be.",
  ],
  morgan: [
    "[low voice] [satisfied] Armitage will want to hear the Horror's gone. [pause] [dryly] I carried the sprayer that night, you know. [quiet chuckle] The powder worked then, TOO.",
    "[low voice] [measured] Here, see what I have. [wry chuckle] [slowly] It all costs something... [pause] [dryly] even HERE.",
    "[low voice] [measured] Morgan. Medicine, and comparative anatomy. [pause] I was at Dunwich with Armitage and Rice, before all this. [casually] [quietly] I've been making myself useful.",
    "[low voice] [matter of fact] Lamp oil in medicine bottles, mostly. Thrown, they BURN. [pause] [softly] And a few odd things from the Exhibition Hall's drawers. [dryly] I'll trade for those Echoes of yours... [long pause] [whispers] don't ask me what I do with them.",
  ],
  kuranes: [
    "[warmly] Another one from the waking world. [gently] You have the look. [softly] Tired... [pause] and very careful.",
    "[softly] My name is Kuranes. In London I had another name, and a room I couldn't pay for. [contented] [sighs] I prefer it HERE.",
    "[grave] A silver key, and a tall man. [pause] Yes. [slowly] The key opens the last gate, the one past Kadath. Carter went through it once, and came back changed. [ominously] [low voice] Whoever has it now has left the gate open... and what's on the other side is getting into every sleeper in your county.",
    "[wistfully] You'll have to cross the dream lands to Kadath, and go on past it. The way runs through Ulthar. [lightly] [chuckles] The cats there won't hurt you... if you don't hurt THEM.",
    "[serious] But Kadath's door is sealed, and the seals are in your world, not ours. Every great horror the tall man let through holds one. [firmly] Put down FOUR of them, and the door will open. [quietly] [pause] The witch in Arkham was one.",
    "[encouraging] Four of them must fall before Kadath's door opens. Your journal will keep the count. [thoughtful] [pause] Try the places where the sleepers are worst: Innsmouth, Dunwich, the hills in Vermont.",
    "[quietly] The door is open. Ulthar first, then the mountains. [solemn] When you reach the Gate there'll be a choice to make. [earnestly] [pause] Don't let ANYONE make it for you.",
    "[softly] You've been there. I can see it on you. [sighs] Whatever you chose... [long pause] I hope it was your OWN choice.",
    "[dreamily] Celephaïs is east of here, if you ever want to stop. [long pause] [wistfully] People do.",
  ],
  zadok: [
    "[wheezy laugh] Heh. Ain't seen a dry face in this town in a MONTH. [slurring] You from Arkham? [chuckles] You look Arkham.",
    "[eager] I'll tell ye about the Reef, and the Marshes, and what come up out of the water in 'forty-six. [rasping] But talkin's thirsty work... [pause] and I ain't had a DROP since I went to sleep.",
    "[pleading] That brown bottle ye carry. The laudanum. [whining] [voice cracking] One swallow... that's all I'm askin'.",
    "[sighs contentedly] Ahh. [long pause] That's the stuff. [sharply] Now LISTEN, and don't interrupt.",
    "[conspiratorially] [low voice] Cap'n Obed Marsh went tradin' in the South Seas and come back with a religion. Folks that joined got fish and gold. [ominously] [pause] Folks that didn't... went missin'.",
    "[whispers] Them things live under Devil Reef, in a city they call Y'ha-nthlei. [fearful] The Marshes married into 'em. Half this town's got the look now... [grimly] [slowly] and sleep or wake, they'll ALL go down to the water in the end.",
    "[muttering] Here. Found this in a Marsh warehouse, glowin' like a firefly. [dismissively] Take it. I got no use for it.",
    "[grumbling] No drink? [cranky] Then no stories. Come back when ye got SOME.",
    "[hushed] Keep away from the water after dark. [long pause] [whispers] They come up... to look at the lights.",
  ],
  wilmarth: [
    "[tired] Wilmarth. I teach folklore at the university... [sighs] or I did. [thoughtfully] I came up here to see a man named Akeley, who wrote to me about things in these hills.",
    "[uneasy] His last letters didn't sound like him. The handwriting was right... but the WORDS were wrong. [low voice] When I got to the farmhouse he was sitting in the dark with a blanket over his knees, [trembling voice] [pause] and he wouldn't let me light a lamp.",
    "[hushed] I don't think whatever was in that chair was Akeley. I think it's still there. [pleading] [pause] Would you go up and look? The farmhouse is further up the road.",
    "[warning] The farmhouse is at the top of the road. [urgently] [pause] If it offers to show you the stars... say NO.",
    "[heavily] So it's done. [long pause] [whispers] I found his face and his hands in that chair once. They were a MASK. [shaken] I've never told anyone that.",
    "[quietly] Take these. Akeley kept notes on what came down from the mountains. [gratefully] They're better in your hands than in mine.",
    "[nervous] The buzzing in the woods stops when you walk near it. [long pause] [whispers] That's WORSE than the buzzing.",
  ],
  willett: [
    "[gravely] Willett. I was the Ward family's doctor, for my sins. [bitterly] You've heard of young Charles Ward? [pause] No? [sighs] Good. Nobody should have to.",
    "[solemn] He dug up an ancestor of his, Joseph Curwen, and raised him from his salts. Curwen killed the boy and took his place. [heavy sigh] I thought I had put an end to him in April. [darkly] [pause] It seems I did NOT.",
    "[urgently] Curwen is down in the old catacombs under Pawtuxet. If you go, don't let him FINISH speaking. [sternly] And if he calls up something he can't put down... [pause] run.",
    "[quietly] The catacombs are south of here, under the old farm. [firmly] Bring a light. [pause] Bring TWO.",
    "[moved] You've done what I couldn't. [long pause] [voice breaking] I don't know how to thank you.",
    "[gravely] Here is the formula I used on him. Read backwards, it puts a thing like Curwen back into dust. [softly] I pray you never need it.",
    "[wistfully] Providence was a pleasant town when I was a boy. [wryly] I suppose it still is... [pause] in the DAYTIME.",
  ],
  curtis: [
    "[suspicious] You ain't from Dunwich. [long pause] [flatly] Nobody COMES to Dunwich.",
    "[defensive] I'm Curtis Whateley. [bitterly] [pause] Not THEM Whateleys. The other ones.",
    "[low voice] Somethin' big's been walkin' the hills at night. You can't see it. You see the trees go down, and tracks like somebody rolled a hogshead through the mud. [fearful] [pause] It went up Sentinel Hill last night.",
    "[grimly] Old Wizard Whateley's grandson kept somethin' in that farmhouse. After the boy died it got loose. [gruffly] If you got the stomach... go up the hill and FINISH it.",
    "[quietly] Sentinel Hill's to the east. Listen for the whippoorwills. [whispers] When they all start up at once... [pause] it's close.",
    "[relieved] [exhales] The whippoorwills stopped. [slowly] They do that when they MISS what they come for.",
    "[gruffly] Take this. Ma kept it for bad times. [tired] [pause] I reckon these ARE bad times.",
    "[muttering] Folks in the village won't open their doors. [sighs] Can't say I blame 'em.",
    "[businesslike] Shells I've got, if you've the Echoes for 'em. Cartridges for that pistol of yours. [dryly] Ain't much else worth spendin' on.",
  ],
  dyer: [
    "[flatly] Dyer, geology, Miskatonic. [uneasy] Don't ask me how I'm here. The university hasn't sent this expedition YET. [low voice] [pause] I checked the date in my own notebook, and it says 1931.",
    "[quietly] Past the ridge there's a city. It isn't a human city, and it isn't a ruin in any ordinary sense. [grimly] [pause] The things that built it were killed by their own servants.",
    "[shaken] One of those servants is still in there. A black thing, bigger than a railway carriage, that talks in its masters' VOICES. [urgently] If you go in, don't let it get between you and the way out.",
    "[whispers] Tekeli-li. [long pause] [haunted] That's the sound it makes. If you hear it, it's already CLOSE.",
    "[relieved] [exhales] You came back. [long pause] [heavily] Danforth didn't. [pause] Not ALL of him.",
    "[tired] I've been drawing the murals from memory. [quietly] Take the pages. They show where the builders came from.",
    "[distant] The wind comes down off the plateau every afternoon... [long pause] [uneasy] and it sounds like PIPING.",
    "[matter of fact] The expedition stores are open to anyone who has come this far: cartridges, lamp oil. [darkly] [pause] I will not say what I want for them.",
  ],
};
