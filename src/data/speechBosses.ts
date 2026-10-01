/**
 * What the horrors that speak say aloud (the voices). Until now no horror spoke: they had a name, a
 * line under it and an epitaph (data/bossCards.ts, epitaphs.ts), all read. Those that speak in their
 * own stories do now, twice: a line as they arrive (the first time one meets the investigator: the
 * cutscene shows it low on the screen as it is said) and a last as they fall. Each is written as it
 * is performed, [audio tags], pauses and a leaned-on CAPITAL and all (speechNpcs.ts says how); the
 * words shown are those with the tags out and the capitals let down again (`shown`). Keyed by roster
 * id; the rest stay wordless, as their stories leave them. The two that have no scene (the Dunwich
 * Horror is unseen, Brown Jenkin joins a fight already begun) say only a last line, shown as a notice
 * (render/cinemaDirector.ts). Data only.
 */

export interface BossWords {
  arrive?: string;
  fall?: string;
}

export const BOSS_SAY: Readonly<Record<string, BossWords>> = {
  wilbur_whateley: {
    arrive: "[coarsely] I came for the book... [low growl] and I'll HAVE it. [menacing] [pause] The hills are waiting on me.",
    fall: '[gasping] Yog-Sothoth... [dying] [breathless] Father... [choked] [long pause] I was not DONE.',
  },
  dunwich_horror: {
    fall: '[crying out] Help... [screaming] HELP! [sobbing] Father! [pause] FATHER! [desperate] [screaming] Yog-Sothoth!',
  },
  keziah_mason: {
    arrive: '[cackling] Come into my corner, child. [whispers] [pause] There are ANGLES here you have not learned.',
    fall: '[rasping] Brown Jenkin will weep for me. [bitter laugh] The Black Man will NOT.',
  },
  brown_jenkin: {
    fall: '[squealing] No more corners... [whimpering] [pause] no more little hands.',
  },
  black_man: {
    arrive: '[smoothly] The book is open. [low voice] Sign it, sleeper... [whispers] and every corner in the world is YOURS.',
    fall: '[coldly] Unsigned. [ominous] [pause] The book will keep your page.',
  },
  joseph_curwen: {
    arrive: '[coldly] You should have stayed in your bed. [sinister] [pause] I do not suffer the curious.',
    fall: '[rasping] You cannot unmake what has already died. [fading] [pause] I was dust before you were born.',
  },
  simon_orne: {
    arrive: '[smoothly] Orne? Yes. Or Jedediah. [amused] [chuckles] The name hardly matters. The face is borrowed in any case.',
    fall: '[wheezing] Another name gone. [faintly] [pause] I shall find another.',
  },
  edward_hutchinson: {
    arrive: '[drawling] Barons write to me from Transylvania. [coldly amused] [pause] I wonder what they would make of YOU.',
    fall: '[rasping] Gather my ashes, if you dare. [fading] [pause] I have risen from less.',
  },
  ephraim_waite: {
    arrive: '[coldly] Do not look for Asenath. [low voice] [elderly voice] [pause] She is only where I live now.',
    fall: '[strained] She was always stronger than I thought... [gasping] [pause] give her back her name.',
  },
  whisperer: {
    arrive: '[buzzing whisper] Come in... come in. [eerily pleasant] [pause] Would you like to see the stars?',
    fall: '[flat] [buzzing] There was never a man in the chair. [fading] [pause] Only the voice.',
  },
  voice_in_the_tomb: {
    arrive: '[hollow voice] You fool. [flat] [pause] He is dead... and you are still listening.',
    fall: '[fading] Seal the stone. [whispers] [pause] Do not come down again.',
  },
  lilith: {
    arrive: '[coldly sensual] Kneel, little sleeper. [low voice] [pause] The cellar has been waiting for a bride.',
    fall: '[softly] Even darkness has a door. [fading] [pause] I go home.',
  },
  dr_munoz: {
    arrive: '[calm] [courteous] Forgive the cold, señor. [softly] The warm air is poison to me... [pause] and to what I keep.',
    fall: '[weakly] The cold is failing. [fading] [pause] Open the windows. It does not matter now.',
  },
  charles_le_sorcier: {
    arrive: '[mournfully] My line was cursed in this house. [darkly] [pause] Yours is only beginning.',
    fall: '[exhaling] It is done. [wearily] [pause] Six hundred years... and it is done.',
  },
  medusa_gorgon: {
    arrive: '[velvety] Look at me, darling. [coldly amused] [pause] Everyone does, in the end.',
    fall: '[whispers] My hair... is still. [wondering] [pause] How strange. It has never been still.',
  },
  hypnos: {
    arrive: '[lulling] [slowly] Sleep is the only country I ever wanted. [whispers] Come... [pause] and I will show you the border.',
    fall: '[drowsy] Do not wake me. [faintly] [pause] I have seen what waits for those who do.',
  },
  terrible_old_man: {
    arrive: '[cackling] Mind the bottles, stranger. [wheezy] [pause] They have opinions about THIEVES.',
    fall: '[rasping] Tell the bottles... [fading] [pause] I kept my word.',
  },
  zkauba: {
    arrive: '[alien] [precise] This body is borrowed, and so is this tongue. [coldly] [pause] I am of Yaddith. You are of LESS.',
    fall: '[strained] Yaddith will wonder... [fading] [pause] where its wizard has gone.',
  },
  cthulhu: {
    arrive: "[deep voice] [slowly] Ph'nglui mglw'nafh Cthulhu R'lyeh [pause] wgah'nagl fhtagn.",
    fall: '[rumbling] I will dream you... [fading] [long pause] again.',
  },
  father_dagon: {
    arrive: '[booming] [deep voice] Come down, little land-thing. [slowly] The water is warm. [ominously] [pause] The water is ALWAYS warm.',
    fall: '[rumbling] The Reef remembers. [fading] [pause] The Reef will rise.',
  },
  mother_hydra: {
    arrive: '[low voice] [crooning] My children are singing for you. [whispers] Listen. [ominously] [pause] They are so HUNGRY.',
    fall: '[anguished] My children... [fading] [pause] go down without me.',
  },
  hastur: {
    arrive: '[whispers] [hollow voice] Have you seen the Yellow Sign? [fading] [pause] Have you seen it?',
    fall: '[breathy whisper] Carcosa... [long pause] will take me back.',
  },
  tsathoggua: {
    arrive: '[slowly] [lazy rumble] Who wakes the old toad? [yawning] [pause] I was sleeping so well.',
    fall: '[groaning] I will sleep again... [fading] [long pause] sleep is all I ever wanted.',
  },
  great_ones: {
    arrive: '[resounding] [like a chorus] We have danced on Kadath since before your kind had names. [majestic] [pause] You are too late to stop the dance.',
    fall: '[echoing] We go home... [pause] to Kadath.',
  },
  yog_sothoth: {
    arrive: '[vast] [resonant] I am the gate. [slowly] I am the key, and the guardian of the gate. [echoing] [pause] Past, present, future... all are ONE in me.',
    fall: '[fading] [echoing] The gate closes. The key turns. [whispers] [pause] I am not finished.',
  },
  umr_at_tawil: {
    arrive: "[ancient] [patient] I am 'Umr at-Tawil... the Prolonged of Life. [softly] [pause] Few who pass this way know me.",
    fall: '[calmly] Then I stand aside. [gently] [pause] The veil is yours to lift.',
  },
  shub_niggurath: {
    arrive: '[ecstatic] [echoing] Iä! Shub-Niggurath! [deep voice] [pause] The Black Goat of the Woods... with a Thousand Young!',
    fall: '[fading] My young will bury you all... [whispers] [pause] in time.',
  },
  nyarlathotep: {
    arrive: '[smoothly] Ah. You came. [amused] [pause] I did so hope you would.',
    fall: '[softly amused] Every ending is a door, little sleeper. [faint laugh] [pause] I shall be waiting on the other side.',
  },
};
