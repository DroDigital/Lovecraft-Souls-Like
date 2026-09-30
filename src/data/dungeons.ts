/**
 * Legacy dungeons (spec §3D) as room graphs over the primitive kit: corridor, hall, stair, pit,
 * bridge, well. The first room is the entrance and opens outside on its `dir` side; every other
 * room opens off `from`, on that room's `dir` side. Stairs run straight on, climbing `rise` metres.
 * world/dungeonKit.ts lays a graph out on a grid of 16 m cells; sites.ts says where each one stands.
 */

export const ROOM_KINDS = ['corridor', 'hall', 'stair', 'pit', 'bridge', 'well'] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export type Dir = 'n' | 'e' | 's' | 'w';

/** The hidden-layer condition of a bridge's deck, or of the doorway into any other room (spec §3A). */
export interface Veil {
  minInsight?: number;
  maxSanity?: number; // a band floor
  minSeals?: number; // the waking world's seals broken (systems/seals.ts): a door sealed until then (round 12)
}

export interface RoomDef {
  id: string;
  kind: RoomKind;
  from?: string; // the room it opens off (absent for the entrance)
  dir: Dir; // the entrance: the side that opens outside; others: the side of `from` they lie on
  wide?: boolean; // hall only: a great hall of 3 × 3 cells
  rise?: number; // stair only: metres climbed toward the far side (negative descends)
  hidden?: Veil;
  boss?: readonly string[]; // a boss arena
  variant?: 'boss';
  spawns?: readonly string[];
  ally?: string;
  sign?: { id: string; name: string }; // an Elder Sign
  gate?: { id: string; name: string; to: string };
  tome?: { name: string; insight: number };
  vial?: string; // a Silver Vial lies here (its unique name): one more dose of West's Reagent
  weapon?: string; // a weapon lies here (data/weapons.ts)
  words?: string; // said as the investigator first comes in (round 12: the Seventy Steps were nine unmarked rooms)
  kit?: KitId; // its own look, not its dungeon's (round 13: the Mi-Go's tunnels under Akeley's farm were floored with boards)
}

export interface DungeonDef {
  id: string;
  name: string;
  region: string;
  sealed?: boolean; // no way in from outside: the Stairs of Slumber are reached only in dreams
  rooms: readonly RoomDef[];
}

import type { KitId } from './kits';
import { FAR_DUNGEONS } from './dungeonsFar';
import { LAIRS } from './lairs';
import { room, stair } from './roomBuild';
import { SEALS } from './tuning';


export const DUNGEONS: readonly DungeonDef[] = [
  ...LAIRS,
  // Round 13: the dungeons were four to nine rooms in a line. Each now branches: side ways with foes
  // and an Echo cache at their ends, a secret or two behind a veil, and its own named places.
  {
    id: 'library', name: 'University Library', region: 'hub', rooms: [
      room('foyer', 'hall', undefined, 's'),
      room('reading', 'hall', 'foyer', 'n', { spawns: ['exham_troglodyte'] }),
      room('stacks_w', 'corridor', 'reading', 'w', { spawns: ['rat_swarm'] }),
      room('catalogue', 'corridor', 'stacks_w', 'w', { spawns: ['reanimated_corpse'] }),
      room('periodicals', 'hall', 'catalogue', 'n', { spawns: ['rat_swarm', 'exham_troglodyte'] }),
      room('stacks_e', 'corridor', 'reading', 'e'),
      room('restricted', 'hall', 'stacks_e', 'n', { hidden: { minInsight: 1 }, tome: { name: 'Necronomicon', insight: 2 } }),
      room('descent', 'stair', 'reading', 'n', { rise: -4, spawns: ['exham_troglodyte', 'rat_swarm'] }),
      room('archive', 'well', 'descent', 'n', { sign: { id: 'hub_archive', name: 'Library Archive' } }),
      room('vaults', 'corridor', 'archive', 'e', { spawns: ['exham_troglodyte', 'reanimated_corpse'], words: 'THE SUB-BASEMENT' }),
      room('bindery', 'hall', 'vaults', 'e', { spawns: ['exham_troglodyte', 'exham_troglodyte', 'rat_swarm'] }),
      room('charnel', 'pit', 'archive', 'w', { spawns: ['rat_swarm', 'rat_swarm'] }),
      room('sealed_stacks', 'corridor', 'charnel', 'w', { hidden: { maxSanity: 40 }, tome: { name: 'Liber Ivonis', insight: 1 } }),
    ],
  },
  {
    id: 'witch_house', name: 'The Witch House', region: 'arkham', rooms: [
      room('hallway', 'corridor', undefined, 'e'),
      room('parlour', 'hall', 'hallway', 'w', { spawns: ['rat_swarm', 'rat_swarm'], weapon: 'razor' }),
      room('kitchen', 'corridor', 'parlour', 'w', { spawns: ['reanimated_corpse'] }),
      room('pantry', 'hall', 'kitchen', 's', { spawns: ['rat_swarm', 'rat_swarm'] }),
      stair('cellar', 'hallway', 's', -4, { spawns: ['rat_swarm'] }), // round 12: the house was six rooms; the rats come up from below
      room('vault', 'hall', 'cellar', 's', { spawns: ['rat_swarm', 'rat_swarm', 'reanimated_corpse'], words: 'THE CELLAR' }),
      room('cistern', 'well', 'vault', 'e', { spawns: ['rat_swarm'] }),
      room('ratholes', 'corridor', 'vault', 's', { spawns: ['rat_swarm', 'reanimated_corpse'], words: 'THE RAT-HOLES' }),
      room('burrow', 'pit', 'ratholes', 's', { hidden: { minInsight: 2 }, tome: { name: "Gilman's Dream-Diary", insight: 1 } }),
      room('stair', 'stair', 'parlour', 'n', { rise: 4, spawns: ['reanimated_corpse'] }),
      room('landing', 'corridor', 'stair', 'n', { sign: { id: 'arkham_witch', name: 'Witch House Stair' } }),
      room('lodgers', 'corridor', 'landing', 'e', { spawns: ['reanimated_corpse', 'rat_swarm'] }), // the lodgers' rooms, empty of lodgers
      room('dombrowski', 'hall', 'lodgers', 'e', { spawns: ['reanimated_corpse', 'rat_swarm', 'rat_swarm'] }),
      room('closet', 'hall', 'landing', 'w', { hidden: { minInsight: 1 }, tome: { name: "Keziah's Formulae", insight: 1 } }),
      room('garret', 'hall', 'landing', 'n', { wide: true, boss: ['keziah_mason', 'brown_jenkin'] }),
    ],
  },
  {
    id: 'sentinel_hill', name: 'Sentinel Hill', region: 'dunwich', rooms: [
      room('path', 'corridor', undefined, 's'),
      room('hollow', 'corridor', 'path', 'w', { spawns: ['martense_degenerate'] }),
      room('barrow', 'hall', 'hollow', 'w', { spawns: ['martense_degenerate', 'martense_degenerate', 'rat_swarm'] }),
      stair('climb', 'path', 'n', 4),
      room('terrace', 'hall', 'climb', 'n', { sign: { id: 'dunwich_sentinel', name: 'Sentinel Terrace' } }),
      room('circle', 'well', 'terrace', 'e', { spawns: ['thousand_young'] }),
      room('standing', 'corridor', 'circle', 'e', { spawns: ['thousand_young'] }),
      room('altar', 'hall', 'standing', 's', { hidden: { minInsight: 1 }, tome: { name: "Old Whateley's Ledger", insight: 1 } }),
      room('ledge', 'corridor', 'terrace', 'w', { spawns: ['thousand_young', 'mi_go'] }),
      room('lookout', 'hall', 'ledge', 'w', { spawns: ['mi_go', 'martense_degenerate'], words: 'THE ROUND HILLS' }),
      stair('ascent', 'terrace', 'n', 4),
      room('summit', 'hall', 'ascent', 'n', { wide: true, boss: ['dunwich_horror'] }),
    ],
  },
  {
    id: 'yhanthlei', name: "Y'ha-nthlei", region: 'innsmouth', rooms: [
      room('mouth', 'corridor', undefined, 'e'),
      stair('sink', 'mouth', 'w', -4),
      room('drowned', 'hall', 'sink', 'w', { sign: { id: 'innsmouth_yhanthlei', name: 'Drowned Hall' } }),
      room('pits', 'pit', 'drowned', 'n', { spawns: ['deep_one'] }),
      room('nursery', 'hall', 'pits', 'n', { spawns: ['deep_one', 'innsmouth_hybrid', 'dagon_priest'], words: 'THE SPAWNING POOLS' }),
      room('reliquary', 'corridor', 'nursery', 'e', { hidden: { minInsight: 2 }, tome: { name: "Obed Marsh's Log", insight: 1 } }),
      room('ossuary', 'corridor', 'pits', 'w', { spawns: ['deep_one', 'deep_one'] }),
      room('cells', 'corridor', 'drowned', 's', { spawns: ['innsmouth_hybrid'], weapon: 'cutlass' }),
      stair('cells_deep', 'cells', 's', -4, { spawns: ['innsmouth_hybrid'] }),
      room('oubliette', 'pit', 'cells_deep', 's', { spawns: ['deep_one', 'innsmouth_hybrid'] }),
      room('span', 'bridge', 'drowned', 'w', { spawns: ['deep_one', 'deep_one'] }),
      room('temple', 'hall', 'span', 'w', { wide: true, boss: ['father_dagon', 'mother_hydra'], kit: 'sunken' }),
    ],
  },
  {
    id: 'curwen_catacombs', name: "Curwen's Catacombs", region: 'providence', rooms: [
      room('cellar', 'corridor', undefined, 'n'),
      room('storeroom', 'corridor', 'cellar', 'e', { spawns: ['ghoul'] }),
      room('cistern', 'well', 'storeroom', 'e', { spawns: ['ghoul', 'winged_hybrid'] }),
      room('steps', 'stair', 'cellar', 's', { rise: -4, spawns: ['ghoul', 'ghoul'] }),
      room('crypt', 'hall', 'steps', 's', { sign: { id: 'prov_catacombs', name: "Curwen's Crypt" } }),
      room('pits', 'pit', 'crypt', 'e', { boss: ['curwen_pit_thing'] }),
      room('pens', 'corridor', 'pits', 'e', { spawns: ['ghoul', 'ghoul'], words: 'THE PITS' }),
      room('ossuary', 'corridor', 'crypt', 'w', { hidden: { minInsight: 2 }, tome: { name: "Curwen's Journal", insight: 1 } }),
      room('charnel', 'hall', 'ossuary', 'w', { spawns: ['ghoul', 'being_from_beyond'] }),
      room('saltes', 'corridor', 'charnel', 's', { vial: 'Silver Vial of the Essential Saltes' }),
      room('laboratory', 'hall', 'crypt', 's', { wide: true, boss: ['joseph_curwen'] }),
    ],
  },
  {
    id: 'starry_wisdom', name: 'Starry Wisdom Church', region: 'providence', rooms: [
      room('nave', 'hall', undefined, 's', { spawns: ['cthulhu_cultist', 'cthulhu_cultist'] }),
      room('vestry', 'corridor', 'nave', 'e', { spawns: ['cthulhu_cultist'] }),
      stair('crypt_stair', 'vestry', 'e', -4),
      room('undercroft', 'hall', 'crypt_stair', 'e', { spawns: ['cthulhu_cultist', 'winged_hybrid'], words: 'THE UNDERCROFT' }),
      room('catacomb', 'corridor', 'undercroft', 's', { spawns: ['ghoul', 'ghoul'] }),
      room('chapel', 'hall', 'nave', 'w', { spawns: ['cthulhu_cultist', 'winged_hybrid'] }),
      room('sacristy', 'corridor', 'chapel', 's', { hidden: { minInsight: 1 }, tome: { name: "Bowen's Journal", insight: 1 } }),
      room('aisle', 'corridor', 'nave', 'n'),
      stair('tower', 'aisle', 'n', 4),
      room('belfry', 'corridor', 'tower', 'n', { sign: { id: 'prov_church', name: 'Belfry Stair' } }),
      room('gallery', 'corridor', 'belfry', 'w', { spawns: ['winged_hybrid', 'winged_hybrid'] }),
      stair('spire', 'belfry', 'n', 4),
      room('steeple', 'hall', 'spire', 'n', { wide: true, boss: ['haunter_of_the_dark'] }),
    ],
  },
  {
    id: 'akeley', name: 'Akeley Farmhouse', region: 'vermont', rooms: [
      room('porch', 'corridor', undefined, 's'),
      room('parlour', 'hall', 'porch', 'n', { spawns: ['martense_degenerate'] }),
      room('kitchen', 'corridor', 'parlour', 'e', { sign: { id: 'vermont_farm', name: 'Akeley Farmhouse' } }),
      room('barn', 'hall', 'kitchen', 'e', { spawns: ['martense_degenerate', 'martense_degenerate', 'rat_swarm'] }),
      stair('cellar', 'parlour', 'w', -4, { spawns: ['rat_swarm'] }),
      room('root_cellar', 'hall', 'cellar', 'w', { spawns: ['martense_degenerate', 'moon_bog_wraith'] }),
      room('study', 'hall', 'parlour', 'n', { wide: true, boss: ['whisperer'] }),
      room('tunnel', 'corridor', 'study', 'w', { kit: 'mine' }),
      stair('shaft', 'tunnel', 'w', -4, { kit: 'mine' }),
      room('outpost', 'well', 'shaft', 'w', { spawns: ['mi_go', 'mi_go'], kit: 'mine', words: 'THE OUTPOST' }),
      room('gallery', 'corridor', 'outpost', 's', { spawns: ['mi_go'], kit: 'mine' }),
      room('cylinders', 'hall', 'gallery', 's', { spawns: ['mi_go', 'mi_go'], kit: 'mine', words: 'THE BRAIN-CYLINDERS' }),
      room('span', 'bridge', 'outpost', 'n', { hidden: { minInsight: 2 }, kit: 'mine' }),
      room('vault', 'hall', 'span', 'n', { tome: { name: "Akeley's Phonograph Record", insight: 1 }, spawns: ['mi_go'], kit: 'mine' }),
      room('hangar', 'corridor', 'vault', 'n', { spawns: ['mi_go'], kit: 'mine' }),
    ],
  },
  {
    id: 'elder_city', name: 'Elder Thing City', region: 'mountains', rooms: [
      room('gate', 'corridor', undefined, 's'),
      room('plaza', 'hall', 'gate', 'n', { sign: { id: 'mountains_city', name: 'Elder Thing City' } }),
      room('arcade', 'corridor', 'plaza', 'w', { spawns: ['albino_penguin', 'elder_thing'] }),
      stair('spire', 'arcade', 'w', 4),
      room('observatory', 'hall', 'spire', 'w', { spawns: ['gnoph_keh'], words: 'THE STAR-HEADED CITY' }),
      room('murals', 'hall', 'plaza', 'e', { tome: { name: 'Elder Thing Murals', insight: 1 }, spawns: ['gnoph_keh'] }),
      room('frieze', 'corridor', 'murals', 'n', { spawns: ['elder_thing'] }),
      room('sketches', 'hall', 'frieze', 'n', { hidden: { minInsight: 2 }, tome: { name: "Danforth's Sketches", insight: 1 } }),
      room('ramp', 'stair', 'plaza', 'n', { rise: -4, spawns: ['elder_thing', 'elder_thing'] }),
      room('gallery', 'corridor', 'ramp', 'n', { spawns: ['albino_penguin', 'albino_penguin'] }),
      room('tunnels', 'corridor', 'gallery', 'w', { spawns: ['albino_penguin', 'albino_penguin', 'albino_penguin'] }),
      room('hatchery', 'pit', 'tunnels', 'w', { spawns: ['elder_thing'] }),
      room('span', 'bridge', 'gallery', 'n'),
      room('abyss', 'hall', 'span', 'n', { wide: true, boss: ['shoggoth'], variant: 'boss' }),
    ],
  },
  {
    id: 'archives', name: 'Archives of the Great Race', region: 'pnakotus', rooms: [
      room('stacks', 'corridor', undefined, 'e'),
      room('annex', 'corridor', 'stacks', 'n', { spawns: ['nameless_city_reptile'] }),
      room('reading', 'hall', 'stacks', 'w', { sign: { id: 'pnakotus_archives', name: 'Archive Reading Hall' }, ally: 'yithian_archivist' }),
      room('catalogue', 'corridor', 'reading', 'n', { spawns: ['yithian'] }),
      room('machines', 'hall', 'catalogue', 'n', { spawns: ['yithian', 'hybrid_mummy'], words: 'THE HALL OF MACHINES' }),
      room('shelves', 'corridor', 'reading', 's', { spawns: ['nameless_city_reptile', 'nameless_city_reptile'] }),
      room('earth_race', 'hall', 'shelves', 's', { hidden: { minInsight: 1 }, tome: { name: 'The Case of the Earth Race', insight: 1 } }),
      room('down', 'stair', 'reading', 'w', { rise: -4, spawns: ['yithian'] }),
      room('deep', 'corridor', 'down', 'w', { spawns: ['nameless_city_reptile'], tome: { name: 'Pnakotic Manuscripts', insight: 1 } }),
      room('trapdoor', 'well', 'deep', 'n', { spawns: ['flying_polyp'] }),
      stair('shaft', 'trapdoor', 'n', -4, { spawns: ['hybrid_mummy'] }),
      room('basalt', 'corridor', 'shaft', 'n', { spawns: ['hybrid_mummy', 'hybrid_mummy'], words: 'THE BASALT DEEPS' }),
      room('vault', 'hall', 'deep', 'w', { wide: true, boss: ['flying_polyp'], variant: 'boss' }),
    ],
  },
  {
    id: 'tsath', name: 'Tsath', region: 'kn_yan', rooms: [
      room('blue_gate', 'corridor', undefined, 's', { spawns: ['kn_yan_dweller', 'kn_yan_dweller'] }),
      room('guardhouse', 'hall', 'blue_gate', 'w', { spawns: ['ym_bhi', 'kn_yan_dweller'] }),
      room('avenue', 'hall', 'blue_gate', 'n', { sign: { id: 'knyan_tsath', name: 'Avenue of Tsath' } }),
      room('market', 'hall', 'avenue', 'e', { spawns: ['kn_yan_dweller', 'kn_yan_dweller', 'ym_bhi'] }),
      room('baths', 'corridor', 'market', 'e', { spawns: ['serpent_man'] }),
      room('yoth', 'pit', 'avenue', 'w', { spawns: ['gyaa_yothn'] }),
      stair('yoth_steps', 'yoth', 'w', -4, { spawns: ['beast_in_the_cave'] }),
      room('red_yoth', 'hall', 'yoth_steps', 'w', { spawns: ['gyaa_yothn', 'serpent_man'], words: 'RED-LITTEN YOTH' }),
      room('serpent_vault', 'corridor', 'red_yoth', 'n', { hidden: { minInsight: 2 }, tome: { name: "Zamacona's Manuscript", insight: 1 } }),
      stair('temple', 'avenue', 'n', -4),
      room('span', 'bridge', 'temple', 'n'),
      room('nkai', 'hall', 'span', 'n', { wide: true, boss: ['tsathoggua'] }),
    ],
  },
  {
    id: 'slumber', name: 'Stairs of Slumber', region: 'dreamlands', sealed: true, rooms: [
      // Round 12: the descent was a 30-second walk through nine empty rooms. Now it is said as it goes,
      // the dream's lesser things wait on the flights, and the seven hundred steps are longer.
      room('threshold', 'hall', undefined, 'n'),
      stair('light_1', 'threshold', 'n', -4, { words: 'THE SEVENTY STEPS OF LIGHT SLUMBER' }),
      stair('light_2', 'light_1', 'n', -4, { spawns: ['zoog', 'zoog'] }),
      room('cavern', 'hall', 'light_2', 'n', { sign: { id: 'dream_cavern', name: 'Cavern of Flame' }, ally: 'nasht_kaman_thah', words: 'THE CAVERN OF FLAME' }),
      stair('deep_1', 'cavern', 'n', -5, { words: 'THE SEVEN HUNDRED STEPS OF DEEPER SLUMBER' }),
      stair('deep_2', 'deep_1', 'n', -5, { spawns: ['night_gaunt'] }),
      stair('deep_3', 'deep_2', 'n', -5, { words: 'TWO HUNDRED STEPS', spawns: ['zoog', 'zoog', 'zoog'] }),
      stair('deep_4', 'deep_3', 'n', -5, { spawns: ['ghast'] }),
      stair('deep_5', 'deep_4', 'n', -5, { words: 'FOUR HUNDRED STEPS', spawns: ['night_gaunt', 'ghast'] }),
      stair('deep_6', 'deep_5', 'n', -5, { words: 'SIX HUNDRED STEPS', spawns: ['ghast', 'ghast'] }),
      room('deeper', 'hall', 'deep_6', 'n', { gate: { id: 'dream_deeper', name: 'Gate of Deeper Slumber', to: 'dream_wood_gate' }, words: 'THE GATE OF DEEPER SLUMBER' }),
    ],
  },
  {
    id: 'ulthar_kadath', name: 'Ulthar to Kadath', region: 'dreamlands', rooms: [
      room('ulthar_gate', 'corridor', undefined, 's'),
      room('ulthar', 'hall', 'ulthar_gate', 'n', { sign: { id: 'dream_ulthar', name: 'Ulthar' }, ally: 'cats_of_ulthar' }),
      room('cats_lane', 'corridor', 'ulthar', 'w', { spawns: ['cat_from_saturn'] }),
      room('elder_temple', 'hall', 'cats_lane', 'w', { tome: { name: 'The Pnakotic Fragments', insight: 1 }, spawns: ['zoog', 'zoog'], words: 'THE TEMPLE OF THE ELDER ONES' }),
      room('road', 'corridor', 'ulthar', 'n', { spawns: ['zoog', 'zoog'] }),
      room('dylath_leen', 'hall', 'road', 'e', { spawns: ['moon_beast', 'man_of_leng'], words: 'DYLATH-LEEN' }),
      stair('leng_climb', 'road', 'n', 5),
      room('leng', 'hall', 'leng_climb', 'n', { wide: true, boss: ['high_priest'], spawns: ['man_of_leng'] }),
      room('monastery', 'corridor', 'leng', 'n', { spawns: ['man_of_leng', 'man_of_leng'] }),
      room('zin_steps', 'stair', 'leng', 'e', { rise: -5, spawns: ['gug', 'ghast'] }),
      room('zin', 'pit', 'zin_steps', 'e', { sign: { id: 'dream_zin', name: 'Vaults of Zin' }, ally: 'pickman' }),
      room('gug_city', 'hall', 'zin', 's', { spawns: ['gug', 'ghast', 'ghast'], words: 'THE CITY OF THE GUGS' }),
      stair('koth', 'gug_city', 's', 5, { spawns: ['ghast'], words: 'THE TOWER OF KOTH' }),
      room('koth_top', 'corridor', 'koth', 's', { spawns: ['zoog', 'zoog', 'ghoul'] }),
      room('zin_span', 'bridge', 'zin', 'e'),
      stair('kadath_climb', 'zin_span', 'e', 6),
      room('kadath', 'hall', 'kadath_climb', 'e', {
        wide: true, boss: ['great_ones', 'nyarlathotep'], gate: { id: 'dream_ultimate', name: 'The Ultimate Gate', to: 'beyond_gate' },
        hidden: { minSeals: SEALS.kadath }, // the Great Ones' door: sealed until the waking world's horrors fall (round 12)
      }),
    ],
  },
  ...FAR_DUNGEONS,
];

export const getDungeon = (id: string): DungeonDef | undefined => DUNGEONS.find((d) => d.id === id);
