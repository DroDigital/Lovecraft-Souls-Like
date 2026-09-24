/** Outer Gods (spec §4): the court of Azathoth and the powers beyond the Gate. Scripts are one-phase stubs. */

import { boss, st, tier } from './kit';

export const OUTER_GODS = tier('outer_god', [
  {
    id: 'azathoth', name: 'Azathoth', source: 'The Dream-Quest of Unknown Kadath', regions: ['beyond'], canonLooks: false,
    assembly: { body: 'mound', palette: 'charcoal', scale: 30, tentacles: 12, eyes: 0, glow: 'purple' },
    ...boss(['darkness', 'roar', 'aoe_ring', 'wind_push'], { summons: ['daemon_pipers', 'other_gods'], hooks: ['darkness'] }, { mobile: false, range: [0, 60] }),
    stats: st(20000, 5000, 150, 0.5, 10, 30), drops: { echoes: 50000 }, insightOnSight: 5,
  },
  {
    id: 'daemon_pipers', name: 'The Daemon Pipers', source: 'The Dream-Quest of Unknown Kadath', regions: ['beyond'], canonLooks: false,
    sprite: { silhouette: 'spectre', palette: 'charcoal', scale: 2.8, eyes: 0, glow: 'purple' },
    behavior: { archetype: 'caster', attacks: ['roar', 'projectile'] },
    stats: st(3000, 300, 40, 2, 6, 14), drops: { echoes: 4000 }, insightOnSight: 4,
  },
  {
    id: 'other_gods', name: 'The Other Gods', source: 'The Other Gods', regions: ['beyond', 'dreamlands'], canonLooks: false,
    sprite: { silhouette: 'spectre', palette: 'pallid', scale: 6, eyes: 0, tentacles: 4, glow: 'magenta' },
    behavior: { archetype: 'brute', attacks: ['slam', 'roar', 'aoe_ring'] },
    stats: st(5000, 800, 60, 2.6, 7, 16), drops: { echoes: 6000 }, insightOnSight: 4,
  },
  {
    id: 'yog_sothoth', name: 'Yog-Sothoth', source: 'The Dunwich Horror', regions: ['beyond'], canonLooks: true,
    assembly: { body: 'spheres', palette: 'pallid', scale: 20, spheres: 14, glow: 'green' },
    ...boss(['beam', 'teleport', 'aoe_ring', 'summon'], { summons: ['dhole'], hooks: ['arena_reconnect'] }, { mobile: false, range: [0, 40] }),
    stats: st(18000, 5000, 120, 1, 10, 25), drops: { echoes: 40000 }, insightOnSight: 5,
  },
  {
    id: 'umr_at_tawil', name: "'Umr at-Tawil", source: 'Through the Gates of the Silver Key', regions: ['beyond'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'charcoal', scale: 4, eyes: 0, glow: 'purple' },
    ...boss(['gaze', 'teleport', 'beam'], { summons: ['ancient_ones'], hooks: ['time_skip'] }, { range: [4, 14] }),
    stats: st(10000, 2000, 80, 3, 8, 18), drops: { echoes: 25000 }, insightOnSight: 5,
  },
  {
    id: 'ancient_ones', name: 'The Ancient Ones', source: 'Through the Gates of the Silver Key', regions: ['beyond'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'pallid', scale: 3.2, eyes: 0 },
    behavior: { archetype: 'stationary_horror', attacks: ['gaze', 'roar'] },
    stats: st(4000, 1000, 50, 0, 6, 14), drops: { echoes: 5000 }, insightOnSight: 4,
  },
  {
    id: 'shub_niggurath', name: 'Shub-Niggurath', source: 'The Whisperer in Darkness', regions: ['dunwich'], canonLooks: false,
    assembly: { body: 'mound', palette: 'rubber', scale: 18, tentacles: 12, eyes: 8 },
    ...boss(['tentacle_burst', 'charge', 'summon', 'pool'], { summons: ['thousand_young'] }),
    stats: st(16000, 3000, 100, 1.2, 9, 20), drops: { echoes: 30000 }, insightOnSight: 5,
  },
  {
    id: 'nyarlathotep', name: 'Nyarlathotep', source: 'Nyarlathotep', regions: ['dreamlands', 'beyond'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'sand', scale: 2.6, eyes: 2, glow: 'purple' },
    ...boss(['projectile', 'teleport', 'summon', 'beam'], { summons: ['night_gaunt'], hooks: ['decoys'] }, { range: [3, 10], strafe: 0.4 }),
    stats: st(15000, 3000, 100, 3.4, 8, 20), drops: { echoes: 35000 }, insightOnSight: 5,
    eldritchVariant: { name: 'Nyarlathotep, the Crawling Chaos', sprite: { silhouette: 'blob', palette: 'ichor', scale: 6, tentacles: 10, eyes: 1 } },
  },
]);
