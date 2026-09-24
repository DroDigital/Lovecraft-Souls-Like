/**
 * Named tier (spec §4): individual horrors, sorcerers and avatars. Region bosses use the boss
 * archetype; the rest are optional bosses with their own temperament. All but the two stationary
 * horrors fight by phase scripts (spec §3E) composed from the shared attack library and reality
 * hooks; the Colour, the Dunwich Horror and the Haunter also have signature mechanics (systems/).
 */

import { ph, phases, scripted, st, tier } from './kit';

export const NAMED = tier('named', [
  {
    id: 'colour_out_of_space', name: 'The Colour Out of Space', source: 'The Colour Out of Space', regions: ['arkham'], canonLooks: false,
    sprite: { silhouette: 'orb', palette: 'pallid', scale: 5, eyes: 0, glow: 'magenta', outside: true },
    ...scripted('boss', phases(ph(1, { beam: 2, pool: 2, aoe_ring: 1 }, { hooks: ['camera_warp'] }), ph(0.5, { beam: 2, pool: 1, aoe_ring: 2, projectile_fan: 2, teleport: 1 }, { hooks: ['camera_warp'] }))),
    stats: st(2400, 400, 40, 3, 4, 10), resist: ['slash', 'blunt', 'shot'], drops: { echoes: 3000 }, insightOnSight: 2,
  },
  {
    id: 'wilbur_whateley', name: 'Wilbur Whateley', source: 'The Dunwich Horror', regions: ['dunwich'], canonLooks: true,
    sprite: { silhouette: 'giant', palette: 'rust', scale: 3.2, eyes: 2, tentacles: 8, limbs: 2 },
    ...scripted('caster', phases(ph(1, { projectile: 2, grab: 1, summon: 1 }, { summons: ['thousand_young'] }), ph(0.4, { grab: 2, tentacle_burst: 2, roar: 1 }))),
    stats: st(1400, 150, 34, 3.4, 2, 6), drops: { echoes: 1800 }, insightOnSight: 1,
  },
  {
    id: 'dunwich_horror', name: 'The Dunwich Horror', source: 'The Dunwich Horror', regions: ['dunwich'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'rubber', scale: 9, tentacles: 10, eyes: 12 },
    ...scripted('boss', { ...phases(ph(1, { tentacle_burst: 2, slam: 2, charge: 1 }), ph(0.55, { slam: 2, charge: 2, roar: 1, wind_push: 1 }), ph(0.12, { slam: 1, tentacle_burst: 1, roar: 2 }, { hooks: ['camera_warp'] })), unseen: true }),
    stats: st(4000, 500, 55, 3, 4, 10), resist: ['shot'], drops: { echoes: 6000 }, insightOnSight: 2,
  },
  {
    id: 'keziah_mason', name: 'Keziah Mason', source: 'The Dreams in the Witch House', regions: ['arkham'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'charcoal', scale: 2, eyes: 2 },
    ...scripted('boss', phases(ph(1, { projectile: 2, teleport: 1, summon: 1 }, { summons: ['rat_swarm'], hooks: ['arena_reconnect'] }), ph(0.5, { projectile_fan: 2, teleport: 2, gaze: 1, summon: 1 }, { summons: ['rat_swarm'], hooks: ['arena_reconnect', 'camera_warp'] })), { range: [6, 12], strafe: 0.5 }),
    stats: st(1600, 120, 30, 3.4, 2, 8), drops: { echoes: 2500 }, insightOnSight: 1,
  },
  {
    id: 'brown_jenkin', name: 'Brown Jenkin', source: 'The Dreams in the Witch House', regions: ['arkham'], canonLooks: true,
    sprite: { silhouette: 'quadruped', palette: 'rust', scale: 1, eyes: 2 },
    ...scripted('skirmisher', phases(ph(1, { bite: 2, grab: 1 }), ph(0.4, { bite: 3, lunge: 1 }))),
    stats: st(600, 40, 18, 5.5, 1.5, 5), drops: { echoes: 800 }, insightOnSight: 1,
  },
  {
    id: 'black_man', name: 'The Black Man', source: 'The Dreams in the Witch House', regions: ['arkham'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'charcoal', scale: 2.6, eyes: 2, glow: 'purple' },
    ...scripted('mind_thief', phases(ph(1, { projectile: 2, gaze: 1, teleport: 1 }), ph(0.5, { gaze: 2, projectile_fan: 1, teleport: 1 }, { hooks: ['decoys'] }))),
    stats: st(1800, 200, 36, 3.8, 3, 10), drops: { echoes: 2500 }, insightOnSight: 2,
  },
  {
    id: 'joseph_curwen', name: 'Joseph Curwen', source: 'The Case of Charles Dexter Ward', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'sand', scale: 2.1, eyes: 2 },
    ...scripted('boss', phases(
      ph(1, { projectile: 2, summon: 1, teleport: 1 }, { summons: ['reanimated_corpse'] }),
      ph(0.5, { projectile_fan: 2, beam: 1, summon: 1, teleport: 1 }, { summons: ['reanimated_corpse'] }),
      ph(0.2, { beam: 2, projectile_fan: 1, roar: 1 }, { hooks: ['camera_warp'] }),
    ), { range: [5, 11], strafe: 0.4 }),
    stats: st(2200, 180, 34, 3.4, 2, 8), drops: { echoes: 4000 }, insightOnSight: 2,
  },
  {
    id: 'simon_orne', name: 'Simon Orne', source: 'The Case of Charles Dexter Ward', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'charcoal', scale: 2.1, eyes: 2 },
    ...scripted('caster', phases(ph(1, { projectile: 2, sweep: 1, summon: 1 }, { summons: ['reanimated_corpse'] }), ph(0.4, { projectile_fan: 2, sweep: 1, teleport: 1 }))),
    stats: st(1500, 140, 30, 3.4, 1.5, 6), drops: { echoes: 1600 }, insightOnSight: 1,
  },
  {
    id: 'edward_hutchinson', name: 'Edward Hutchinson', source: 'The Case of Charles Dexter Ward', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'charcoal', scale: 2.2, eyes: 2 },
    ...scripted('caster', phases(ph(1, { projectile: 2, teleport: 1, summon: 1 }, { summons: ['reanimated_corpse'] }), ph(0.4, { projectile_fan: 1, beam: 1, teleport: 2 }))),
    stats: st(1500, 140, 30, 3.4, 1.5, 6), drops: { echoes: 1600 }, insightOnSight: 1,
  },
  {
    id: 'curwen_pit_thing', name: "Thing in Curwen's Pits", source: 'The Case of Charles Dexter Ward', regions: ['providence'], canonLooks: false,
    sprite: { silhouette: 'blob', palette: 'flesh', scale: 2.4, eyes: 3, tentacles: 3 },
    behavior: { archetype: 'stationary_horror', attacks: ['grab', 'tentacle_burst'] },
    stats: st(900, 120, 30, 0, 2.5, 8), drops: { echoes: 900 }, insightOnSight: 1,
  },
  {
    id: 'ephraim_waite', name: 'Ephraim Waite', source: 'The Thing on the Doorstep', regions: ['innsmouth', 'arkham'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'sea', scale: 2, eyes: 2 },
    ...scripted('mind_thief', phases(ph(1, { gaze: 2, projectile: 1, grab: 1 }, { hooks: ['control_swap'] }), ph(0.5, { gaze: 2, grab: 2, projectile_fan: 1 }, { hooks: ['control_swap', 'camera_warp'] }))),
    stats: st(1400, 120, 28, 3.6, 2.5, 9), drops: { echoes: 1800 }, insightOnSight: 1,
    eldritchVariant: { sprite: { palette: 'mold' } },
  },
  {
    id: 'haunter_of_the_dark', name: 'The Haunter of the Dark', source: 'The Haunter of the Dark', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'winged', palette: 'rubber', scale: 4, eyes: 3, wings: 2, glow: 'magenta' },
    ...scripted('boss', phases(ph(1, { dive: 2, grab: 1, darkness: 1 }, { hooks: ['light_dependency'], arena: 'lamps' }), ph(0.5, { dive: 2, grab: 1, darkness: 2, wind_push: 1 }, { hooks: ['light_dependency'] })), { hover: 2 }),
    stats: st(2600, 260, 40, 4.6, 4, 10), weak: ['light'], drops: { echoes: 4000 }, insightOnSight: 2,
  },
  {
    id: 'whisperer', name: "The Whisperer in Akeley's Chair", source: 'The Whisperer in Darkness', regions: ['vermont'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'pallid', scale: 2, eyes: 2 },
    ...scripted('boss', phases(ph(1, { gaze: 2, projectile: 1, summon: 1 }, { summons: ['mi_go'] }), ph(0.5, { gaze: 2, projectile_fan: 1, summon: 1 }, { summons: ['mi_go'], hooks: ['darkness'] })), { mobile: false, range: [0, 30] }),
    stats: st(2000, 200, 32, 1.5, 3, 10), drops: { echoes: 3500 }, insightOnSight: 2,
    eldritchVariant: { sprite: { silhouette: 'crustacean', palette: 'fungus', wings: 2 } },
  },
  {
    id: 'the_hound', name: 'The Hound', source: 'The Hound', regions: ['arkham'], canonLooks: false,
    sprite: { silhouette: 'quadruped', palette: 'bone', scale: 2.4, eyes: 2, wings: 2, glow: 'green' },
    ...scripted('pack_hunter', phases(ph(1, { bite: 2, lunge: 1, charge: 1 }), ph(0.4, { bite: 2, lunge: 2, charge: 1, roar: 1 }))),
    stats: st(1300, 140, 32, 5.4, 2, 8), drops: { echoes: 1500 }, insightOnSight: 1,
  },
  {
    id: 'the_unnamable', name: 'The Unnamable', source: 'The Unnamable', regions: ['arkham'], canonLooks: false,
    sprite: { silhouette: 'blob', palette: 'rubber', scale: 3.2, eyes: 6, tentacles: 5 },
    ...scripted('invisible_stalker', phases(ph(1, { grab: 2, tentacle_burst: 1, roar: 1 }), ph(0.5, { grab: 1, tentacle_burst: 2, roar: 1, charge: 1 }, { hooks: ['camera_warp'] }))),
    stats: st(1600, 160, 34, 4, 4, 12), drops: { echoes: 1800 }, insightOnSight: 2,
  },
  {
    id: 'shunned_house_entity', name: 'The Shunned House Entity', source: 'The Shunned House', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'blob', palette: 'fungus', scale: 3, eyes: 1, glow: 'green' },
    ...scripted('stationary_horror', phases(ph(1, { tentacle_burst: 2, pool: 1, grab: 1 }), ph(0.5, { pool: 2, tentacle_burst: 2, grab: 1 }, { hooks: ['darkness'] }))),
    stats: st(1800, 300, 30, 0, 3, 8), weak: ['fire'], drops: { echoes: 1600 }, insightOnSight: 1,
  },
  {
    id: 'lilith', name: 'Lilith', source: 'The Horror at Red Hook', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'bone', scale: 2.1, eyes: 2, glow: 'magenta' },
    ...scripted('caster', phases(ph(1, { grab: 1, projectile: 2, summon: 1 }, { summons: ['cthulhu_cultist'] }), ph(0.5, { projectile_fan: 2, grab: 1, summon: 1, teleport: 1 }, { summons: ['cthulhu_cultist'] }))),
    stats: st(1700, 160, 32, 3.8, 3, 9), drops: { echoes: 2200 }, insightOnSight: 2,
  },
  {
    id: 'zann_window_thing', name: "The Thing Beyond Erich Zann's Window", source: 'The Music of Erich Zann', regions: ['beyond'], canonLooks: false,
    sprite: { silhouette: 'orb', palette: 'charcoal', scale: 4, eyes: 0, tentacles: 4, glow: 'purple' },
    ...scripted('stationary_horror', phases(ph(1, { wind_push: 2, darkness: 1, roar: 1 }, { hooks: ['darkness'] }), ph(0.5, { wind_push: 2, roar: 2, projectile_fan: 1 }, { hooks: ['darkness', 'camera_warp'] }))),
    stats: st(2000, 1000, 30, 0, 4, 12), resist: ['slash', 'blunt', 'shot'], drops: { echoes: 2000 }, insightOnSight: 2,
  },
  {
    id: 'voice_in_the_tomb', name: 'The Voice in the Tomb', source: 'The Statement of Randolph Carter', regions: ['arkham'], canonLooks: false,
    sprite: { silhouette: 'spectre', palette: 'charcoal', scale: 2.6, eyes: 0 },
    behavior: { archetype: 'stationary_horror', attacks: ['roar', 'grab'] },
    stats: st(1000, 1000, 26, 0, 3, 10), drops: { echoes: 1000 }, insightOnSight: 1,
  },
  {
    id: 'high_priest', name: 'High Priest Not to Be Described', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'sand', scale: 2.4, eyes: 0 },
    ...scripted('boss', phases(
      ph(1, { projectile: 2, teleport: 1, summon: 1, gaze: 1 }, { summons: ['man_of_leng'] }),
      ph(0.5, { gaze: 2, projectile_fan: 1, teleport: 1, summon: 1 }, { summons: ['man_of_leng'], hooks: ['camera_warp'] }),
      ph(0.2, { beam: 2, gaze: 2, teleport: 1 }, { hooks: ['darkness'] }),
    ), { range: [5, 12], strafe: 0.3 }),
    stats: st(2400, 220, 36, 3, 3, 10), drops: { echoes: 3500 }, insightOnSight: 2,
    eldritchVariant: { sprite: { silhouette: 'blob', tentacles: 6 } },
  },
  {
    id: 'colossus_pyramids', name: 'The Colossus Beneath the Pyramids', source: 'Under the Pyramids', regions: ['pnakotus'], canonLooks: true,
    assembly: { body: 'lathe', palette: 'sand', scale: 14, tentacles: 5, eyes: 10 },
    ...scripted('boss', phases(ph(1, { slam: 2, grab: 1, charge: 1 }), ph(0.5, { slam: 2, bite: 2, charge: 1, aoe_ring: 1 }, { hooks: ['darkness'] }))),
    stats: st(4200, 600, 60, 2.4, 4, 10), drops: { echoes: 5000 }, insightOnSight: 2,
  },
  {
    id: 'martins_beach_horror', name: "The Horror at Martin's Beach", source: "The Horror at Martin's Beach", regions: ['innsmouth'], canonLooks: true,
    sprite: { silhouette: 'serpent', palette: 'sea', scale: 7, eyes: 2 },
    ...scripted('mind_thief', phases(ph(1, { gaze: 2, grab: 1, tentacle_burst: 1 }, { hooks: ['flood'] }), ph(0.5, { gaze: 3, grab: 1, wind_push: 1 }, { hooks: ['flood', 'camera_warp'] }))),
    stats: st(3000, 400, 44, 2, 3, 10), drops: { echoes: 3000 }, insightOnSight: 2,
  },
  {
    id: 'dr_munoz', name: 'Dr. Muñoz', source: 'Cool Air', regions: ['hub'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'pallid', scale: 2, eyes: 2 },
    ...scripted('caster', phases(ph(1, { projectile: 2, grab: 1 }), ph(0.5, { grab: 2, pool: 1, projectile: 1 }))),
    stats: st(900, 80, 22, 2.6, 2, 6), weak: ['fire'], drops: { echoes: 800 }, insightOnSight: 1,
  },
  {
    id: 'charles_le_sorcier', name: 'Charles le Sorcier', source: 'The Alchemist', regions: ['hub'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'charcoal', scale: 2.1, eyes: 2, glow: 'magenta' },
    ...scripted('caster', phases(ph(1, { projectile: 2, teleport: 1 }), ph(0.5, { projectile_fan: 2, teleport: 1, pool: 1 }))),
    stats: st(1300, 120, 28, 3.4, 2, 7), drops: { echoes: 1400 }, insightOnSight: 1,
  },
  {
    id: 'medusa_gorgon', name: "The Gorgon of Medusa's Coil", source: "Medusa's Coil", regions: ['dunwich'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'charcoal', scale: 2.1, eyes: 2, tentacles: 10 },
    ...scripted('mind_thief', phases(ph(1, { grab: 1, gaze: 2, lunge: 1 }), ph(0.5, { gaze: 2, grab: 2, tentacle_burst: 1 }))),
    stats: st(1900, 160, 34, 4, 3, 10), drops: { echoes: 2400 }, insightOnSight: 2,
  },
  {
    id: 'hypnos', name: 'Hypnos', source: 'Hypnos', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'bone', scale: 2.3, eyes: 2, glow: 'purple' },
    ...scripted('mind_thief', phases(ph(1, { gaze: 2, teleport: 1, roar: 1 }, { hooks: ['time_skip'] }), ph(0.5, { gaze: 2, beam: 1, teleport: 1 }, { hooks: ['time_skip', 'camera_warp'] }))),
    stats: st(1500, 140, 30, 3.4, 3, 10), drops: { echoes: 2000 }, insightOnSight: 2,
  },
  {
    id: 'the_outsider', name: 'The Outsider', source: 'The Outsider', regions: ['hub'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'mold', scale: 2, eyes: 2 },
    ...scripted('brute', phases(ph(1, { grab: 1, sweep: 2, roar: 1 }), ph(0.4, { grab: 2, sweep: 1, charge: 1, roar: 1 }))),
    stats: st(1200, 120, 28, 3, 3, 10), drops: { echoes: 1200 }, insightOnSight: 1,
  },
  {
    id: 'terrible_old_man', name: 'The Terrible Old Man', source: 'The Terrible Old Man', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'bone', scale: 1.8, eyes: 2 },
    ...scripted('caster', phases(ph(1, { summon: 2, projectile: 1 }, { summons: ['moon_bog_wraith'] }), ph(0.5, { summon: 1, projectile_fan: 1, teleport: 1 }, { summons: ['moon_bog_wraith'] }))),
    stats: st(1000, 80, 24, 2.4, 1.5, 6), drops: { echoes: 1500 }, insightOnSight: 1,
  },
  {
    id: 'zkauba', name: 'Zkauba the Wizard', source: 'Through the Gates of the Silver Key', regions: ['beyond'], canonLooks: true,
    sprite: { silhouette: 'hunched', palette: 'stone', scale: 2.6, eyes: 2, glow: 'purple' },
    ...scripted('caster', phases(ph(1, { projectile: 2, beam: 1, teleport: 1 }), ph(0.5, { beam: 2, projectile_fan: 1, teleport: 1 }, { hooks: ['arena_reconnect'] }))),
    stats: st(1800, 160, 32, 3.4, 2.5, 9), drops: { echoes: 2200 }, insightOnSight: 2,
  },
]);
