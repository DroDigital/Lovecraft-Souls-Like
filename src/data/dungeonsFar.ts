/**
 * The dungeons of the far realms (split from dungeons.ts in playtest round 24): Risen R'lyeh, the
 * Mi-Go Cities of Yuggoth and the Ultimate Void beyond. Room graphs like the others'.
 */

import type { DungeonDef } from './dungeons';
import { room, stair } from './roomBuild';

export const FAR_DUNGEONS: readonly DungeonDef[] = [
  {
    id: 'risen_rlyeh', name: "Risen R'lyeh", region: 'rlyeh', rooms: [
      room('shore', 'corridor', undefined, 's'),
      room('tide_pools', 'corridor', 'shore', 'e', { spawns: ['deep_one', 'deep_one'] }),
      stair('drowned_stair', 'tide_pools', 'e', -4, { spawns: ['dagon_priest'] }),
      room('sunken_court', 'hall', 'drowned_stair', 'e', { spawns: ['deep_one', 'innsmouth_hybrid', 'star_spawn'], words: 'THE SUNKEN COURT' }),
      room('angles', 'hall', 'shore', 'n', { spawns: ['deep_one', 'star_spawn'] }),
      room('crypts', 'well', 'angles', 'w', { spawns: ['cthulhu_cultist'] }),
      room('star_tomb', 'corridor', 'crypts', 'w', { spawns: ['star_spawn'] }),
      room('monolith', 'hall', 'star_tomb', 's', { hidden: { minInsight: 2 }, tome: { name: "Johansen's Narrative", insight: 1 } }),
      room('wrong', 'bridge', 'angles', 'e', { hidden: { maxSanity: 40 } }),
      room('reliquary', 'hall', 'wrong', 'e', { tome: { name: "R'lyehian Tablet", insight: 1 } }),
      stair('climb', 'angles', 'n', 4),
      room('vestibule', 'corridor', 'climb', 'n', { sign: { id: 'rlyeh_vestibule', name: 'Vestibule of Mu' } }),
      room('angled_gallery', 'corridor', 'vestibule', 'w', { spawns: ['star_spawn', 'cthulhu_cultist'] }),
      room('mu', 'hall', 'vestibule', 'n', { wide: true, boss: ['ghatanothoa'] }),
    ],
  },
  {
    id: 'migo_cities', name: 'Mi-Go Cities', region: 'yuggoth', rooms: [
      room('landing', 'corridor', undefined, 'w', { spawns: ['mi_go', 'mi_go'] }),
      room('docks', 'corridor', 'landing', 'n', { spawns: ['mi_go'] }),
      room('fungus', 'hall', 'landing', 'e', { sign: { id: 'yuggoth_cities', name: 'Fungoid Cities' } }),
      room('hive', 'corridor', 'fungus', 's', { spawns: ['mi_go', 'yekubian'] }),
      room('surgery', 'hall', 'hive', 's', { spawns: ['mi_go', 'mi_go', 'being_from_beyond'], words: 'THE SURGERY OF THE OUTER ONES' }),
      room('brain_rack', 'corridor', 'surgery', 'e', { hidden: { minInsight: 1 }, tome: { name: "The Outer Ones' Ledger", insight: 1 } }),
      room('pits', 'pit', 'fungus', 'n', { spawns: ['venusian_man_lizard'] }),
      room('spore_field', 'hall', 'pits', 'n', { spawns: ['venusian_man_lizard', 'venusian_man_lizard'] }),
      room('pitch_bridge', 'bridge', 'spore_field', 'n', { spawns: ['mi_go'] }),
      room('black_tower', 'hall', 'pitch_bridge', 'n', { spawns: ['yekubian', 'mi_go'], words: 'THE BLACK TOWERS' }),
      stair('tower', 'fungus', 'e', 5),
      room('cylinders', 'hall', 'tower', 'e', { wide: true, boss: ['rhan_tegoth'] }),
    ],
  },
  {
    id: 'ultimate_void', name: 'The Ultimate Void', region: 'beyond', rooms: [
      room('first_gate', 'corridor', undefined, 's', { spawns: ['yekubian'] }),
      room('antechamber', 'hall', 'first_gate', 'n', { sign: { id: 'beyond_first', name: 'The First Gate' } }),
      room('drift', 'corridor', 'antechamber', 'w', { spawns: ['being_from_beyond', 'being_from_beyond'] }),
      room('spheres', 'well', 'drift', 'w', { spawns: ['dhole'] }),
      stair('eddies', 'spheres', 'w', -5),
      room('nadir', 'hall', 'eddies', 'w', { spawns: ['cat_from_saturn', 'cat_from_saturn', 'flying_polyp'], words: 'THE NADIR' }),
      room('lattice', 'corridor', 'antechamber', 'e', { spawns: ['yekubian', 'being_from_beyond'] }),
      room('mirrors', 'hall', 'lattice', 'e', { hidden: { maxSanity: 40 }, tome: { name: "The Silver Key's Inscription", insight: 2 } }),
      room('span', 'bridge', 'antechamber', 'n', { hidden: { minInsight: 3 } }),
      room('ultimate', 'hall', 'span', 'n', { wide: true, boss: ['umr_at_tawil'] }),
    ],
  },
];
