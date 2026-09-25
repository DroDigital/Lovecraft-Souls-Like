/**
 * The lesser dungeons: crypts, cellars and deserted houses from the stories, each hiding an optional
 * boss at its far end behind a few rooms of foes, with a Silver Vial (one more dose of West's
 * Reagent) or a tome for whoever gets that far. Placed by sites.ts like the legacy dungeons.
 */

import type { Dir, DungeonDef, RoomDef, RoomKind } from './dungeons';

type Extras = Omit<RoomDef, 'id' | 'kind' | 'from' | 'dir'>;
const room = (id: string, kind: RoomKind, from: string | undefined, dir: Dir, x: Extras = {}): RoomDef => ({ id, kind, from, dir, ...x });
const stair = (id: string, from: string, dir: Dir, rise: number, x: Extras = {}): RoomDef => room(id, 'stair', from, dir, { rise, ...x });

export const LAIRS: readonly DungeonDef[] = [
  {
    id: 'munoz_rooms', name: "Muñoz's Rooms", region: 'hub', rooms: [
      room('hall', 'corridor', undefined, 's', { spawns: ['rat_swarm'] }),
      stair('stairs', 'hall', 'n', 4, { spawns: ['exham_troglodyte'] }),
      room('cold', 'hall', 'stairs', 'n', { boss: ['dr_munoz'], vial: 'Silver Vial of the Cold Room' }),
    ],
  },
  {
    id: 'alchemist_cellars', name: 'Cellars of the Castle', region: 'hub', rooms: [
      room('gate', 'corridor', undefined, 'e'),
      stair('down', 'gate', 'w', -4, { spawns: ['rat_swarm', 'rat_swarm'] }),
      room('vault', 'corridor', 'down', 'w', { spawns: ['exham_troglodyte'] }),
      room('laboratory', 'hall', 'vault', 'w', { boss: ['charles_le_sorcier'], tome: { name: "Michel Mauvais's Notes", insight: 1 } }),
    ],
  },
  {
    id: 'outsider_crypt', name: 'The Crypt Below the Castle', region: 'hub', rooms: [
      room('door', 'corridor', undefined, 'n'),
      room('bones', 'hall', 'door', 's', { spawns: ['exham_troglodyte', 'exham_troglodyte'] }),
      stair('climb', 'bones', 's', 4),
      room('mirror', 'hall', 'climb', 's', { boss: ['the_outsider'], vial: 'Silver Vial of the Mirror Room' }),
    ],
  },
  {
    id: 'hound_churchyard', name: 'The Old Churchyard', region: 'arkham', rooms: [
      room('lychgate', 'corridor', undefined, 'n', { spawns: ['reanimated_corpse'] }),
      stair('grave', 'lychgate', 's', -4),
      room('ossuary', 'pit', 'grave', 's', { spawns: ['rat_swarm', 'reanimated_corpse'] }),
      room('coffin', 'hall', 'ossuary', 's', { boss: ['the_hound'], vial: 'Silver Vial of the Jade Amulet' }),
    ],
  },
  {
    id: 'deserted_house', name: 'The Deserted House', region: 'arkham', rooms: [
      room('porch', 'corridor', undefined, 'w'),
      room('front_room', 'hall', 'porch', 'e', { spawns: ['reanimated_corpse', 'moon_bog_wraith'] }),
      stair('attic_stair', 'front_room', 'e', 4),
      room('attic', 'hall', 'attic_stair', 'e', { boss: ['the_unnamable'], tome: { name: "Carter's Account", insight: 1 } }),
    ],
  },
  {
    id: 'swamp_tomb', name: 'The Tomb in the Swamp', region: 'arkham', rooms: [
      room('slab', 'corridor', undefined, 's', { spawns: ['moon_bog_wraith'] }),
      stair('steps', 'slab', 'n', -5),
      room('passage', 'corridor', 'steps', 'n', { spawns: ['rat_swarm', 'reanimated_corpse'] }),
      room('vault', 'hall', 'passage', 'n', { boss: ['voice_in_the_tomb'], vial: 'Silver Vial of the Telephone Wire' }),
    ],
  },
  {
    id: 'shunned_cellar', name: 'The Shunned House', region: 'providence', rooms: [
      room('doorway', 'corridor', undefined, 'e', { spawns: ['ghoul'] }),
      stair('cellar_stair', 'doorway', 'w', -4),
      room('cellar', 'hall', 'cellar_stair', 'w', { boss: ['shunned_house_entity'], vial: 'Silver Vial of the Nitre Stain' }),
    ],
  },
  {
    id: 'red_hook_vaults', name: 'The Vaults under Red Hook', region: 'providence', rooms: [
      room('dance_hall', 'hall', undefined, 'n', { spawns: ['cthulhu_cultist', 'cthulhu_cultist'] }),
      stair('trapdoor', 'dance_hall', 's', -5),
      room('canal', 'bridge', 'trapdoor', 's', { spawns: ['cthulhu_cultist'] }),
      room('shrine', 'hall', 'canal', 's', { boss: ['lilith'], tome: { name: "Suydam's Papers", insight: 1 } }),
    ],
  },
  {
    id: 'old_man_house', name: "The Old Captain's House", region: 'providence', rooms: [
      room('gate', 'corridor', undefined, 'w', { spawns: ['cthulhu_cultist'] }),
      room('bottles', 'hall', 'gate', 'e', { boss: ['terrible_old_man'], vial: 'Silver Vial of the Pendulum Bottle' }),
    ],
  },
  {
    id: 'whateley_farm', name: 'The Whateley Farmhouse', region: 'dunwich', rooms: [
      room('yard', 'corridor', undefined, 's', { spawns: ['thousand_young'] }),
      room('kitchen', 'hall', 'yard', 'n'),
      stair('loft', 'kitchen', 'n', 4, { spawns: ['thousand_young'] }),
      room('upstairs', 'hall', 'loft', 'n', { boss: ['wilbur_whateley'], vial: 'Silver Vial of the Boarded Rooms' }),
    ],
  },
  {
    id: 'waite_house', name: 'The Waite House', region: 'innsmouth', rooms: [
      room('stoop', 'corridor', undefined, 'n', { spawns: ['innsmouth_hybrid'] }),
      room('parlour', 'hall', 'stoop', 's', { spawns: ['deep_one', 'innsmouth_hybrid'] }),
      stair('stairs', 'parlour', 's', 4),
      room('study', 'hall', 'stairs', 's', { boss: ['ephraim_waite'], vial: 'Silver Vial of the Thing on the Doorstep' }),
    ],
  },
  {
    id: 'sculptor_studio', name: "The Sculptor's Tower", region: 'dreamlands', rooms: [
      room('foot', 'corridor', undefined, 's', { spawns: ['zoog'] }),
      stair('turret', 'foot', 'n', 5, { spawns: ['zoog'] }),
      room('studio', 'hall', 'turret', 'n', { boss: ['hypnos'], vial: 'Silver Vial of the Laurel Head' }),
    ],
  },
  {
    id: 'rue_dauseil', name: "The Rue d'Auseil", region: 'beyond', rooms: [
      room('street', 'corridor', undefined, 's', { spawns: ['yekubian'] }),
      stair('first_flight', 'street', 'n', 4),
      stair('second_flight', 'first_flight', 'n', 4, { spawns: ['dhole'] }),
      room('garret', 'hall', 'second_flight', 'n', { boss: ['zann_window_thing'], vial: 'Silver Vial of the Viol' }),
    ],
  },
];
