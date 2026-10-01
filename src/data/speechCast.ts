/**
 * Who speaks with which voice (the voices): an ElevenLabs voice for each person met at an Elder Sign
 * (`npc:<id>`) and each horror that speaks (`boss:<roster id>`), chosen from the voices the workspace
 * can use by what they are said to sound like (nobody has listened to the casting yet: it is one table,
 * and a line is made again with `voice` changed and `public/voice` refreshed, docs/VOICES.md). The
 * ordinary ones are ElevenLabs' own premade voices; the monstrous, the old and the foreign are voices
 * from its library, which a recording can be made with only on the Creator plan or above. `rate` and
 * `echo` are the game's own: a playback rate below 1 lowers a voice and slows it (the great and the
 * old), and `echo` puts some hall behind it. Data only.
 */

export interface Voice {
  voice: string; // the ElevenLabs voice id
  name: string; // what the library calls it
  rate?: number; // playback rate, pitch and pace together (default 1)
  echo?: number; // how much of a hall is behind it, 0..1 (default none)
  gain?: number; // a level of its own (default 1)
}

type Own = Pick<Voice, 'rate' | 'echo' | 'gain'>;
/** A voice (id, name) and the way it is played for one speaker. */
const v = (voice: readonly [string, string], more: Own = {}): Voice => ({ voice: voice[0], name: voice[1], ...more });

/** Premade voices (ElevenLabs' own). */
const ERIC = ['cjVigY5qzO86Huf0OWal', 'Eric - Smooth, Trustworthy'] as const;
const WILL = ['bIHbv24MWmeRgasZH58o', 'Will - Relaxed Optimist'] as const;
const ROGER = ['CwhRBWXzGAHq8TQ4Fs17', 'Roger - Laid-Back, Casual, Resonant'] as const;
const BRIAN = ['nPczCjzI2devNBz1zQrb', 'Brian - Deep, Resonant and Comforting'] as const;
const CALLUM = ['N2lVS1w4EtoT3dr4eOWO', 'Callum - Husky Trickster'] as const;
const CHRIS = ['iP95p4xoKVk53GoZ742B', 'Chris - Charming, Down-to-Earth'] as const;
const BILL = ['pqHfZKP75CvOlQylNhV4', 'Bill - Wise, Mature, Balanced'] as const;
const DANIEL = ['onwK4e9ZLuTAKqWW03F9', 'Daniel - Steady Broadcaster'] as const;
const GEORGE = ['JBFqnCBsd6RMkjVDRZzb', 'George - Warm, Captivating Storyteller'] as const;
const HARRY = ['SOYHLrjzK2X1ezoPC6cr', 'Harry - Fierce Warrior'] as const;

/** Library voices, kept for more than one speaker. */
const MALVORYX = ['ysswSXp8U9dFpzPJqFje', 'Malvoryx The Monster'] as const;
const DEEP_DARK = ['k1fCGnhRbXzd6bzwlD2B', 'Parasyte - Dweller in the Deep-Dark'] as const;
const MOSSBEARD = ['bFrjFL4nlpeYNwNRhXxq', 'Mossbeard | The God of the Wild'] as const;

export const CAST: Readonly<Record<string, Voice>> = {
  // people met at the Elder Signs
  'npc:peaslee': v(ERIC),
  'npc:gilman': v(WILL),
  'npc:morgan': v(['AFtA63zAzQAlNDuzSRKy', 'Josef Hammer – Deep & Expressive']), // round 29: Adam was a generic firm voice for a trader who deals in Echoes; this one is smoky, low and unhurried
  'npc:kuranes': v(['jAW0IMxOTz75sgLAYWp6', 'Desmond (UK) - Distinguished Persuasion']),
  'npc:zadok': v(['KgUSWQPFmuiZ5ycRbnty', 'Jessie - Vintage Narrator']),
  'npc:wilmarth': v(ROGER),
  'npc:willett': v(BRIAN),
  'npc:curtis': v(CALLUM),
  'npc:dyer': v(CHRIS),
  'npc:nathaniel': v(BILL),
  'npc:zamacona': v(['FwXEXFL5y9qj7wNLrZeS', 'Diego - Professional and Smart']),
  'npc:johansen': v(['6moWX0dfuSmryJkGegeK', 'Birk - Norwegian Male']),
  'npc:akeley': v(['wcATjh8zBDfepqUbl99V', 'Rick - Raspy Narrator']),
  'npc:carter': v(DANIEL),
  'npc:nasht': v(MOSSBEARD, { echo: 0.2 }),
  // the horrors that speak
  'boss:wilbur_whateley': v(HARRY, { rate: 0.96 }),
  'boss:dunwich_horror': v(HARRY, { rate: 0.72, echo: 0.5 }),
  'boss:keziah_mason': v(['HH3kybY6uEJ2ebSa9Vy3', 'The Ancient Evil']),
  'boss:brown_jenkin': v(['1KFdM0QCwQn4rmn5nn9C', 'Parasyte - Whispers from the Deep Dark'], { rate: 1.12 }),
  'boss:black_man': v(['vfaqCOvlrKi4Zp7C2IAm', 'Hellin - Deep Intense British Male'], { rate: 0.95, echo: 0.25 }),
  'boss:joseph_curwen': v(['HAvvFKatz0uu0Fv55Riy', 'Matthew Schmitz - Ancient Sage Dragon Wizard']),
  'boss:simon_orne': v(['wldVCiOxtkWPlsr2mHyo', 'Peter']),
  'boss:edward_hutchinson': v(['fGIZlgPQ75MMlvQ6WxgY', 'GERALD - Exciting Older Voice']),
  'boss:ephraim_waite': v(['YHcCpa6SBWnKDaCPZJQR', 'Mora - Gritty and Enigmatic']),
  'boss:whisperer': v(DEEP_DARK),
  'boss:voice_in_the_tomb': v(['2tTjAGX0n5ajDmazDcWk', 'Ezekiel Wren - The Voice Beneath the Floorboards'], { echo: 0.35 }),
  'boss:lilith': v(['2qQJWjw5XdG80GreshqG', 'Eleanor - Gracious and Authoritative'], { rate: 0.94, echo: 0.3 }),
  'boss:dr_munoz': v(['4ISzXkLY6aTZQsrFLVme', 'Kevo - Calm, slight accent']),
  'boss:charles_le_sorcier': v(['1BfrkuYXmEwp8AWqSLWk', 'Declan Graves - Haunted Rasps and Old World Dread']),
  'boss:medusa_gorgon': v(['aAsWcN5jdLdiYG7Hq0YL', 'Harriet - Mature British Actress']),
  'boss:hypnos': v(['HY3TS25BHEPeVdb2Lwn4', 'Rodo - Calm & Low'], { rate: 0.94 }),
  'boss:terrible_old_man': v(['uVKHymY7OYMd6OailpG5', 'Frederick - Old Gnarly Narrator']),
  'boss:zkauba': v(['wJitxbuYOmWYd7CIK0KK', 'Kalen']),
  'boss:cthulhu': v(['rCYFsCX2waxtHCgVD0e8', 'Matthew Schmitz - The Demon'], { rate: 0.8, echo: 0.6 }),
  'boss:father_dagon': v(MALVORYX, { rate: 0.88, echo: 0.45 }),
  'boss:mother_hydra': v(['YGWwh1G8pUwWmJyCCpma', 'Blue - Commander with Grit'], { rate: 0.92, echo: 0.45 }),
  'boss:hastur': v(['jdrqQ2ZMWENd1cuRByWG', 'Katie - Soft Whisper Voice'], { echo: 0.5 }),
  'boss:tsathoggua': v(['NyBVtlh1XAem9yCxNuWk', 'Justin - Trusting Calm'], { rate: 0.78, echo: 0.4 }),
  'boss:great_ones': v(MALVORYX, { rate: 0.82, echo: 0.6 }),
  'boss:yog_sothoth': v(DEEP_DARK, { rate: 0.88, echo: 0.7 }),
  'boss:umr_at_tawil': v(MOSSBEARD),
  'boss:shub_niggurath': v(['kkPJzQOWz2Oz9cUaEaQd', 'Beatrice - Mature Female Storyteller'], { rate: 0.82, echo: 0.55 }),
  'boss:nyarlathotep': v(GEORGE, { rate: 0.97, echo: 0.15 }),
};
