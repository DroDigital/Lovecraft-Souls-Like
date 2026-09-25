/**
 * Great Old Ones (spec §4): region bosses; colossi are primitive assemblies. Each fights by a phase
 * script (spec §3E) composed from the shared attack library and reality hooks. Cthulhu cannot be
 * killed and Hastur must be called by name (signature mechanics, systems/signatures/); Ghatanothoa's
 * petrifying gaze drives the investigator behind its arena's monoliths.
 */

import { ph, phases, scripted, st, tier } from './kit';

export const GREAT_OLD_ONES = tier('great_old_one', [
  {
    id: 'cthulhu', name: 'Cthulhu', source: 'The Call of Cthulhu', regions: ['rlyeh'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'sea', scale: 40, tentacles: 8, wings: 2, eyes: 2 },
    ...scripted('boss', phases(
      ph(1, { tentacle_burst: 3, slam: 2, grab: 1, roar: 1, quake: 1 }, { hooks: ['camera_warp'] }),
      ph(0.66, { tentacle_burst: 2, slam: 2, wind_push: 2, roar: 1, quake: 1, eruption: 2 }, { summons: ['star_spawn', 'star_spawn'], hooks: ['camera_warp', 'flood'] }),
      ph(0.33, { slam: 2, tentacle_burst: 2, grab: 2, wind_push: 1, roar: 1, eruption: 1, vortex: 1, quake: 1 }, { hooks: ['flood', 'camera_warp'], arena: 'ship' }),
    )),
    stats: st(20000, 5000, 120, 2, 10, 20), drops: { echoes: 30000 }, insightOnSight: 4,
  },
  {
    id: 'father_dagon', name: 'Father Dagon', source: 'Dagon', regions: ['innsmouth'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'sea', scale: 16, eyes: 2, tentacles: 0 },
    ...scripted('boss', phases(ph(1, { slam: 2, sweep: 2, wind_push: 1, quake: 1 }, { hooks: ['flood'] }), ph(0.5, { slam: 2, sweep: 1, roar: 1, charge: 1, vortex: 1, eruption: 1 }, { summons: ['deep_one', 'deep_one'], hooks: ['flood', 'darkness'] }))),
    stats: st(9000, 1200, 80, 2.6, 6, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'mother_hydra', name: 'Mother Hydra', source: 'The Shadow over Innsmouth', regions: ['innsmouth'], canonLooks: false,
    assembly: { body: 'lathe', palette: 'sea', scale: 15, eyes: 4, tentacles: 6 },
    ...scripted('boss', phases(ph(1, { grab: 2, pool: 1, tentacle_burst: 2, eruption: 1 }, { hooks: ['flood'] }), ph(0.5, { tentacle_burst: 2, pool: 2, grab: 1, spit: 1, vortex: 1 }, { summons: ['innsmouth_hybrid', 'innsmouth_hybrid'], hooks: ['flood'] }))),
    stats: st(8500, 1100, 76, 2.6, 6, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'hastur', name: 'Hastur', source: 'The Whisperer in Darkness', regions: ['yuggoth'], canonLooks: false, voice: 'whisper',
    sprite: { silhouette: 'spectre', palette: 'sand', scale: 8, eyes: 0, tentacles: 6 },
    ...scripted('boss', { ...phases(
      ph(1, { roar: 2, tentacle_burst: 2, gaze: 1, sweep_beam: 1 }, { hooks: ['camera_warp'] }),
      ph(0.5, { darkness: 1, tentacle_burst: 2, gaze: 2, wind_push: 1, barrage: 1 }, { hooks: ['camera_warp', 'darkness'] }),
      ph(0.2, { roar: 2, gaze: 2, beam: 1, teleport: 1, eruption: 1, sweep_beam: 1 }, { hooks: ['camera_warp', 'darkness', 'time_skip'] }),
    ), called: true }),
    stats: st(12000, 2000, 90, 3, 8, 16), drops: { echoes: 20000 }, insightOnSight: 4,
  },
  {
    id: 'tsathoggua', name: 'Tsathoggua', source: 'The Mound', regions: ['kn_yan'], canonLooks: true,
    sprite: { silhouette: 'toad', palette: 'charcoal', scale: 6, eyes: 2 },
    ...scripted('boss', phases(
      ph(1, { bite: 2, slam: 1, spit: 1, quake: 1 }),
      ph(0.5, { spit: 2, pool: 2, bite: 1, eruption: 1 }, { summons: ['formless_spawn', 'formless_spawn'], hooks: ['darkness'] }),
      ph(0.2, { slam: 2, bite: 2, roar: 1, quake: 1, vortex: 1 }, { hooks: ['darkness'] }),
    )),
    stats: st(9000, 1500, 70, 1.8, 6, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'ghatanothoa', name: 'Ghatanothoa', source: 'Out of the Aeons', regions: ['rlyeh'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'charcoal', scale: 20, tentacles: 8, eyes: 4 },
    ...scripted('boss', phases(
      ph(1, { gaze: 2, tentacle_burst: 2, slam: 1, quake: 1 }, { hooks: ['petrify_buildup'], arena: 'monoliths' }),
      ph(0.5, { gaze: 2, tentacle_burst: 2, slam: 1, roar: 1, eruption: 2 }, { hooks: ['petrify_buildup', 'camera_warp'] }),
    )),
    stats: st(14000, 3000, 90, 1.5, 9, 18), drops: { echoes: 20000 }, insightOnSight: 4,
  },
  {
    id: 'rhan_tegoth', name: 'Rhan-Tegoth', source: 'The Horror in the Museum', regions: ['yuggoth'], canonLooks: true,
    sprite: { silhouette: 'toad', palette: 'bone', scale: 5, eyes: 3, limbs: 6 },
    ...scripted('boss', phases(ph(1, { grab: 2, bite: 2, sweep: 1, combo: 1 }), ph(0.5, { grab: 2, bite: 1, charge: 1, roar: 1, quake: 1 }, { hooks: ['camera_warp'] }))),
    stats: st(7000, 1000, 70, 3, 5, 12), drops: { echoes: 9000 }, insightOnSight: 3,
  },
  {
    id: 'yig', name: 'Yig', source: 'The Curse of Yig', regions: ['kn_yan'], canonLooks: false,
    sprite: { silhouette: 'serpent', palette: 'sand', scale: 6, eyes: 2 },
    ...scripted('boss', phases(ph(1, { bite: 2, lunge: 2, spit: 1, combo: 1 }), ph(0.5, { bite: 2, lunge: 1, summon: 1, spit: 1, charge: 1, eruption: 1 }, { summons: ['child_of_yig'] }))),
    stats: st(8000, 1200, 70, 4, 5, 12), drops: { echoes: 10000 }, insightOnSight: 3,
  },
  {
    id: 'bokrug', name: 'Bokrug', source: 'The Doom that Came to Sarnath', regions: ['dreamlands'], canonLooks: false,
    sprite: { silhouette: 'quadruped', palette: 'sea', scale: 9, eyes: 2 },
    ...scripted('boss', phases(ph(1, { bite: 2, charge: 1, pool: 1, quake: 1 }, { hooks: ['flood'] }), ph(0.5, { charge: 2, bite: 2, summon: 1, pool: 1, vortex: 1 }, { summons: ['being_of_ib'], hooks: ['flood', 'camera_warp'] }))),
    stats: st(9000, 1400, 74, 3, 5, 12), drops: { echoes: 12000 }, insightOnSight: 3,
  },
  {
    id: 'nug', name: 'Nug', source: 'The Mound', regions: ['kn_yan'], canonLooks: false,
    sprite: { silhouette: 'blob', palette: 'pallid', scale: 7, eyes: 3 },
    ...scripted('boss', phases(ph(1, { bite: 2, slam: 2, roar: 1, quake: 1 }), ph(0.5, { slam: 2, charge: 1, roar: 1, aoe_ring: 1, eruption: 1 }, { hooks: ['darkness'] }))),
    stats: st(7000, 1100, 66, 2.4, 5, 12), drops: { echoes: 9000 }, insightOnSight: 3,
  },
  {
    id: 'yeb', name: 'Yeb', source: 'The Mound', regions: ['kn_yan'], canonLooks: false,
    sprite: { silhouette: 'blob', palette: 'charcoal', scale: 7, eyes: 1, tentacles: 6 },
    ...scripted('boss', phases(ph(1, { tentacle_burst: 2, spit: 2, darkness: 1, eruption: 1 }), ph(0.5, { tentacle_burst: 2, pool: 2, spit: 1, barrage: 1 }, { hooks: ['darkness'] }))),
    stats: st(7000, 1100, 66, 2.4, 5, 12), drops: { echoes: 9000 }, insightOnSight: 3,
  },
  {
    id: 'great_ones', name: 'The Great Ones', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'giant', palette: 'stone', scale: 5, eyes: 2, limbs: 2 },
    ...scripted('boss', phases(ph(1, { slam: 2, sweep: 2, teleport: 1, barrage: 1 }), ph(0.5, { slam: 2, sweep: 1, teleport: 1, aoe_ring: 1, sweep_beam: 1 }, { hooks: ['hidden_platforms'] }))),
    stats: st(8000, 1200, 70, 3.4, 4, 10), drops: { echoes: 10000 }, insightOnSight: 3,
  },
]);
