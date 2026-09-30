/**
 * The fog before a horror (round 27: a soulslike's fog gate, and each of them a different fog): a
 * wall of mist at a boss's threshold, in the doorway of its room or rising all round its ring in the
 * open, to be walked through for the fight to begin, and gone when the horror is. Each theme is a
 * weather of that place: the grey of Arkham's churchyards, the green brine of Innsmouth, the
 * Yellow King's rags, the colour out of space, the desert's dust, the cold of Leng and the ice,
 * the stars of the Beyond. A boss is given a theme by its roster id, else its realm's. Data only.
 */

import type { Vec3 } from './tuning';

export type FogMotion = 'rise' | 'roll' | 'swirl' | 'shear'; // up from the ground, along it, about, or sideways in sheets

export interface FogTheme {
  base: Vec3; // the colour at the foot
  top: Vec3; // and at the crown
  motion: FogMotion;
  speed: number; // 1: a slow drift
  density: number; // 0..1: how much of what lies behind it shows
  sparks?: { colour: Vec3; share: number }; // motes that catch the light, stars, embers, foam
  shimmer?: number; // 0..1: hue that will not hold still (the colour out of space)
  glyph?: Vec3; // a pallid light that burns in its thicker folds (Hastur's)
  note: string; // what it is, in a line
}

export const FOG_THEMES = {
  grey: { base: [0.6, 0.6, 0.58], top: [0.78, 0.78, 0.76], motion: 'rise', speed: 1, density: 0.62, note: 'The ordinary grey of a New England graveyard at dusk.' },
  witch: { base: [0.36, 0.3, 0.46], top: [0.62, 0.56, 0.7], motion: 'swirl', speed: 1.2, density: 0.68, sparks: { colour: [0.85, 0.7, 1], share: 0.25 }, note: 'Violet smoke turning widdershins, pricked with witch-light.' },
  alchemy: { base: [0.3, 0.42, 0.26], top: [0.58, 0.68, 0.46], motion: 'roll', speed: 0.8, density: 0.7, sparks: { colour: [0.8, 0.95, 0.5], share: 0.15 }, note: "A sickly green steam: Curwen's vats, left to boil for a century." },
  storm: { base: [0.3, 0.32, 0.38], top: [0.55, 0.58, 0.68], motion: 'shear', speed: 1.8, density: 0.72, sparks: { colour: [0.8, 0.88, 1], share: 0.2 }, note: 'Cloud torn into sheets by a wind from Sentinel Hill.' },
  brine: { base: [0.22, 0.38, 0.36], top: [0.5, 0.68, 0.62], motion: 'roll', speed: 0.9, density: 0.66, sparks: { colour: [0.85, 0.95, 0.9], share: 0.3 }, note: 'Green sea-fog off Devil Reef, salt on the tongue, foam hanging in it.' },
  deep: { base: [0.12, 0.26, 0.22], top: [0.34, 0.54, 0.42], motion: 'swirl', speed: 0.6, density: 0.8, sparks: { colour: [0.5, 0.95, 0.6], share: 0.12 }, note: "R'lyeh's drowned dark: green, slow, and heavy as water." },
  grave: { base: [0.52, 0.56, 0.6], top: [0.72, 0.76, 0.8], motion: 'roll', speed: 0.6, density: 0.66, note: 'A pale, cold mist that hugs the ground and does not lift.' },
  dark: { base: [0.04, 0.04, 0.06], top: [0.18, 0.18, 0.24], motion: 'rise', speed: 0.7, density: 0.9, note: 'Not mist but the lack of light, rising: it takes the lantern in.' },
  yellow: { base: [0.56, 0.46, 0.14], top: [0.86, 0.76, 0.34], motion: 'shear', speed: 1.3, density: 0.7, glyph: [1, 0.92, 0.5], note: "The Yellow King's rags, a pallid light burning in their folds." },
  colour: { base: [0.66, 0.26, 0.56], top: [0.4, 0.9, 0.8], motion: 'swirl', speed: 1.5, density: 0.6, shimmer: 1, sparks: { colour: [1, 0.6, 1], share: 0.35 }, note: 'A colour that belongs to no spectrum, and will not hold still.' },
  sand: { base: [0.62, 0.5, 0.3], top: [0.84, 0.72, 0.5], motion: 'shear', speed: 1.6, density: 0.66, sparks: { colour: [1, 0.9, 0.6], share: 0.2 }, note: 'A wall of the desert: dust and heat, and the sun in it.' },
  frost: { base: [0.66, 0.74, 0.82], top: [0.88, 0.92, 0.98], motion: 'shear', speed: 1.1, density: 0.7, sparks: { colour: [1, 1, 1], share: 0.3 }, note: 'A white cold with ice on the air: the ice-sheet and the plateau of Leng.' },
  ember: { base: [0.4, 0.2, 0.14], top: [0.72, 0.44, 0.3], motion: 'rise', speed: 1.1, density: 0.72, sparks: { colour: [1, 0.6, 0.3], share: 0.3 }, note: 'Red smoke off a fire that has never gone out, sparks rising in it.' },
  rot: { base: [0.18, 0.2, 0.12], top: [0.4, 0.42, 0.26], motion: 'roll', speed: 0.5, density: 0.84, sparks: { colour: [0.7, 0.3, 0.3], share: 0.1 }, note: "The black grove's breath: warm, wet and sweet." },
  spore: { base: [0.56, 0.34, 0.5], top: [0.82, 0.6, 0.72], motion: 'swirl', speed: 0.7, density: 0.7, sparks: { colour: [1, 0.76, 0.86], share: 0.3 }, note: 'Drifting pink spore-cloud, warm as a breath.' },
  gold: { base: [0.66, 0.5, 0.64], top: [0.96, 0.84, 0.58], motion: 'rise', speed: 0.7, density: 0.58, sparks: { colour: [1, 0.92, 0.6], share: 0.3 }, note: 'The dream-country haze: lilac under, gold above, and lovely.' },
  stars: { base: [0.06, 0.05, 0.14], top: [0.3, 0.26, 0.5], motion: 'swirl', speed: 0.9, density: 0.82, sparks: { colour: [0.9, 0.9, 1], share: 0.5 }, note: 'Black with stars in it, turning: the Beyond, where there is no fog, only less of everything.' },
  onyx: { base: [0.08, 0.08, 0.1], top: [0.42, 0.36, 0.22], motion: 'rise', speed: 0.6, density: 0.84, sparks: { colour: [1, 0.84, 0.46], share: 0.25 }, note: 'Black with gold dust in it, off the walls of the onyx castle.' },
} satisfies Record<string, FogTheme>;
export type FogThemeId = keyof typeof FOG_THEMES;

/** By the horror: the first boss of a ring or room. */
const BY_BOSS: Readonly<Record<string, FogThemeId>> = {
  keziah_mason: 'witch', brown_jenkin: 'witch', black_man: 'witch', simon_orne: 'witch', charles_le_sorcier: 'witch',
  joseph_curwen: 'alchemy', curwen_pit_thing: 'alchemy', dr_munoz: 'alchemy',
  dunwich_horror: 'storm', wilbur_whateley: 'storm', yog_sothoth: 'stars',
  father_dagon: 'brine', mother_hydra: 'brine', martins_beach_horror: 'brine', deep_one_priest: 'brine', bokrug: 'brine',
  cthulhu: 'deep',
  edward_hutchinson: 'grave', the_hound: 'grave', medusa_gorgon: 'grave', terrible_old_man: 'grey', ephraim_waite: 'grey',
  haunter_of_the_dark: 'dark', shunned_house_entity: 'grey', the_unnamable: 'grave', the_outsider: 'dark', zann_window_thing: 'grave', voice_in_the_tomb: 'grave',
  hastur: 'yellow',
  colour_out_of_space: 'colour', other_gods: 'stars',
  colossus_pyramids: 'sand', yig: 'sand', nug: 'sand', yeb: 'sand', umr_at_tawil: 'stars', nyarlathotep: 'stars', azathoth: 'stars', daemon_pipers: 'stars', ancient_ones: 'stars',
  whisperer: 'frost', high_priest: 'frost', man_of_leng: 'frost', rhan_tegoth: 'frost',
  shub_niggurath: 'rot', tsathoggua: 'rot', shoggoth: 'dark', flying_polyp: 'dark',
  zkauba: 'ember', ghatanothoa: 'ember', lilith: 'witch',
  great_ones: 'onyx', hypnos: 'gold',
};

/** By the realm, when the horror has no theme of its own. */
const BY_REGION: Readonly<Record<string, FogThemeId>> = {
  hub: 'grey', arkham: 'grey', dunwich: 'storm', innsmouth: 'brine', providence: 'grave', vermont: 'frost',
  mountains: 'frost', pnakotus: 'frost', kn_yan: 'rot', dreamlands: 'gold', rlyeh: 'deep', yuggoth: 'spore', beyond: 'stars',
};

/** The theme of the fog before `bosses` (the first has the say) in `region`. */
export const fogThemeOf = (bosses: readonly string[], region: string): FogThemeId => BY_BOSS[bosses[0] ?? ''] ?? BY_REGION[region] ?? 'grey';
