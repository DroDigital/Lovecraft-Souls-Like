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
}

export interface DungeonDef {
  id: string;
  name: string;
  region: string;
  sealed?: boolean; // no way in from outside: the Stairs of Slumber are reached only in dreams
  rooms: readonly RoomDef[];
}

import { LAIRS } from './lairs';

type Extras = Omit<RoomDef, 'id' | 'kind' | 'from' | 'dir'>;
const room = (id: string, kind: RoomKind, from: string | undefined, dir: Dir, x: Extras = {}): RoomDef => ({ id, kind, from, dir, ...x });
const stair = (id: string, from: string, dir: Dir, rise: number): RoomDef => room(id, 'stair', from, dir, { rise });

export const DUNGEONS: readonly DungeonDef[] = [
  ...LAIRS,
  {
    id: 'library', name: 'University Library', region: 'hub', rooms: [
      room('foyer', 'hall', undefined, 's'),
      room('reading', 'hall', 'foyer', 'n', { spawns: ['exham_troglodyte'] }),
      room('stacks_w', 'corridor', 'reading', 'w', { spawns: ['rat_swarm'] }),
      room('stacks_e', 'corridor', 'reading', 'e'),
      room('restricted', 'hall', 'stacks_e', 'n', { hidden: { minInsight: 1 }, tome: { name: 'Necronomicon', insight: 2 } }),
      room('descent', 'stair', 'reading', 'n', { rise: -4, spawns: ['exham_troglodyte', 'rat_swarm'] }),
      room('archive', 'well', 'descent', 'n', { sign: { id: 'hub_archive', name: 'Library Archive' } }),
    ],
  },
  {
    id: 'witch_house', name: 'The Witch House', region: 'arkham', rooms: [
      room('hallway', 'corridor', undefined, 'e'),
      room('parlour', 'hall', 'hallway', 'w', { spawns: ['rat_swarm', 'rat_swarm'] }),
      room('stair', 'stair', 'parlour', 'n', { rise: 4, spawns: ['reanimated_corpse'] }),
      room('landing', 'corridor', 'stair', 'n', { sign: { id: 'arkham_witch', name: 'Witch House Stair' } }),
      room('closet', 'hall', 'landing', 'w', { hidden: { minInsight: 1 }, tome: { name: "Keziah's Formulae", insight: 1 } }),
      room('garret', 'hall', 'landing', 'n', { boss: ['keziah_mason', 'brown_jenkin'] }),
    ],
  },
  {
    id: 'sentinel_hill', name: 'Sentinel Hill', region: 'dunwich', rooms: [
      room('path', 'corridor', undefined, 's'),
      stair('climb', 'path', 'n', 4),
      room('terrace', 'hall', 'climb', 'n', { sign: { id: 'dunwich_sentinel', name: 'Sentinel Terrace' } }),
      room('circle', 'well', 'terrace', 'e', { spawns: ['thousand_young'] }),
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
      room('cells', 'corridor', 'drowned', 's', { spawns: ['innsmouth_hybrid'] }),
      room('span', 'bridge', 'drowned', 'w', { spawns: ['deep_one', 'deep_one'] }),
      room('temple', 'hall', 'span', 'w', { wide: true, boss: ['father_dagon', 'mother_hydra'] }),
    ],
  },
  {
    id: 'curwen_catacombs', name: "Curwen's Catacombs", region: 'providence', rooms: [
      room('cellar', 'corridor', undefined, 'n'),
      room('steps', 'stair', 'cellar', 's', { rise: -4, spawns: ['ghoul', 'ghoul'] }),
      room('crypt', 'hall', 'steps', 's', { sign: { id: 'prov_catacombs', name: "Curwen's Crypt" } }),
      room('pits', 'pit', 'crypt', 'e', { boss: ['curwen_pit_thing'] }),
      room('ossuary', 'corridor', 'crypt', 'w', { hidden: { minInsight: 2 }, tome: { name: "Curwen's Journal", insight: 1 } }),
      room('laboratory', 'hall', 'crypt', 's', { boss: ['joseph_curwen'] }),
    ],
  },
  {
    id: 'starry_wisdom', name: 'Starry Wisdom Church', region: 'providence', rooms: [
      room('nave', 'hall', undefined, 's', { spawns: ['cthulhu_cultist', 'cthulhu_cultist'] }),
      room('vestry', 'corridor', 'nave', 'e', { spawns: ['cthulhu_cultist'] }),
      room('aisle', 'corridor', 'nave', 'n'),
      stair('tower', 'aisle', 'n', 4),
      room('belfry', 'corridor', 'tower', 'n', { sign: { id: 'prov_church', name: 'Belfry Stair' } }),
      stair('spire', 'belfry', 'n', 4),
      room('steeple', 'hall', 'spire', 'n', { boss: ['haunter_of_the_dark'] }),
    ],
  },
  {
    id: 'akeley', name: 'Akeley Farmhouse', region: 'vermont', rooms: [
      room('porch', 'corridor', undefined, 's'),
      room('parlour', 'hall', 'porch', 'n', { spawns: ['martense_degenerate'] }),
      room('kitchen', 'corridor', 'parlour', 'e', { sign: { id: 'vermont_farm', name: 'Akeley Farmhouse' } }),
      room('study', 'hall', 'parlour', 'n', { boss: ['whisperer'] }),
      room('tunnel', 'corridor', 'study', 'w'),
      stair('shaft', 'tunnel', 'w', -4),
      room('outpost', 'well', 'shaft', 'w', { spawns: ['mi_go', 'mi_go'] }),
      room('span', 'bridge', 'outpost', 'n', { hidden: { minInsight: 2 } }),
      room('vault', 'hall', 'span', 'n', { tome: { name: "Akeley's Phonograph Record", insight: 1 }, spawns: ['mi_go'] }),
    ],
  },
  {
    id: 'elder_city', name: 'Elder Thing City', region: 'mountains', rooms: [
      room('gate', 'corridor', undefined, 's'),
      room('plaza', 'hall', 'gate', 'n', { sign: { id: 'mountains_city', name: 'Elder Thing City' } }),
      room('murals', 'hall', 'plaza', 'e', { tome: { name: 'Elder Thing Murals', insight: 1 }, spawns: ['gnoph_keh'] }),
      room('ramp', 'stair', 'plaza', 'n', { rise: -4, spawns: ['elder_thing', 'elder_thing'] }),
      room('gallery', 'corridor', 'ramp', 'n', { spawns: ['albino_penguin', 'albino_penguin'] }),
      room('span', 'bridge', 'gallery', 'n'),
      room('abyss', 'hall', 'span', 'n', { wide: true, boss: ['shoggoth'], variant: 'boss' }),
    ],
  },
  {
    id: 'archives', name: 'Archives of the Great Race', region: 'pnakotus', rooms: [
      room('stacks', 'corridor', undefined, 'e'),
      room('reading', 'hall', 'stacks', 'w', { sign: { id: 'pnakotus_archives', name: 'Archive Reading Hall' }, ally: 'yithian_archivist' }),
      room('down', 'stair', 'reading', 'w', { rise: -4, spawns: ['yithian'] }),
      room('deep', 'corridor', 'down', 'w', { spawns: ['nameless_city_reptile'], tome: { name: 'Pnakotic Manuscripts', insight: 1 } }),
      room('trapdoor', 'well', 'deep', 'n', { spawns: ['flying_polyp'] }),
      room('vault', 'hall', 'deep', 'w', { wide: true, boss: ['flying_polyp'], variant: 'boss' }),
    ],
  },
  {
    id: 'tsath', name: 'Tsath', region: 'kn_yan', rooms: [
      room('blue_gate', 'corridor', undefined, 's', { spawns: ['kn_yan_dweller', 'kn_yan_dweller'] }),
      room('avenue', 'hall', 'blue_gate', 'n', { sign: { id: 'knyan_tsath', name: 'Avenue of Tsath' } }),
      room('yoth', 'pit', 'avenue', 'w', { spawns: ['gyaa_yothn'] }),
      stair('temple', 'avenue', 'n', -4),
      room('span', 'bridge', 'temple', 'n'),
      room('nkai', 'hall', 'span', 'n', { wide: true, boss: ['tsathoggua'] }),
    ],
  },
  {
    id: 'slumber', name: 'Stairs of Slumber', region: 'dreamlands', sealed: true, rooms: [
      room('threshold', 'hall', undefined, 'n'),
      stair('light_1', 'threshold', 'n', -4), // the seventy steps of light slumber
      stair('light_2', 'light_1', 'n', -4),
      room('cavern', 'hall', 'light_2', 'n', { sign: { id: 'dream_cavern', name: 'Cavern of Flame' }, ally: 'nasht_kaman_thah' }),
      stair('deep_1', 'cavern', 'n', -5), // the seven hundred steps of deeper slumber
      stair('deep_2', 'deep_1', 'n', -5),
      stair('deep_3', 'deep_2', 'n', -5),
      stair('deep_4', 'deep_3', 'n', -5),
      room('deeper', 'hall', 'deep_4', 'n', { gate: { id: 'dream_deeper', name: 'Gate of Deeper Slumber', to: 'dream_wood_gate' } }),
    ],
  },
  {
    id: 'ulthar_kadath', name: 'Ulthar to Kadath', region: 'dreamlands', rooms: [
      room('ulthar_gate', 'corridor', undefined, 's'),
      room('ulthar', 'hall', 'ulthar_gate', 'n', { sign: { id: 'dream_ulthar', name: 'Ulthar' }, ally: 'cats_of_ulthar' }),
      room('road', 'corridor', 'ulthar', 'n', { spawns: ['zoog', 'zoog'] }),
      stair('leng_climb', 'road', 'n', 5),
      room('leng', 'hall', 'leng_climb', 'n', { boss: ['high_priest'], spawns: ['man_of_leng'] }),
      room('zin_steps', 'stair', 'leng', 'e', { rise: -5, spawns: ['gug', 'ghast'] }),
      room('zin', 'pit', 'zin_steps', 'e', { sign: { id: 'dream_zin', name: 'Vaults of Zin' }, ally: 'pickman' }),
      room('zin_span', 'bridge', 'zin', 'e'),
      stair('kadath_climb', 'zin_span', 'e', 6),
      room('kadath', 'hall', 'kadath_climb', 'e', {
        wide: true, boss: ['great_ones', 'nyarlathotep'], gate: { id: 'dream_ultimate', name: 'The Ultimate Gate', to: 'beyond_gate' },
      }),
    ],
  },
  {
    id: 'risen_rlyeh', name: "Risen R'lyeh", region: 'rlyeh', rooms: [
      room('shore', 'corridor', undefined, 's'),
      room('angles', 'hall', 'shore', 'n', { spawns: ['deep_one', 'star_spawn'] }),
      room('crypts', 'well', 'angles', 'w', { spawns: ['cthulhu_cultist'] }),
      room('wrong', 'bridge', 'angles', 'e', { hidden: { maxSanity: 40 } }),
      room('reliquary', 'hall', 'wrong', 'e', { tome: { name: "R'lyehian Tablet", insight: 1 } }),
      stair('climb', 'angles', 'n', 4),
      room('vestibule', 'corridor', 'climb', 'n', { sign: { id: 'rlyeh_vestibule', name: 'Vestibule of Mu' } }),
      room('mu', 'hall', 'vestibule', 'n', { wide: true, boss: ['ghatanothoa'] }),
    ],
  },
  {
    id: 'migo_cities', name: 'Mi-Go Cities', region: 'yuggoth', rooms: [
      room('landing', 'corridor', undefined, 'w', { spawns: ['mi_go', 'mi_go'] }),
      room('fungus', 'hall', 'landing', 'e', { sign: { id: 'yuggoth_cities', name: 'Fungoid Cities' } }),
      room('pits', 'pit', 'fungus', 'n', { spawns: ['venusian_man_lizard'] }),
      stair('tower', 'fungus', 'e', 5),
      room('cylinders', 'hall', 'tower', 'e', { boss: ['rhan_tegoth'] }),
    ],
  },
  {
    id: 'ultimate_void', name: 'The Ultimate Void', region: 'beyond', rooms: [
      room('first_gate', 'corridor', undefined, 's', { spawns: ['yekubian'] }),
      room('antechamber', 'hall', 'first_gate', 'n', { sign: { id: 'beyond_first', name: 'The First Gate' } }),
      room('span', 'bridge', 'antechamber', 'n', { hidden: { minInsight: 3 } }),
      room('ultimate', 'hall', 'span', 'n', { wide: true, boss: ['umr_at_tawil'] }),
    ],
  },
];

export const getDungeon = (id: string): DungeonDef | undefined => DUNGEONS.find((d) => d.id === id);
