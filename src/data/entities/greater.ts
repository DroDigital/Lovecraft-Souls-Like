/** Greater tier (spec §4): servitor races and elder species. First sight of one costs sanity (Phase 3). */

import { ph, phases, st, tier } from './kit';

export const GREATER = tier('greater', [
  {
    id: 'mi_go', name: 'Mi-Go', source: 'The Whisperer in Darkness', regions: ['vermont', 'yuggoth'], canonLooks: true, voice: 'buzz',
    sprite: { silhouette: 'crustacean', palette: 'fungus', scale: 2.6, eyes: 0, wings: 2, limbs: 6 },
    behavior: { archetype: 'hover_ranged', attacks: ['projectile', 'grab', 'beam'] },
    stats: st(420, 60, 24, 4, 1, 5), resist: ['shot'], drops: { echoes: 450 }, insightOnSight: 0,
    eldritchVariant: { sprite: { glow: 'purple' } },
  },
  {
    id: 'elder_thing', name: 'Elder Thing', source: 'At the Mountains of Madness', regions: ['mountains'], canonLooks: true, voice: 'piping',
    sprite: { silhouette: 'barrel', palette: 'sea', scale: 2.8, eyes: 5, tentacles: 5, wings: 2 },
    behavior: { archetype: 'skirmisher', attacks: ['tentacle_burst', 'sweep', 'projectile'] },
    stats: st(520, 80, 26, 3.4, 1.2, 5), resist: ['blunt'], drops: { echoes: 500 }, insightOnSight: 0,
  },
  {
    id: 'shoggoth', name: 'Shoggoth', source: 'At the Mountains of Madness', regions: ['mountains'], canonLooks: true, voice: 'tekeli',
    sprite: { silhouette: 'blob', palette: 'ichor', scale: 4.2, eyes: 12, glow: 'green' },
    behavior: { archetype: 'brute', attacks: ['tentacle_burst', 'grab', 'slam', 'aoe_ring'] },
    stats: st(900, 160, 36, 3.6, 2, 8), resist: ['slash', 'shot'], weak: ['fire'], drops: { echoes: 900 }, insightOnSight: 0,
    bossVariant: {
      name: 'Elder Shoggoth', sprite: { scale: 9, eyes: 16 }, stats: { hp: 5200, poise: 900, damage: 60 },
      drops: { echoes: 8000 }, insightOnSight: 2, behavior: { archetype: 'boss' },
      bossScript: phases(ph(1, { tentacle_burst: 2, grab: 1, slam: 1, aoe_ring: 1, vortex: 1 }, { hooks: ['darkness'] }), ph(0.5, { tentacle_burst: 2, charge: 2, aoe_ring: 1, roar: 1, quake: 1 }, { hooks: ['darkness'] })),
    },
  },
  {
    id: 'star_spawn', name: 'Star-spawn of Cthulhu', source: 'At the Mountains of Madness', regions: ['rlyeh'], canonLooks: true,
    sprite: { silhouette: 'cephalopod', palette: 'sea', scale: 4.4, eyes: 2, tentacles: 6, wings: 2 },
    behavior: { archetype: 'brute', attacks: ['tentacle_burst', 'slam', 'grab'] },
    stats: st(1000, 150, 40, 3, 2.5, 8), drops: { echoes: 1000 }, insightOnSight: 0,
  },
  {
    id: 'yithian', name: 'Yithian', source: 'The Shadow out of Time', regions: ['pnakotus'], canonLooks: true,
    sprite: { silhouette: 'cone', palette: 'bone', scale: 3.4, eyes: 3 },
    behavior: { archetype: 'caster', attacks: ['projectile', 'beam', 'sweep'] },
    stats: st(600, 90, 28, 2.6, 1, 4), drops: { echoes: 600 }, insightOnSight: 0,
  },
  {
    id: 'flying_polyp', name: 'Flying Polyp', source: 'The Shadow out of Time', regions: ['pnakotus'], canonLooks: true, voice: 'whistle',
    sprite: { silhouette: 'blob', palette: 'ichor', scale: 3.6, eyes: 0, tentacles: 8 },
    behavior: { archetype: 'invisible_stalker', attacks: ['wind_push', 'grab', 'tentacle_burst'] },
    stats: st(800, 120, 32, 5, 2, 6), resist: ['slash', 'blunt', 'shot'], weak: ['light'], drops: { echoes: 800 }, insightOnSight: 0,
    bossVariant: {
      name: 'Polyp Swarm', sprite: { scale: 8, tentacles: 14 }, stats: { hp: 5000, poise: 800, damage: 55 },
      drops: { echoes: 8000 }, insightOnSight: 2, behavior: { archetype: 'boss' },
      bossScript: phases(ph(1, { wind_push: 2, grab: 1, tentacle_burst: 1, vortex: 1 }, { hooks: ['decoys'] }), ph(0.5, { wind_push: 2, aoe_ring: 1, tentacle_burst: 1, grab: 1, barrage: 1 }, { hooks: ['decoys', 'control_swap'] })),
    },
  },
  {
    id: 'gug', name: 'Gug', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'giant', palette: 'charcoal', scale: 6, eyes: 2, limbs: 4 },
    behavior: { archetype: 'brute', attacks: ['slam', 'grab', 'sweep'] },
    stats: st(1100, 200, 44, 3, 1.5, 5), drops: { echoes: 900 }, insightOnSight: 0,
  },
  {
    id: 'dhole', name: 'Dhole', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands', 'beyond'], canonLooks: true,
    sprite: { silhouette: 'serpent', palette: 'pallid', scale: 6, eyes: 0 },
    behavior: { archetype: 'burrower', attacks: ['bite', 'slam', 'spit'] },
    stats: st(1200, 220, 46, 3.4, 2, 6), drops: { echoes: 1000 }, insightOnSight: 0,
  },
  {
    id: 'shantak', name: 'Shantak', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'winged', palette: 'stone', scale: 4.6, eyes: 2, wings: 2 },
    behavior: { archetype: 'flyer_swoop', attacks: ['dive', 'bite', 'charge'] },
    stats: st(500, 90, 26, 6, 1, 4), weak: ['light'], drops: { echoes: 500 }, insightOnSight: 0,
  },
  {
    id: 'formless_spawn', name: 'Formless Spawn of Tsathoggua', source: 'The Mound', regions: ['kn_yan'], canonLooks: true,
    sprite: { silhouette: 'blob', palette: 'ichor', scale: 3, eyes: 0, tentacles: 4 },
    behavior: { archetype: 'ambusher', attacks: ['tentacle_burst', 'grab', 'spit'] },
    stats: st(700, 100, 30, 3, 2, 6), resist: ['slash', 'blunt'], weak: ['fire'], drops: { echoes: 700 }, insightOnSight: 0,
  },
  {
    id: 'yekubian', name: 'Yekubian', source: 'The Challenge from Beyond', regions: ['beyond'], canonLooks: true,
    sprite: { silhouette: 'serpent', palette: 'pallid', scale: 3.6, eyes: 1, limbs: 10, glow: 'purple' },
    behavior: { archetype: 'mind_thief', attacks: ['projectile', 'gaze', 'grab'] },
    stats: st(650, 80, 26, 3, 2, 8), drops: { echoes: 650 }, insightOnSight: 0,
  },
  {
    id: 'being_from_beyond', name: 'Being from Beyond', source: 'From Beyond', regions: ['providence', 'hub'], canonLooks: true,
    sprite: { silhouette: 'orb', palette: 'pallid', scale: 2.8, eyes: 0, tentacles: 6, glow: 'purple' },
    behavior: { archetype: 'invisible_stalker', attacks: ['grab', 'tentacle_burst'] },
    stats: st(400, 40, 22, 4, 3, 8), resist: ['blunt', 'shot'], drops: { echoes: 400 }, insightOnSight: 0,
    hidden: { maxSanity: 15 },
  },
  {
    id: 'thousand_young', name: 'Thousand Young of Shub-Niggurath', source: 'The Whisperer in Darkness', regions: ['dunwich'], canonLooks: false,
    sprite: { silhouette: 'quadruped', palette: 'rubber', scale: 3.2, eyes: 6, limbs: 8, tentacles: 4 },
    behavior: { archetype: 'pack_hunter', attacks: ['charge', 'bite', 'tentacle_burst'] },
    stats: st(600, 90, 28, 4.4, 1.5, 5), weak: ['fire'], drops: { echoes: 550 }, insightOnSight: 0,
  },
]);
