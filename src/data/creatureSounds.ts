/**
 * How each creature sounds (playtest round 20: "every enemy its own sound"). A creature's voice was
 * its tier's, so two dozen lesser horrors growled alike, every named one murmured and every great old
 * one sounded the abyss. Now each of the roster's voiced entries is its own mix of the recorded
 * families (data/samples.ts): the call it gives as it goes about, another as it turns on the
 * investigator, its cry when struck and its cry as it dies, all at its own pitch (lower for the bigger
 * and the older); and its blows may sound their own way (`attacks`) over the attack library's
 * (ATTACK_SOUNDS). Where a call is left out, the voice's synthesised recipe stays (the pipers' pipes,
 * the viol, the polyps' whistle). Creatures that are silent stay so. No two enemies share all four cries.
 */

import type { SampleSetId } from './samples';
import type { AttackId } from './schema';

export interface CreatureSound {
  call?: SampleSetId; // its idle call (omitted: its voice's recipe)
  alert?: SampleSetId; // as it turns on the investigator (omitted: its call)
  hurt?: SampleSetId; // as it is struck
  die?: SampleSetId; // as it dies (omitted: its call, deeper)
  pitch: readonly [lo: number, hi: number]; // playback rate of them all: lower for the bigger and the older
  attacks?: Partial<Record<AttackId, SampleSetId>>; // its own sound for an attack, over the whoosh
}

/** How a blow of the attack library sounds, at its first frame (a spit, at its volley's; a roar, at its window's). */
export interface AttackSound {
  set: SampleSetId;
  gain: number;
  pitch?: number;
}

export const ATTACK_SOUNDS: Partial<Record<AttackId, AttackSound>> = {
  bite: { set: 'snap', gain: 0.9 },
  lunge: { set: 'rip', gain: 0.6 },
  grab: { set: 'rip', gain: 0.55 },
  combo: { set: 'rip', gain: 0.5 },
  combo_2: { set: 'rip', gain: 0.5 },
  combo_3: { set: 'boom', gain: 0.3 },
  slam: { set: 'boom', gain: 0.35 },
  delayed_slam: { set: 'boom', gain: 0.5 },
  charge: { set: 'gust', gain: 0.7 },
  dive: { set: 'gust', gain: 0.7 },
  wind_push: { set: 'gust', gain: 1 },
  tentacle_burst: { set: 'whip', gain: 0.75 },
  aoe_ring: { set: 'boom', gain: 0.6 },
  vortex_burst: { set: 'boom', gain: 0.7 },
  quake: { set: 'rumble', gain: 0.7, pitch: 0.8 },
  spit: { set: 'spit', gain: 1 },
  roar: { set: 'roar', gain: 0.8 },
};

const s = (call: SampleSetId | undefined, alert: SampleSetId | undefined, hurt: SampleSetId, die: SampleSetId, lo: number, hi: number, attacks?: CreatureSound['attacks']): CreatureSound => ({ call, alert, hurt, die, pitch: [lo, hi], attacks });

export const CREATURE_SOUNDS: Readonly<Record<string, CreatureSound>> = {
  // Innsmouth and the sea
  deep_one: s('gargle', 'croak', 'frog', 'dieBreath', 0.78, 0.92, { lunge: 'snap' }),
  innsmouth_hybrid: s('croak', 'gargle', 'yelp', 'dieMid', 0.95, 1.1),
  dagon_priest: s('chant', 'gargle', 'hurtMan', 'dieBreath', 0.8, 0.92),
  gnorri: s('frog', 'croak', 'gargle', 'dieSlime', 0.65, 0.8),
  being_of_ib: s('croak', 'gargle', 'frog', 'dieSlime', 0.6, 0.7),
  moon_beast: s('frog', 'troll', 'squeal', 'dieSlime', 0.5, 0.62, { tentacle_burst: 'slime' }),
  // The cults and the men
  cthulhu_cultist: s('growlMan', 'chant', 'hurtMan', 'dieMan', 1.05, 1.15),
  man_of_leng: s('whisper', 'laugh', 'hurtMan', 'dieMan', 1.15, 1.3),
  reanimated_corpse: s('zombie', 'growlMan', 'zombie', 'dieMan', 0.9, 1),
  hybrid_mummy: s('zombie', 'groan', 'hurtMan', 'dieMan', 0.65, 0.75),
  kn_yan_dweller: s('choral', 'wail', 'hurtMan', 'dieMan', 0.8, 0.9),
  // Things of the dark and the burrow
  ghoul: s('chatter', 'goblin', 'squeal', 'dieMid', 0.8, 0.95),
  ghast: s('goblin', 'beast', 'yelp', 'dieBreath', 0.75, 0.9),
  zoog: s('chatter', 'squeak', 'squeal', 'dieMid', 1.35, 1.55),
  martense_degenerate: s('goblin', 'chatter', 'squeal', 'dieMid', 1.1, 1.25),
  exham_troglodyte: s('zombie', 'goblin', 'yelp', 'dieMid', 1.25, 1.4),
  rat_swarm: s('squeak', 'chatter', 'squeal', 'dieSlime', 1.3, 1.5),
  beast_in_the_cave: s('beast', 'snarl', 'yelp', 'dieBreath', 0.9, 1),
  gnoph_keh: s('beast', 'troll', 'growl', 'dieBig', 0.85, 0.95),
  ym_bhi: s('zombie', 'troll', 'groan', 'dieBig', 0.7, 0.8),
  gyaa_yothn: s('beast', 'bellow', 'roar', 'dieBig', 0.6, 0.7),
  nameless_city_reptile: s('rattle', 'hiss', 'squeal', 'dieBreath', 0.7, 0.8),
  venusian_man_lizard: s('hiss', 'rattle', 'frog', 'dieMid', 0.85, 0.95, { projectile: 'spit' }),
  serpent_man: s('rattle', 'hiss', 'hiss', 'dieBreath', 0.9, 1, { bite: 'snap', spit: 'spit' }),
  child_of_yig: s('rattle', 'hiss', 'squeal', 'dieSlime', 1.1, 1.3),
  albino_penguin: s('penguin', 'raven', 'squeal', 'dieMid', 0.9, 1.1),
  // The dream's beasts
  cat_from_saturn: s('yowl', 'snarl', 'yelp', 'dieMid', 1.1, 1.25),
  wamp: s('yelp', 'snarl', 'squeal', 'dieBreath', 0.85, 1),
  winged_hybrid: s('raven', 'shriek', 'yelp', 'dieBreath', 0.8, 0.9),
  moon_bog_wraith: s('wail', 'shriek', 'hiss', 'dieBreath', 0.85, 0.95),
  // The greater
  mi_go: s('buzz', 'click', 'bat', 'dieBreath', 0.85, 0.95, { grab: 'click' }),
  elder_thing: s('penguin', 'click', 'bat', 'dieBreath', 0.55, 0.7, { tentacle_burst: 'whip' }),
  shoggoth: s('penguin', 'slime', 'gargle', 'dieSlime', 0.95, 1.1, { tentacle_burst: 'slime', grab: 'slime', slam: 'slime' }),
  star_spawn: s('bellow', 'dragon', 'roar', 'dieBig', 0.6, 0.75),
  yithian: s('click', 'whisper', 'bat', 'dieBreath', 0.7, 0.85),
  flying_polyp: s(undefined, 'gust', 'slime', 'dieSlime', 0.7, 0.85),
  gug: s('troll', 'bellow', 'roar', 'dieBig', 0.55, 0.65),
  dhole: s('rumble', 'dragon', 'slime', 'dieBig', 0.9, 1, { spit: 'spit', bite: 'roar' }),
  shantak: s('raven', 'shriek', 'bat', 'dieBig', 0.5, 0.6),
  formless_spawn: s('slime', 'gargle', 'slime', 'dieSlime', 0.6, 0.75, { tentacle_burst: 'slime', grab: 'slime' }),
  yekubian: s('chant', 'wail', 'shriek', 'dieMid', 0.6, 0.7),
  being_from_beyond: s('wail', 'shriek', 'bat', 'dieSlime', 1.1, 1.3),
  thousand_young: s('beast', 'troll', 'squeal', 'dieSlime', 0.75, 0.85),
  // The named
  colour_out_of_space: s('choral', 'wail', 'bat', 'dieBreath', 1.4, 1.6),
  wilbur_whateley: s('troll', 'laugh', 'hurtMan', 'dieMan', 0.85, 0.95),
  dunwich_horror: s('rumble', 'dragon', 'roar', 'dieBig', 0.7, 0.8),
  keziah_mason: s('cackle', 'shriek', 'yelp', 'dieBreath', 1, 1.1),
  brown_jenkin: s('chatter', 'squeak', 'squeal', 'dieSlime', 1.2, 1.35),
  black_man: s('laugh', 'chant', 'hurtMan', 'dieMan', 0.55, 0.65),
  joseph_curwen: s('chant', 'laugh', 'hurtMan', 'dieMan', 0.88, 0.98),
  simon_orne: s('whisper', 'cackle', 'hurtMan', 'dieBreath', 0.9, 1),
  edward_hutchinson: s('chant', 'wail', 'hurtMan', 'dieMan', 0.7, 0.8),
  curwen_pit_thing: s('zombie', 'slime', 'squeal', 'dieSlime', 0.6, 0.7),
  ephraim_waite: s('chant', 'laugh', 'hurtMan', 'dieBreath', 0.82, 0.92),
  haunter_of_the_dark: s('bat', 'shriek', 'raven', 'dieBig', 0.6, 0.7, { dive: 'gust' }),
  whisperer: s('whisper', 'chant', 'hurtMan', 'dieMan', 0.65, 0.75),
  the_hound: s('howl', 'beast', 'yelp', 'dieBig', 0.7, 0.8),
  the_unnamable: s('wail', 'slime', 'shriek', 'dieSlime', 0.6, 0.7),
  shunned_house_entity: s('slime', 'rumble', 'gargle', 'dieBreath', 0.65, 0.75),
  lilith: s('shriek', 'cackle', 'yelp', 'dieBreath', 1.05, 1.15),
  zann_window_thing: s(undefined, 'gust', 'bat', 'dieBig', 0.55, 0.65),
  voice_in_the_tomb: s('whisper', 'wail', 'shriek', 'dieBreath', 0.55, 0.65),
  high_priest: s('choral', 'chant', 'hurtMan', 'dieMan', 0.7, 0.8),
  colossus_pyramids: s('rumble', 'troll', 'dragon', 'dieBig', 0.5, 0.6),
  martins_beach_horror: s('whale', 'gargle', 'frog', 'dieBig', 0.55, 0.65),
  dr_munoz: s('whisper', 'growlMan', 'hurtMan', 'dieMan', 1, 1.1),
  charles_le_sorcier: s('chant', 'cackle', 'hurtMan', 'dieBreath', 0.95, 1.05),
  medusa_gorgon: s('rattle', 'shriek', 'hiss', 'dieBreath', 0.78, 0.88),
  hypnos: s('whisper', 'choral', 'wail', 'dieBreath', 0.72, 0.82),
  the_outsider: s('zombie', 'wail', 'shriek', 'dieMan', 0.7, 0.8),
  terrible_old_man: s('cackle', 'growlMan', 'hurtMan', 'dieBreath', 0.65, 0.75),
  zkauba: s('chant', 'roar', 'hurtMan', 'dieMid', 0.72, 0.82),
  // The great old ones
  cthulhu: s('whale', 'dragon', 'roar', 'dieBig', 0.4, 0.5, { tentacle_burst: 'slime' }),
  father_dagon: s('rumble', 'whale', 'gargle', 'dieBig', 0.62, 0.72),
  mother_hydra: s('whale', 'roar', 'frog', 'dieBig', 0.75, 0.85, { spit: 'spit' }),
  hastur: s('wail', 'shriek', 'whisper', 'dieBreath', 0.5, 0.6),
  tsathoggua: s('frog', 'rumble', 'squeal', 'dieSlime', 0.4, 0.5, { spit: 'spit' }),
  ghatanothoa: s('rumble', 'choral', 'shriek', 'dieBig', 0.5, 0.6),
  rhan_tegoth: s('troll', 'bellow', 'gargle', 'dieBig', 0.42, 0.52),
  yig: s('rattle', 'hiss', 'roar', 'dieBreath', 0.5, 0.6, { spit: 'spit', bite: 'snap' }),
  bokrug: s('croak', 'whale', 'frog', 'dieSlime', 0.4, 0.5),
  nug: s('beast', 'zombie', 'squeal', 'dieSlime', 0.45, 0.55),
  yeb: s('gargle', 'rumble', 'slime', 'dieBreath', 0.45, 0.55),
  great_ones: s('choral', 'chant', 'roar', 'dieBig', 0.85, 0.95),
  // The outer gods
  azathoth: s(undefined, 'rumble', 'bat', 'dieBig', 0.4, 0.5),
  daemon_pipers: s(undefined, 'gust', 'bat', 'dieBreath', 0.8, 0.9),
  other_gods: s('choral', 'wail', 'shriek', 'dieBig', 0.72, 0.82),
  yog_sothoth: s('choral', 'rumble', 'chant', 'dieBig', 0.5, 0.6),
  umr_at_tawil: s('chant', 'choral', 'wail', 'dieBreath', 0.5, 0.6),
  ancient_ones: s('choral', 'chant', 'whisper', 'dieBreath', 0.48, 0.56),
  shub_niggurath: s('whale', 'troll', 'slime', 'dieSlime', 0.42, 0.5, { tentacle_burst: 'slime' }),
  nyarlathotep: s('laugh', 'choral', 'shriek', 'dieBig', 0.5, 0.6),
  // Allies that have a voice
  cats_of_ulthar: s('yowl', undefined, 'yelp', 'dieMid', 1.05, 1.25),
  pickman: s('chatter', undefined, 'yelp', 'dieMid', 0.65, 0.75),
};

/** A creature's sounds, or undefined for one that keeps to its tier's voice (or is silent). */
export const soundOf = (rosterId: string): CreatureSound | undefined => CREATURE_SOUNDS[rosterId];
