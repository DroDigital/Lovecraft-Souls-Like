/**
 * The lesser dungeons: crypts, cellars and deserted houses from the stories, each hiding an optional
 * boss at its far end behind a few rooms of foes, with a Silver Vial (one more dose of West's
 * Reagent) or a tome for whoever gets that far. Placed by sites.ts like the legacy dungeons.
 */

import type { Dir, DungeonDef, RoomDef, RoomKind } from './dungeons';

type Extras = Omit<RoomDef, 'id' | 'kind' | 'from' | 'dir'>;
const room = (id: string, kind: RoomKind, from: string | undefined, dir: Dir, x: Extras = {}): RoomDef => ({ id, kind, from, dir, ...x });
const stair = (id: string, from: string, dir: Dir, rise: number, x: Extras = {}): RoomDef => room(id, 'stair', from, dir, { rise, ...x });

// Round 13: the lairs were two to four rooms; each now has a side way or two, a cellar or a secret.
export const LAIRS: readonly DungeonDef[] = [
  {
    id: 'munoz_rooms', name: "Muñoz's Rooms", region: 'hub', rooms: [
      room('hall', 'corridor', undefined, 's', { spawns: ['rat_swarm'] }),
      room('parlour', 'hall', 'hall', 'e', { spawns: ['rat_swarm', 'reanimated_corpse'] }),
      room('kitchen', 'corridor', 'parlour', 'n', { spawns: ['rat_swarm'] }),
      stair('boiler', 'hall', 'w', -4),
      room('coal_room', 'hall', 'boiler', 'w', { spawns: ['exham_troglodyte', 'exham_troglodyte'] }),
      stair('stairs', 'hall', 'n', 4, { spawns: ['exham_troglodyte'] }),
      room('landing', 'corridor', 'stairs', 'n', { spawns: ['reanimated_corpse'] }),
      room('plant', 'corridor', 'landing', 'w', { spawns: ['reanimated_corpse'], words: 'THE REFRIGERATING PLANT' }),
      room('cold', 'hall', 'landing', 'n', { wide: true, boss: ['dr_munoz'], vial: 'Silver Vial of the Cold Room' }),
    ],
  },
  {
    id: 'alchemist_cellars', name: 'Cellars of the Castle', region: 'hub', rooms: [
      room('gate', 'corridor', undefined, 'e'),
      room('cistern', 'well', 'gate', 's', { spawns: ['rat_swarm'] }),
      stair('down', 'gate', 'w', -4, { spawns: ['rat_swarm', 'rat_swarm'] }),
      room('vault', 'corridor', 'down', 'w', { spawns: ['exham_troglodyte'] }),
      room('dungeon', 'corridor', 'vault', 's', { spawns: ['exham_troglodyte', 'rat_swarm'] }),
      room('cells', 'hall', 'dungeon', 's', { spawns: ['reanimated_corpse', 'reanimated_corpse'] }),
      room('armoury', 'hall', 'vault', 'n', { spawns: ['exham_troglodyte', 'exham_troglodyte'] }),
      room('laboratory', 'hall', 'vault', 'w', { wide: true, boss: ['charles_le_sorcier'], tome: { name: "Michel Mauvais's Notes", insight: 1 } }),
    ],
  },
  {
    id: 'outsider_crypt', name: 'The Crypt Below the Castle', region: 'hub', rooms: [
      room('door', 'corridor', undefined, 'n'),
      room('bones', 'hall', 'door', 's', { spawns: ['exham_troglodyte', 'exham_troglodyte'] }),
      room('catacomb', 'corridor', 'bones', 'e', { spawns: ['exham_troglodyte', 'being_from_beyond'] }),
      room('niches', 'hall', 'catacomb', 'e', { spawns: ['reanimated_corpse', 'reanimated_corpse'] }),
      room('nave', 'corridor', 'bones', 'w', { spawns: ['rat_swarm'] }),
      room('shaft', 'well', 'nave', 'w'),
      stair('climb', 'bones', 's', 4),
      room('mirror', 'hall', 'climb', 's', { wide: true, boss: ['the_outsider'], vial: 'Silver Vial of the Mirror Room' }),
    ],
  },
  {
    id: 'hound_churchyard', name: 'The Old Churchyard', region: 'arkham', rooms: [
      room('lychgate', 'corridor', undefined, 'n', { spawns: ['reanimated_corpse'] }),
      room('tombs', 'corridor', 'lychgate', 'e', { spawns: ['ghoul'] }),
      room('mausoleum', 'hall', 'tombs', 'e', { spawns: ['ghoul', 'ghoul'] }),
      stair('grave', 'lychgate', 's', -4),
      room('ossuary', 'pit', 'grave', 's', { spawns: ['rat_swarm', 'reanimated_corpse'] }),
      room('robbers', 'corridor', 'ossuary', 'w', { spawns: ['reanimated_corpse'] }),
      room('charnel', 'hall', 'robbers', 'w', { hidden: { minInsight: 1 }, tome: { name: "St John's Diary", insight: 1 } }),
      room('coffin', 'hall', 'ossuary', 's', { wide: true, boss: ['the_hound'], vial: 'Silver Vial of the Jade Amulet' }),
    ],
  },
  {
    id: 'deserted_house', name: 'The Deserted House', region: 'arkham', rooms: [
      room('porch', 'corridor', undefined, 'w'),
      room('front_room', 'hall', 'porch', 'e', { spawns: ['reanimated_corpse', 'moon_bog_wraith'] }),
      room('back_room', 'corridor', 'front_room', 'n', { spawns: ['rat_swarm'] }),
      room('kitchen', 'hall', 'back_room', 'n', { spawns: ['reanimated_corpse'] }),
      stair('cellar_stair', 'front_room', 's', -4),
      room('cellar', 'hall', 'cellar_stair', 's', { spawns: ['moon_bog_wraith', 'moon_bog_wraith'] }),
      stair('attic_stair', 'front_room', 'e', 4),
      room('attic', 'hall', 'attic_stair', 'e', { wide: true, boss: ['the_unnamable'], tome: { name: "Carter's Account", insight: 1 } }),
    ],
  },
  {
    id: 'swamp_tomb', name: 'The Tomb in the Swamp', region: 'arkham', rooms: [
      room('slab', 'corridor', undefined, 's', { spawns: ['moon_bog_wraith'] }),
      stair('steps', 'slab', 'n', -5),
      room('passage', 'corridor', 'steps', 'n', { spawns: ['rat_swarm', 'reanimated_corpse'] }),
      room('side_vault', 'corridor', 'passage', 'e', { spawns: ['reanimated_corpse'] }),
      room('bone_pit', 'pit', 'side_vault', 'e', { spawns: ['rat_swarm', 'rat_swarm'] }),
      room('flooded', 'corridor', 'passage', 'w', { spawns: ['moon_bog_wraith'] }),
      room('vault', 'hall', 'passage', 'n', { wide: true, boss: ['voice_in_the_tomb'], vial: 'Silver Vial of the Telephone Wire' }),
    ],
  },
  {
    id: 'shunned_cellar', name: 'The Shunned House', region: 'providence', rooms: [
      room('doorway', 'corridor', undefined, 'e', { spawns: ['ghoul'] }),
      room('parlour', 'hall', 'doorway', 'n', { spawns: ['ghoul', 'cthulhu_cultist'] }),
      room('stairwell', 'corridor', 'parlour', 'w', { spawns: ['ghoul'] }),
      stair('cellar_stair', 'doorway', 'w', -4),
      room('cellar', 'hall', 'cellar_stair', 'w', { wide: true, boss: ['shunned_house_entity'], vial: 'Silver Vial of the Nitre Stain' }),
      room('nitre', 'corridor', 'cellar', 's', { spawns: ['ghoul'] }),
      room('grave', 'pit', 'nitre', 's', { spawns: ['ghoul', 'ghoul'], words: 'THE SHAPE IN THE NITRE' }),
    ],
  },
  {
    id: 'red_hook_vaults', name: 'The Vaults under Red Hook', region: 'providence', rooms: [
      room('dance_hall', 'hall', undefined, 'n', { spawns: ['cthulhu_cultist', 'cthulhu_cultist'] }),
      room('bar', 'corridor', 'dance_hall', 'e', { spawns: ['cthulhu_cultist', 'cthulhu_cultist'] }),
      room('back_stair', 'corridor', 'dance_hall', 'w', { spawns: ['cthulhu_cultist', 'winged_hybrid'] }),
      stair('lower_steps', 'back_stair', 'w', -5),
      room('crypt', 'hall', 'lower_steps', 'w', { spawns: ['ghoul', 'ghoul'] }),
      stair('trapdoor', 'dance_hall', 's', -5),
      room('canal', 'bridge', 'trapdoor', 's', { spawns: ['cthulhu_cultist'] }),
      room('shrine', 'hall', 'canal', 's', { wide: true, boss: ['lilith'], tome: { name: "Suydam's Papers", insight: 1 } }),
    ],
  },
  {
    id: 'old_man_house', name: "The Old Captain's House", region: 'providence', rooms: [
      room('gate', 'corridor', undefined, 'w', { spawns: ['cthulhu_cultist'] }),
      room('garden', 'corridor', 'gate', 'n', { spawns: ['winged_hybrid'] }),
      room('front_hall', 'hall', 'gate', 'e', { spawns: ['cthulhu_cultist'] }),
      stair('stair', 'front_hall', 'n', 4),
      room('upper', 'corridor', 'stair', 'n', { spawns: ['cthulhu_cultist', 'ghoul'] }),
      room('bottles', 'hall', 'front_hall', 'e', { wide: true, boss: ['terrible_old_man'], vial: 'Silver Vial of the Pendulum Bottle' }),
    ],
  },
  {
    id: 'whateley_farm', name: 'The Whateley Farmhouse', region: 'dunwich', rooms: [
      room('yard', 'corridor', undefined, 's', { spawns: ['thousand_young'] }),
      room('shed', 'corridor', 'yard', 'e', { spawns: ['martense_degenerate'] }),
      room('barn', 'hall', 'shed', 'e', { spawns: ['thousand_young', 'martense_degenerate', 'martense_degenerate'] }),
      room('kitchen', 'hall', 'yard', 'n', { weapon: 'axe' }),
      room('boarded', 'corridor', 'kitchen', 'w', { spawns: ['thousand_young'], words: 'THE BOARDED ROOMS' }),
      stair('loft', 'kitchen', 'n', 4, { spawns: ['thousand_young'] }),
      room('upstairs', 'hall', 'loft', 'n', { wide: true, boss: ['wilbur_whateley'], vial: 'Silver Vial of the Boarded Rooms' }),
    ],
  },
  {
    id: 'waite_house', name: 'The Waite House', region: 'innsmouth', rooms: [
      room('stoop', 'corridor', undefined, 'n', { spawns: ['innsmouth_hybrid'] }),
      room('parlour', 'hall', 'stoop', 's', { spawns: ['deep_one', 'innsmouth_hybrid'] }),
      room('library', 'corridor', 'parlour', 'e', { spawns: ['innsmouth_hybrid'] }),
      room('laboratory', 'hall', 'library', 'e', { hidden: { minInsight: 1 }, tome: { name: "Asenath's Notes", insight: 1 } }),
      stair('cellar_stair', 'parlour', 'w', -4),
      room('cellar', 'hall', 'cellar_stair', 'w', { spawns: ['deep_one', 'deep_one'] }),
      stair('stairs', 'parlour', 's', 4),
      room('study', 'hall', 'stairs', 's', { wide: true, boss: ['ephraim_waite'], vial: 'Silver Vial of the Thing on the Doorstep' }),
    ],
  },
  {
    id: 'sculptor_studio', name: "The Sculptor's Tower", region: 'dreamlands', rooms: [
      room('foot', 'corridor', undefined, 's', { spawns: ['zoog'] }),
      room('gallery', 'hall', 'foot', 'e', { spawns: ['zoog', 'zoog', 'cat_from_saturn'] }),
      room('garden', 'corridor', 'foot', 'w', { spawns: ['gnorri'] }),
      room('fountain', 'well', 'garden', 'w'),
      stair('turret', 'foot', 'n', 5, { spawns: ['zoog'] }),
      room('studio', 'hall', 'turret', 'n', { wide: true, boss: ['hypnos'], vial: 'Silver Vial of the Laurel Head' }),
    ],
  },
  {
    id: 'rue_dauseil', name: "The Rue d'Auseil", region: 'beyond', rooms: [
      room('street', 'corridor', undefined, 's', { spawns: ['yekubian'] }),
      room('alley', 'corridor', 'street', 'e', { spawns: ['being_from_beyond'] }),
      room('lodging', 'hall', 'alley', 'e', { spawns: ['yekubian', 'being_from_beyond'] }),
      stair('first_flight', 'street', 'n', 4),
      stair('second_flight', 'first_flight', 'n', 4, { spawns: ['dhole'] }),
      room('garret', 'hall', 'second_flight', 'n', { wide: true, boss: ['zann_window_thing'], vial: 'Silver Vial of the Viol' }),
    ],
  },
];
