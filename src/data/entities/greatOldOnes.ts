/** Great Old Ones (spec §4): region bosses; colossi are primitive assemblies. Scripts are one-phase stubs. */

import { boss, st, tier } from './kit';

export const GREAT_OLD_ONES = tier('great_old_one', [
  {
    id: 'cthulhu', name: 'Cthulhu', source: 'The Call of Cthulhu', regions: ['rlyeh'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'sea', scale: 40, tentacles: 8, wings: 2, eyes: 2 },
    ...boss(['tentacle_burst', 'slam', 'grab', 'roar', 'wind_push'], { summons: ['star_spawn'], hooks: ['flood', 'camera_warp'] }),
    stats: st(20000, 5000, 120, 2, 10, 20), drops: { echoes: 30000 }, insightOnSight: 4,
  },
  {
    id: 'father_dagon', name: 'Father Dagon', source: 'Dagon', regions: ['innsmouth'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'sea', scale: 16, eyes: 2, tentacles: 0 },
    ...boss(['slam', 'sweep', 'wind_push', 'roar'], { summons: ['deep_one'], hooks: ['flood'] }),
    stats: st(9000, 1200, 80, 2.6, 6, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'mother_hydra', name: 'Mother Hydra', source: 'The Shadow over Innsmouth', regions: ['innsmouth'], canonLooks: false,
    assembly: { body: 'lathe', palette: 'sea', scale: 15, eyes: 4, tentacles: 6 },
    ...boss(['grab', 'pool', 'tentacle_burst'], { summons: ['innsmouth_hybrid'], hooks: ['flood'] }),
    stats: st(8500, 1100, 76, 2.6, 6, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'hastur', name: 'Hastur', source: 'The Whisperer in Darkness', regions: ['yuggoth'], canonLooks: false,
    sprite: { silhouette: 'spectre', palette: 'sand', scale: 8, eyes: 0, tentacles: 6 },
    ...boss(['roar', 'darkness', 'tentacle_burst', 'gaze'], { hooks: ['camera_warp'] }),
    stats: st(12000, 2000, 90, 3, 8, 16), drops: { echoes: 20000 }, insightOnSight: 4,
  },
  {
    id: 'tsathoggua', name: 'Tsathoggua', source: 'The Mound', regions: ['kn_yan'], canonLooks: true,
    sprite: { silhouette: 'toad', palette: 'charcoal', scale: 6, eyes: 2 },
    ...boss(['bite', 'slam', 'spit', 'pool'], { summons: ['formless_spawn'] }),
    stats: st(9000, 1500, 70, 1.8, 6, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'ghatanothoa', name: 'Ghatanothoa', source: 'Out of the Aeons', regions: ['rlyeh'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'charcoal', scale: 20, tentacles: 8, eyes: 4 },
    ...boss(['gaze', 'tentacle_burst', 'slam'], { hooks: ['petrify_buildup'] }),
    stats: st(14000, 3000, 90, 1.5, 9, 18), drops: { echoes: 20000 }, insightOnSight: 4,
  },
  {
    id: 'rhan_tegoth', name: 'Rhan-Tegoth', source: 'The Horror in the Museum', regions: ['yuggoth'], canonLooks: true,
    sprite: { silhouette: 'toad', palette: 'bone', scale: 5, eyes: 3, limbs: 6 },
    ...boss(['grab', 'bite', 'sweep']),
    stats: st(7000, 1000, 70, 3, 5, 12), drops: { echoes: 9000 }, insightOnSight: 3,
  },
  {
    id: 'yig', name: 'Yig', source: 'The Curse of Yig', regions: ['kn_yan'], canonLooks: false,
    sprite: { silhouette: 'serpent', palette: 'sand', scale: 6, eyes: 2 },
    ...boss(['bite', 'lunge', 'summon', 'spit'], { summons: ['child_of_yig'] }),
    stats: st(8000, 1200, 70, 4, 5, 12), drops: { echoes: 10000 }, insightOnSight: 3,
  },
  {
    id: 'bokrug', name: 'Bokrug', source: 'The Doom that Came to Sarnath', regions: ['dreamlands'], canonLooks: false,
    sprite: { silhouette: 'quadruped', palette: 'sea', scale: 9, eyes: 2 },
    ...boss(['bite', 'charge', 'pool', 'summon'], { summons: ['being_of_ib'], hooks: ['flood'] }),
    stats: st(9000, 1400, 74, 3, 5, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'nug', name: 'Nug', source: 'The Mound', regions: ['kn_yan'], canonLooks: false,
    sprite: { silhouette: 'blob', palette: 'pallid', scale: 7, eyes: 3 },
    ...boss(['bite', 'slam', 'roar']),
    stats: st(7000, 1100, 66, 2.4, 5, 12), drops: { echoes: 9000 }, insightOnSight: 3,
  },
  {
    id: 'yeb', name: 'Yeb', source: 'The Mound', regions: ['kn_yan'], canonLooks: false,
    sprite: { silhouette: 'blob', palette: 'charcoal', scale: 7, eyes: 1, tentacles: 6 },
    ...boss(['tentacle_burst', 'spit', 'darkness']),
    stats: st(7000, 1100, 66, 2.4, 5, 12), drops: { echoes: 9000 }, insightOnSight: 3,
  },
  {
    id: 'great_ones', name: 'The Great Ones', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'giant', palette: 'stone', scale: 5, eyes: 2, limbs: 2 },
    ...boss(['slam', 'sweep', 'teleport']),
    stats: st(8000, 1200, 70, 3.4, 4, 10), drops: { echoes: 10000 }, insightOnSight: 3,
  },
]);
