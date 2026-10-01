/**
 * How the people of the far realms say what they say (data/npcsFar.ts has the words; speechNpcs.ts
 * is the near realms', and its header says how a line is written): each line again with [audio tags]
 * for Eleven v4, pauses and a leaned-on capital, the words unchanged. Data only.
 */

export const FAR_SAID: Readonly<Record<string, readonly string[]>> = {
  nathaniel: [
    "[dazed] Peaslee. Nathaniel. [hesitantly] My son is at the university, I think... [pause] if you've met a Wingate Peaslee, he's mine. [quietly] [pause] Don't tell him you saw me here.",
    "[slowly] In 1908 I fainted in front of a lecture hall, and for five years something else wore me. [wondering] It was a scholar. It came from a race that lived here before there were people... [pause] and it wanted to know EVERYTHING.",
    "[thoughtfully] It wrote an account of our time for their archives. In my hand, in their script. It's down there, past the reading hall. [earnestly] I want to see it with my OWN eyes before I believe any of this.",
    "[low voice] And listen for whistling. [fearful] [pause] They kept something walled in under the archives. It's OUT.",
    "[calmly] The archives lie under the sand to the west. Look for the reading hall; they kept a sign there, like the ones outside.",
    "[breathless] You found it? [awed] [pause] Then it's true, all of it. [grave] The things under the archives are the ones that finished the Great Race's cities. Polyps, they called them. They can't be seen ALL the time.",
    "[low voice] The worst of them is in the vault below the manuscripts. While it lives, the others follow it. [pleading] [pause] Please.",
    "[softly] It's quiet down there now. [pause] I remember more than I did. [gently] The scholar wasn't unkind. It only wanted to know.",
    "[warmly] Take these. The Great Race cut them for something. [pause] You will find a use.",
    "[tired] The wind out of the desert carries sand into everything. [quietly] [pause] Even here.",
  ],
  zamacona: [
    "[formally] Pánfilo de Zamacona y Nuñez, of Luarca. [wearily] I left Coronado's company to follow a story about a mound... [bitter chuckle] and I found THIS.",
    "[quietly] The people of Tsath do not age and do not die. They took me in, and I have been trying to leave since. [sadly] I wrote it all down... [pause] and I don't think anyone has ever read it.",
    "[gravely] They have a god they worship, and a god they fear. [low voice] The one they fear is below them, in black N'kai: Tsathoggua, the toad. [ominously] [pause] While it sleeps there, nothing in K'n-yan can leave.",
    "[resolute] Go down through Tsath, past the temple, and kill it. [solemnly] I will give you my sword. [weary] [sighs] I have not been able to lift it since I came here.",
    "[calmly] Tsath is below us. The way into N'kai is past the temple stair and over the span. Take a light. [warning] The dark there is not ONLY dark.",
    "[hushed] It is quiet under Tsath now. [wondering] [pause] I felt it go still.",
    "[warmly] The espada is yours. It was made in Toledo, forty years before I was born. [gently] Don't let it rust.",
    "[wistfully] I dream of the plains sometimes. [softly] [pause] The grass was as high as a horse.",
  ],
  johansen: [
    "[gruffly] Johansen. I was second mate on the Emma. We fought the yacht Alert in March of '25 and took her when the Emma sank.",
    "[haunted] The island came up out of the sea. [slowly] Briden, Guerrera, Donovan, Ångstrom, Hawkins, Parker, Rodriguez: I took them ashore. [grimly] [pause] Two of us came back to the boat.",
    "[tense] The thing that came out of the door followed us. [intense] I turned the Alert round and put her bows into it. It burst like a bladder... [pause] [low voice] and then it began to come together again.",
    "[quietly] She's here, the Alert. She's at the island's edge where I left her. [firmly] If you mean to stand where I stood, take the helm and do what I did. [grimly] [pause] It doesn't die. But it goes DOWN.",
    "[urgently] Go past the great door. When it comes out, get to the Alert and take the wheel. [shouting] Full AHEAD! [low voice] [pause] Don't look at it more than you have to.",
    "[exhales] You did it. I heard it go down. [exhausted] [long pause] I'm going to try to sleep now.",
    "[quietly] These came up with the island. I kept them. [tired] [pause] I didn't want them in my pockets any more.",
    "[uneasy] The angles of the stones are wrong here. [low voice] [pause] Walk where you can see the ground.",
  ],
  akeley: [
    "[faintly] Akeley. You've read my letters, perhaps. Wilmarth has. [sadly] [pause] Whatever sits in my chair in Vermont... it isn't ME.",
    "[quietly] They took my brain out and carried it across space in a metal cylinder. [wistfully] I thought it would be marvellous. [bitterly] I was wrong. I can see and hear through their machines when they allow it... [pause] and that is ALL.",
    "[low voice] The cylinders are kept in their cities here, in the fungus. Mine is one of hundreds. [earnestly] Find the cities; there's one of those signs inside.",
    "[calmly] The Fungoid Cities are east, past the landing. [warning] The Outer Ones won't stop to talk. [pause] Don't stop for THEM.",
    "[hushed] You found them. Then you have seen what they feed. [dread] [pause] Rhan-Tegoth. It was old before they came. They keep it fed so it will keep still.",
    "[resigned] While it lives in the hall of cylinders, none of them will open. [softly] Kill it, and they MUST. [barely audible] [long pause] I think I'd like to stop.",
    "[wondering] They're opening. [breathless] [pause] I can feel mine. [tenderly] Thank you.",
    "[gently] Take the vial, and these stones. The Outer Ones thought them important. [wearily] [sighs] I never learned why.",
    "[quietly] It is very cold on Yuggoth, and very dark. [distant] [pause] The sun is only a star from here.",
  ],
  carter: [
    "[quietly] Carter. Yes, the key was mine. My great-great-grandfather's. [ruefully] He asked me for it very politely, and I said no... [darkly] [pause] and he came back when I was asleep.",
    "[wearily] I've been through this gate before. 'Umr at-Tawil will guide you, if you let him. [low voice] He offered me something once. [sighs] I took it... [pause] and I have not been entirely myself since.",
    "[gravely] Past him is Yog-Sothoth. It is the gate, and the key, and the guardian of the gate... all at once. [ominous] [pause] While it holds, the tall man's way stays open.",
    "[firmly] Put it down, and what is left is the Court... and a choice. [intently] [pause] Make it YOURSELF.",
    "[calmly] Yog-Sothoth waits past 'Umr at-Tawil. Its spheres are gates. [mysteriously] Step through them, and you'll be somewhere else... in the same place.",
    "[softly] It is closed, then. [long pause] Or as closed as it ever was.",
    "[gently] Go on to the Court. [solemnly] Whatever you decide there... [pause] you will have decided it.",
    "[weary] I have seen the other side of this more than once. [quietly] [pause] It does not get easier.",
  ],
  nasht: [
    "[solemnly] We are Nasht and Kaman-Thah. [slowly] Seven hundred steps more lie below this cavern, down to the Gate of Deeper Slumber and the enchanted wood.",
    "[ominously] Many who come this way seek Kadath. We tell them it will be the death of their souls, and they go on. [knowingly] [pause] You will go on.",
    "[quietly] You have been beyond. We see it on you. [gently] We will not ask what you chose.",
    "[gravely] The seals of Kadath are in the waking world. We cannot break them for you; only tell you that the door will know when FOUR have gone.",
    "[whispers] Go down... [long pause] [ominously] and do not look back up the stair.",
  ],
};
