/** Allies (spec §4): non-hostile by default; they follow the player and fight what threatens them. */

import { st, tier } from './kit';

export const ALLIES = tier('ally', [
  {
    id: 'nodens', name: 'Nodens', source: 'The Strange High House in the Mist', regions: ['dreamlands', 'providence'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'bone', scale: 3.2, eyes: 2 },
    behavior: { archetype: 'ally', attacks: ['slam', 'beam', 'wind_push'] },
    stats: st(6000, 1000, 70, 3, 0, 0), drops: { echoes: 0 }, insightOnSight: 2,
  },
  {
    id: 'tritons', name: "Tritons of Nodens' Court", source: 'The Strange High House in the Mist', regions: ['providence'], canonLooks: true,
    sprite: { silhouette: 'humanoid', palette: 'sea', scale: 2.2, eyes: 2 },
    behavior: { archetype: 'ally', attacks: ['sweep', 'projectile'] },
    stats: st(400, 60, 22, 3.6, 0, 0), drops: { echoes: 0 }, insightOnSight: 0,
  },
  {
    id: 'cats_of_ulthar', name: 'Cats of Ulthar', source: 'The Cats of Ulthar', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'quadruped', palette: 'sand', scale: 1, eyes: 2 },
    behavior: { archetype: 'ally', params: { range: [0, 1.4] }, attacks: ['bite', 'lunge'] },
    stats: st(300, 20, 14, 5.5, 0, 0), drops: { echoes: 0 }, insightOnSight: 0,
  },
  {
    id: 'pickman', name: 'Richard Upton Pickman', source: "Pickman's Model", regions: ['dreamlands', 'providence'], canonLooks: true,
    sprite: { silhouette: 'hunched', palette: 'mold', scale: 2.2, eyes: 2 },
    behavior: { archetype: 'ally', attacks: ['bite', 'sweep'] },
    stats: st(900, 80, 26, 4, 0, 0), drops: { echoes: 0 }, insightOnSight: 1,
  },
  {
    id: 'nasht_kaman_thah', name: 'Nasht & Kaman-Thah', source: 'The Dream-Quest of Unknown Kadath', regions: ['dreamlands'], canonLooks: true,
    sprite: { silhouette: 'robed', palette: 'bone', scale: 2.4, eyes: 2 },
    behavior: { archetype: 'ally', params: { range: [5, 10] }, attacks: ['projectile', 'teleport'] },
    stats: st(1200, 120, 26, 2.6, 0, 0), drops: { echoes: 0 }, insightOnSight: 1,
  },
  {
    id: 'algol_light_being', name: 'The Light-Being from Algol', source: 'Beyond the Wall of Sleep', regions: ['hub'], canonLooks: false,
    sprite: { silhouette: 'orb', palette: 'bone', scale: 2.6, eyes: 0, glow: 'green' },
    behavior: { archetype: 'ally', params: { range: [4, 9], hover: 1.5 }, attacks: ['beam', 'projectile'] },
    stats: st(2000, 1000, 50, 4, 0, 0), drops: { echoes: 0 }, insightOnSight: 2,
  },
  {
    id: 'yithian_archivist', name: 'Yithian Archivist', source: 'The Shadow out of Time', regions: ['pnakotus'], canonLooks: true,
    sprite: { silhouette: 'cone', palette: 'bone', scale: 3.4, eyes: 3 },
    behavior: { archetype: 'ally', params: { range: [4, 9] }, attacks: ['projectile', 'sweep'] },
    stats: st(700, 90, 24, 2.6, 0, 0), drops: { echoes: 0 }, insightOnSight: 1,
  },
]);
