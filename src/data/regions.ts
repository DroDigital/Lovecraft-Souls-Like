/**
 * The regions of spec §3D: the hub, open regions and the realms beyond, each with its legacy
 * dungeon and boss(es). A region is a rectangle of 256 m tiles on the world map with a biome (its
 * seeded heightfield, ground, props) and a spawn table. The waking world is one landmass around the
 * hub; every realm beyond is an island of its own, reached through a gate (sites.ts).
 */

import type { Vec3 } from './tuning';

export const PROP_KINDS = ['tree', 'rock', 'pillar', 'monolith', 'grave', 'ruin'] as const;
export type PropKind = (typeof PROP_KINDS)[number];

/** Ground textures a biome may use (a subset of render/textures.ts's kinds). */
export type GroundTexture = 'rot' | 'stone' | 'slab' | 'flesh' | 'water' | 'grass' | 'mud' | 'sand' | 'snow';

export interface Biome {
  base: number; // metres: mean ground height
  amp: number; // metres of relief either way
  scale: number; // metres per noise cell
  octaves: number;
  texture: GroundTexture;
  tint: Vec3; // ground vertex colour
  sea: boolean; // dark water beyond its coast; otherwise the abyss
  props: Partial<Record<PropKind, number>>; // weights
  density: number; // props per chunk
}

export interface SpawnTable {
  density: number; // creatures per chunk of open ground
  table: Readonly<Record<string, number>>; // entity id → weight
}

export interface RegionDef {
  id: string;
  name: string;
  dungeon: string;
  bosses: readonly string[]; // entity ids
  area: readonly [tx: number, tz: number, w: number, h: number]; // tiles on the region grid (north = +z)
  biome: Biome;
  spawns: SpawnTable;
}

const biome = (base: number, amp: number, scale: number, texture: GroundTexture, tint: Vec3, sea: boolean, density: number, props: Biome['props']): Biome => ({
  base,
  amp,
  scale,
  octaves: 3,
  texture,
  tint,
  sea,
  density,
  props,
});

export const REGIONS: readonly RegionDef[] = [
  {
    id: 'hub', name: 'Miskatonic University', dungeon: 'University Library', bosses: [], area: [0, 0, 1, 1],
    biome: biome(3, 1.2, 40, 'grass', [0.78, 0.76, 0.7], true, 7, { tree: 3, pillar: 2, ruin: 2, grave: 1 }),
    spawns: { density: 0.5, table: { exham_troglodyte: 2, rat_swarm: 3, being_from_beyond: 1 } },
  },
  {
    id: 'arkham', name: 'Arkham & the Blasted Heath', dungeon: 'The Witch House', bosses: ['colour_out_of_space', 'keziah_mason', 'brown_jenkin'], area: [-1, 0, 1, 1],
    biome: biome(4, 2.5, 50, 'grass', [0.7, 0.7, 0.67], true, 9, { tree: 4, grave: 3, ruin: 2, rock: 2 }),
    spawns: { density: 1.2, table: { reanimated_corpse: 3, rat_swarm: 2, moon_bog_wraith: 2 } },
  },
  {
    id: 'dunwich', name: 'Dunwich & the Round Hills', dungeon: 'Sentinel Hill', bosses: ['dunwich_horror', 'shub_niggurath'], area: [-1, 1, 1, 1],
    biome: biome(9, 7, 60, 'grass', [0.64, 0.67, 0.62], true, 8, { monolith: 3, tree: 3, rock: 2 }),
    spawns: { density: 0.6, table: { thousand_young: 1 } },
  },
  {
    id: 'innsmouth', name: 'Innsmouth & Devil Reef', dungeon: "Y'ha-nthlei", bosses: ['father_dagon', 'mother_hydra'], area: [1, 1, 1, 1],
    biome: biome(2.5, 1.4, 35, 'mud', [0.6, 0.64, 0.66], true, 8, { ruin: 3, rock: 2, pillar: 1 }),
    spawns: { density: 1.4, table: { deep_one: 3, innsmouth_hybrid: 3, dagon_priest: 1 } },
  },
  {
    id: 'providence', name: 'Providence & Kingsport', dungeon: "Curwen's catacombs; Starry Wisdom church", bosses: ['joseph_curwen', 'haunter_of_the_dark'], area: [1, 0, 1, 1],
    biome: biome(5, 3.5, 45, 'grass', [0.7, 0.68, 0.64], true, 8, { grave: 3, ruin: 3, tree: 2, pillar: 1 }),
    spawns: { density: 1.2, table: { ghoul: 3, cthulhu_cultist: 3, winged_hybrid: 2, being_from_beyond: 1 } },
  },
  {
    id: 'vermont', name: 'Vermont Hills', dungeon: 'Akeley farmhouse / Mi-Go outpost', bosses: ['whisperer'], area: [0, 1, 1, 1],
    biome: biome(12, 10, 70, 'grass', [0.6, 0.63, 0.58], true, 11, { tree: 6, rock: 3 }),
    spawns: { density: 1.1, table: { mi_go: 2, martense_degenerate: 3 } },
  },
  {
    id: 'mountains', name: 'Mountains of Madness', dungeon: 'Elder Thing city', bosses: ['shoggoth'], area: [-4, 4, 1, 1],
    biome: biome(15, 13, 60, 'snow', [0.92, 0.92, 0.95], true, 6, { rock: 3, monolith: 2 }),
    spawns: { density: 1.2, table: { elder_thing: 2, shoggoth: 1, albino_penguin: 3, gnoph_keh: 2 } },
  },
  {
    id: 'pnakotus', name: 'Pnakotus', dungeon: 'Archives of the Great Race', bosses: ['flying_polyp'], area: [-2, 4, 1, 1],
    biome: biome(3.5, 2.5, 40, 'sand', [0.86, 0.79, 0.64], false, 7, { monolith: 3, ruin: 3, rock: 1 }),
    spawns: { density: 1.2, table: { yithian: 2, flying_polyp: 1, nameless_city_reptile: 3, hybrid_mummy: 2 } },
  },
  {
    id: 'kn_yan', name: "K'n-yan & N'kai", dungeon: 'Tsath', bosses: ['yig', 'tsathoggua', 'nug', 'yeb'], area: [0, 4, 1, 1],
    biome: biome(4, 3, 30, 'slab', [0.58, 0.6, 0.68], false, 9, { pillar: 3, rock: 3, monolith: 1 }),
    spawns: { density: 1.3, table: { serpent_man: 2, kn_yan_dweller: 3, ym_bhi: 2, gyaa_yothn: 1, beast_in_the_cave: 1, child_of_yig: 2, formless_spawn: 1 } },
  },
  {
    id: 'dreamlands', name: 'Dreamlands', dungeon: 'Ulthar → Leng → Vaults of Zin → Kadath', bosses: ['high_priest', 'bokrug', 'great_ones', 'nyarlathotep'], area: [-1, 7, 2, 2],
    biome: biome(6, 5, 55, 'grass', [0.73, 0.71, 0.67], true, 10, { tree: 4, pillar: 2, ruin: 2, rock: 1 }),
    spawns: {
      density: 1.2,
      table: { ghoul: 2, ghast: 2, zoog: 3, night_gaunt: 1, moon_beast: 1, man_of_leng: 2, cat_from_saturn: 1, wamp: 1, gnorri: 1, being_of_ib: 1, gug: 1, dhole: 1, shantak: 1 },
    },
  },
  {
    id: 'rlyeh', name: "Mu & R'lyeh", dungeon: "Risen R'lyeh", bosses: ['ghatanothoa', 'cthulhu'], area: [2, 4, 1, 1],
    biome: biome(4, 3.5, 25, 'stone', [0.55, 0.6, 0.58], true, 9, { monolith: 4, pillar: 2 }),
    spawns: { density: 1.3, table: { deep_one: 3, cthulhu_cultist: 2, star_spawn: 1 } },
  },
  {
    id: 'yuggoth', name: 'Yuggoth', dungeon: 'Mi-Go cities', bosses: ['rhan_tegoth', 'hastur'], area: [4, 4, 1, 1],
    biome: biome(5, 4, 40, 'flesh', [0.5, 0.5, 0.53], true, 8, { monolith: 3, pillar: 3 }),
    spawns: { density: 1.1, table: { mi_go: 3, venusian_man_lizard: 2 } },
  },
  {
    id: 'beyond', name: 'Beyond the Gate', dungeon: 'The Ultimate Void', bosses: ['umr_at_tawil', 'yog_sothoth', 'azathoth'], area: [3, 7, 1, 1],
    biome: biome(4, 1.5, 30, 'water', [0.45, 0.45, 0.5], false, 6, { monolith: 3, pillar: 2 }),
    spawns: { density: 1, table: { dhole: 1, yekubian: 2 } },
  },
];

export const REGION_IDS: readonly string[] = REGIONS.map((r) => r.id);

export const getRegion = (id: string): RegionDef | undefined => REGIONS.find((r) => r.id === id);
