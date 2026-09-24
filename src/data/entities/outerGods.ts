/**
 * Outer Gods (spec §4): the court of Azathoth and the powers beyond the Gate. Each fights by a phase
 * script (spec §3E); the region's four have signature mechanics (systems/signatures/): Shub-Niggurath's
 * spawning roots, Yog-Sothoth's sphere gates, Nyarlathotep's avatars and borrowed movesets, and
 * blind Azathoth, outlasted rather than slain. 'Umr at-Tawil yields, offering one of the endings.
 */

import { ph, phases, scripted, st, tier } from './kit';

export const OUTER_GODS = tier('outer_god', [
  {
    id: 'azathoth', name: 'Azathoth', source: 'The Dream-Quest of Unknown Kadath', regions: ['beyond'], canonLooks: false, voice: 'pipes',
    assembly: { body: 'mound', palette: 'charcoal', scale: 30, tentacles: 12, eyes: 0, glow: 'purple' },
    ...scripted('boss', phases(
      ph(1, { roar: 2, darkness: 1, summon: 1 }, { summons: ['daemon_pipers'], hooks: ['darkness'] }),
      ph(0.66, { roar: 2, darkness: 1, summon: 1 }, { summons: ['daemon_pipers', 'other_gods'], hooks: ['darkness', 'camera_warp'] }),
      ph(0.33, { roar: 3, darkness: 1, summon: 1 }, { summons: ['other_gods'], hooks: ['darkness', 'camera_warp', 'arena_reconnect'] }),
    ), { mobile: false, range: [0, 60], aggro: 0, fov: 0 }),
    stats: st(20000, 5000, 150, 0.5, 10, 30), drops: { echoes: 50000 }, insightOnSight: 5,
  },
  {
    id: 'daemon_pipers', name: 'The Daemon Pipers', source: 'The Dream-Quest of Unknown Kadath', regions: ['beyond'], canonLooks: false, voice: 'pipes',
    sprite: { silhouette: 'spectre', palette: 'charcoal', scale: 2.8, eyes: 0, glow: 'purple' },
    ...scripted('caster', phases(ph(1, { roar: 2, projectile: 1 }), ph(0.5, { roar: 1, projectile_fan: 2, darkness: 1 }, { hooks: ['camera_warp'] }))),
    stats: st(3000, 300, 40, 2, 6, 14), drops: { echoes: 4000 }, insightOnSight: 4,
  },
  {
    id: 'other_gods', name: 'The Other Gods', source: 'The Other Gods', regions: ['beyond', 'dreamlands'], canonLooks: false,
    sprite: { silhouette: 'spectre', palette: 'pallid', scale: 6, eyes: 0, tentacles: 4, glow: 'magenta' },
    ...scripted('brute', phases(ph(1, { slam: 2, roar: 1, aoe_ring: 1 }), ph(0.5, { slam: 2, charge: 1, aoe_ring: 1, roar: 1 }, { hooks: ['darkness'] }))),
    stats: st(5000, 800, 60, 2.6, 7, 16), drops: { echoes: 6000 }, insightOnSight: 4,
  },
  {
    id: 'yog_sothoth', name: 'Yog-Sothoth', source: 'The Dunwich Horror', regions: ['beyond'], canonLooks: true,
    assembly: { body: 'spheres', palette: 'pallid', scale: 20, spheres: 14, glow: 'green' },
    ...scripted('boss', phases(
      ph(1, { beam: 2, teleport: 1, aoe_ring: 1 }, { hooks: ['arena_reconnect'], arena: 'spheres' }),
      ph(0.6, { beam: 2, projectile_fan: 1, teleport: 1, summon: 1 }, { summons: ['dhole'], hooks: ['arena_reconnect', 'camera_warp'] }),
      ph(0.25, { beam: 3, aoe_ring: 1, teleport: 1 }, { hooks: ['arena_reconnect', 'camera_warp', 'time_skip'] }),
    ), { mobile: false, range: [0, 40] }),
    stats: st(18000, 5000, 120, 1, 10, 25), drops: { echoes: 40000 }, insightOnSight: 5,
  },
  {
    id: 'umr_at_tawil', name: "'Umr at-Tawil", source: 'Through the Gates of the Silver Key', regions: ['beyond'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'charcoal', scale: 4, eyes: 0, glow: 'purple' },
    ...scripted('boss', phases(
      ph(1, { gaze: 2, teleport: 1, beam: 1 }, { hooks: ['time_skip'] }),
      ph(0.6, { gaze: 2, beam: 2, teleport: 1, summon: 1 }, { summons: ['ancient_ones'], hooks: ['time_skip', 'hidden_platforms'] }),
      ph(0.25, { teleport: 1 }), // it yields
    ), { range: [4, 14] }),
    stats: st(10000, 2000, 80, 3, 8, 18), drops: { echoes: 25000 }, insightOnSight: 5,
  },
  {
    id: 'ancient_ones', name: 'The Ancient Ones', source: 'Through the Gates of the Silver Key', regions: ['beyond'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'pallid', scale: 3.2, eyes: 0 },
    ...scripted('stationary_horror', phases(ph(1, { gaze: 2, roar: 1 }), ph(0.5, { gaze: 2, roar: 1, beam: 1 }, { hooks: ['time_skip'] }))),
    stats: st(4000, 1000, 50, 0, 6, 14), drops: { echoes: 5000 }, insightOnSight: 4,
  },
  {
    id: 'shub_niggurath', name: 'Shub-Niggurath', source: 'The Whisperer in Darkness', regions: ['dunwich'], canonLooks: false,
    assembly: { body: 'mound', palette: 'rubber', scale: 18, tentacles: 12, eyes: 8 },
    ...scripted('boss', phases(
      ph(1, { tentacle_burst: 2, charge: 1, pool: 1, summon: 1 }, { summons: ['thousand_young'], arena: 'roots' }),
      ph(0.5, { tentacle_burst: 2, pool: 2, charge: 1, summon: 1, roar: 1 }, { summons: ['thousand_young'], hooks: ['darkness'] }),
    )),
    stats: st(16000, 3000, 100, 1.2, 9, 20), drops: { echoes: 30000 }, insightOnSight: 5,
  },
  {
    id: 'nyarlathotep', name: 'Nyarlathotep', source: 'Nyarlathotep', regions: ['dreamlands', 'beyond'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'sand', scale: 2.6, eyes: 2, glow: 'purple' },
    ...scripted('boss', phases(
      ph(1, { projectile: 2, teleport: 1, summon: 1, beam: 1 }, { summons: ['night_gaunt'], hooks: ['decoys'] }),
      ph(0.6, { projectile_fan: 2, beam: 2, teleport: 1, gaze: 1 }, { hooks: ['decoys', 'camera_warp'] }),
      ph(0.3, { tentacle_burst: 2, grab: 1, roar: 1 }, { hooks: ['darkness', 'camera_warp'] }), // the Crawling Chaos: it borrows the slain bosses' attacks too
    ), { range: [3, 10], strafe: 0.4 }),
    stats: st(15000, 3000, 100, 3.4, 8, 20), drops: { echoes: 35000 }, insightOnSight: 5,
    eldritchVariant: { name: 'Nyarlathotep, the Crawling Chaos', sprite: { silhouette: 'blob', palette: 'ichor', scale: 6, tentacles: 10, eyes: 1 } },
  },
]);
