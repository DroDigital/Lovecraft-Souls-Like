/**
 * The legacy dungeons' kits (playtest round 12: Ulthar, the Fungoid Cities, the Elder Thing City,
 * the Witch House and Sentinel Hill were all the one stone-brick kit): what a dungeon's walls and
 * floors are made of, their tone, their trim (masonry: plinths, cornices, pilasters; timber: beams
 * and posts; none), and how many pilasters bear a flame. The walls' shapes are the kit's alone
 * (world/dungeonParts.ts); only their look changes. Data only.
 */

import type { Vec3 } from './tuning';

/** Textures a kit may use (a subset of render/textures.ts's kinds). */
export type KitTexture = 'stone' | 'slab' | 'wood' | 'rot' | 'flesh' | 'brick' | 'rock' | 'cobble' | 'mud';

export interface DungeonKit {
  wall: KitTexture;
  floor: KitTexture;
  tone?: Vec3; // tint of the walls and floors (absent: the region's ground)
  mix: number; // share of the tone over pale stone
  trim: 'masonry' | 'timber' | 'none';
  flames: number; // share of pilasters (or posts) that bear a sconce's flame
}

export const KITS = {
  masonry: { wall: 'stone', floor: 'slab', mix: 0.35, trim: 'masonry', flames: 0.33 },
  library: { wall: 'brick', floor: 'wood', tone: [0.86, 0.76, 0.66], mix: 0.35, trim: 'masonry', flames: 0.5 },
  timber: { wall: 'wood', floor: 'wood', tone: [0.72, 0.64, 0.54], mix: 0.5, trim: 'timber', flames: 0.2 },
  brick: { wall: 'brick', floor: 'cobble', tone: [0.8, 0.7, 0.64], mix: 0.35, trim: 'masonry', flames: 0.3 },
  crypt: { wall: 'stone', floor: 'slab', tone: [0.66, 0.7, 0.66], mix: 0.45, trim: 'masonry', flames: 0.25 },
  church: { wall: 'stone', floor: 'wood', tone: [0.6, 0.6, 0.62], mix: 0.45, trim: 'masonry', flames: 0.4 },
  hill: { wall: 'rock', floor: 'mud', tone: [0.64, 0.66, 0.6], mix: 0.5, trim: 'none', flames: 0 },
  drowned: { wall: 'rot', floor: 'slab', tone: [0.52, 0.64, 0.6], mix: 0.65, trim: 'none', flames: 0 },
  elder: { wall: 'slab', floor: 'slab', tone: [0.84, 0.86, 0.88], mix: 0.5, trim: 'none', flames: 0 },
  basalt: { wall: 'rock', floor: 'slab', tone: [0.42, 0.42, 0.47], mix: 0.65, trim: 'masonry', flames: 0 },
  tsath: { wall: 'stone', floor: 'cobble', tone: [0.55, 0.6, 0.74], mix: 0.55, trim: 'masonry', flames: 0.5 },
  dream: { wall: 'stone', floor: 'slab', tone: [0.92, 0.82, 0.66], mix: 0.4, trim: 'masonry', flames: 0.7 },
  onyx: { wall: 'slab', floor: 'cobble', tone: [0.4, 0.4, 0.46], mix: 0.65, trim: 'masonry', flames: 0.35 },
  cyclopean: { wall: 'slab', floor: 'rock', tone: [0.44, 0.54, 0.5], mix: 0.7, trim: 'none', flames: 0 },
  fungoid: { wall: 'flesh', floor: 'rot', tone: [0.56, 0.5, 0.56], mix: 0.6, trim: 'none', flames: 0 },
  void: { wall: 'slab', floor: 'slab', tone: [0.24, 0.24, 0.3], mix: 0.8, trim: 'none', flames: 0 },
} satisfies Record<string, DungeonKit>;

export type KitId = keyof typeof KITS;

/** Each dungeon's kit; the rest are masonry. */
export const DUNGEON_KITS: Readonly<Record<string, KitId>> = {
  library: 'library',
  witch_house: 'timber',
  sentinel_hill: 'hill',
  yhanthlei: 'drowned',
  curwen_catacombs: 'crypt',
  starry_wisdom: 'church',
  akeley: 'timber',
  elder_city: 'elder',
  archives: 'basalt',
  tsath: 'tsath',
  slumber: 'dream',
  ulthar_kadath: 'onyx',
  risen_rlyeh: 'cyclopean',
  migo_cities: 'fungoid',
  ultimate_void: 'void',
  // The lairs (lairs.ts): houses of wood, cellars of brick, tombs of stone.
  munoz_rooms: 'brick',
  alchemist_cellars: 'crypt',
  outsider_crypt: 'crypt',
  hound_churchyard: 'crypt',
  deserted_house: 'timber',
  swamp_tomb: 'hill',
  shunned_cellar: 'brick',
  red_hook_vaults: 'brick',
  old_man_house: 'timber',
  whateley_farm: 'timber',
  waite_house: 'timber',
  sculptor_studio: 'brick',
  rue_dauseil: 'timber',
};

export const kitOf = (dungeon: string): DungeonKit => KITS[DUNGEON_KITS[dungeon] ?? 'masonry'];
