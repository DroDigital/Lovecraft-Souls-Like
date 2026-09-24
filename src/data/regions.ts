/**
 * The regions of spec §3D: the hub, open regions and the realms beyond, each with its legacy
 * dungeon and boss(es). Entities name the regions they belong to; terrain and spawn tables are Phase 4.
 */

export interface RegionDef {
  id: string;
  name: string;
  dungeon: string;
  bosses: readonly string[]; // entity ids
}

export const REGIONS: readonly RegionDef[] = [
  { id: 'hub', name: 'Miskatonic University', dungeon: 'University Library', bosses: [] },
  { id: 'arkham', name: 'Arkham & the Blasted Heath', dungeon: 'The Witch House', bosses: ['colour_out_of_space', 'keziah_mason', 'brown_jenkin'] },
  { id: 'dunwich', name: 'Dunwich & the Round Hills', dungeon: 'Sentinel Hill', bosses: ['dunwich_horror', 'shub_niggurath'] },
  { id: 'innsmouth', name: 'Innsmouth & Devil Reef', dungeon: "Y'ha-nthlei", bosses: ['father_dagon', 'mother_hydra'] },
  { id: 'providence', name: 'Providence & Kingsport', dungeon: "Curwen's catacombs; Starry Wisdom church", bosses: ['joseph_curwen', 'haunter_of_the_dark'] },
  { id: 'vermont', name: 'Vermont Hills', dungeon: 'Akeley farmhouse / Mi-Go outpost', bosses: ['whisperer'] },
  { id: 'mountains', name: 'Mountains of Madness', dungeon: 'Elder Thing city', bosses: ['shoggoth'] },
  { id: 'pnakotus', name: 'Pnakotus', dungeon: 'Archives of the Great Race', bosses: ['flying_polyp'] },
  { id: 'kn_yan', name: "K'n-yan & N'kai", dungeon: 'Tsath', bosses: ['yig', 'tsathoggua', 'nug', 'yeb'] },
  { id: 'dreamlands', name: 'Dreamlands', dungeon: 'Ulthar → Leng → Vaults of Zin → Kadath', bosses: ['high_priest', 'bokrug', 'great_ones', 'nyarlathotep'] },
  { id: 'rlyeh', name: "Mu & R'lyeh", dungeon: "Risen R'lyeh", bosses: ['ghatanothoa', 'cthulhu'] },
  { id: 'yuggoth', name: 'Yuggoth', dungeon: 'Mi-Go cities', bosses: ['rhan_tegoth', 'hastur'] },
  { id: 'beyond', name: 'Beyond the Gate', dungeon: 'The Ultimate Void', bosses: ['umr_at_tawil', 'yog_sothoth', 'azathoth'] },
];

export const REGION_IDS: readonly string[] = REGIONS.map((r) => r.id);
