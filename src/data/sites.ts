/**
 * Where things stand in each region (spec §3D), in metres from the region's south-west corner:
 * Elder Signs (checkpoints), boss arenas (region bosses and the optional bosses scattered through
 * the open world), ally locations, gates between the waking world and the realms beyond, tomes,
 * and each legacy dungeon's front door. Rooms inside dungeons carry their own (dungeons.ts).
 */

import type { Dir } from './dungeons';

export type At = readonly [x: number, z: number];

export interface SignSite {
  id: string;
  name: string;
  at: At;
  face: Dir; // the carved face looks this way; the investigator rises in front of it
  dream?: boolean; // resting here descends into the Dreamlands
}

export interface ArenaSite {
  bosses: readonly string[];
  variant?: 'boss';
  at: At;
  radius: number; // the ring of stones
  well?: boolean; // a well at its heart
}

export interface AllySite {
  id: string;
  at: At;
}

export interface GateSite {
  id: string;
  name: string;
  to: string; // the gate it opens onto
  at: At;
  face: Dir;
}

export interface TomeSite {
  name: string;
  insight: number;
  at: At;
}

export interface DungeonSite {
  id: string;
  at: At; // the middle of the entrance's outer doorway (dungeons.ts gives the side)
}

export interface RegionSites {
  signs: readonly SignSite[];
  arenas: readonly ArenaSite[];
  allies: readonly AllySite[];
  gates: readonly GateSite[];
  tomes: readonly TomeSite[];
  dungeons: readonly DungeonSite[];
}

/** Where a new investigator wakes, and the dungeon a dreamer descends into from the Sleeper's Sign. */
export const START_SIGN = 'hub_quad';
export const DREAM_DESCENT = 'slumber';

const sign = (id: string, name: string, x: number, z: number, face: Dir, dream?: boolean): SignSite => ({ id, name, at: [x, z], face, ...(dream && { dream }) });
const arena = (bosses: readonly string[], x: number, z: number, radius: number, extra: Partial<ArenaSite> = {}): ArenaSite => ({ bosses, at: [x, z], radius, ...extra });
const lair = (id: string, x: number, z: number, radius = 10): ArenaSite => arena([id], x, z, radius);
const ally = (id: string, x: number, z: number): AllySite => ({ id, at: [x, z] });
const gate = (id: string, name: string, to: string, x: number, z: number, face: Dir): GateSite => ({ id, name, to, at: [x, z], face });
const tome = (name: string, insight: number, x: number, z: number): TomeSite => ({ name, insight, at: [x, z] });
const dungeon = (id: string, x: number, z: number): DungeonSite => ({ id, at: [x, z] });

const none = { arenas: [], allies: [], gates: [], tomes: [] } as const;

export const SITES: Readonly<Record<string, RegionSites>> = {
  hub: {
    signs: [sign('hub_quad', 'Miskatonic Quad', 128, 110, 'n'), sign('hub_dream', "The Sleeper's Sign", 40, 216, 'e', true)],
    arenas: [lair('dr_munoz', 210, 130), lair('charles_le_sorcier', 46, 130), lair('the_outsider', 128, 40)],
    allies: [ally('algol_light_being', 210, 210)],
    gates: [
      gate('hub_antarctic', 'Miskatonic Antarctic Expedition', 'mountains_gate', 40, 40, 'n'),
      gate('hub_australia', 'Miskatonic Australian Expedition', 'pnakotus_gate', 216, 40, 'n'),
    ],
    tomes: [],
    dungeons: [dungeon('library', 128, 148)],
  },
  arkham: {
    signs: [sign('arkham_streets', 'Arkham Streets', 224, 128, 'w'), sign('arkham_heath', 'Blasted Heath', 120, 92, 'w')],
    arenas: [
      arena(['colour_out_of_space'], 70, 70, 24, { well: true }),
      lair('black_man', 200, 40), lair('the_hound', 40, 200), lair('the_unnamable', 70, 150), lair('voice_in_the_tomb', 200, 232),
    ],
    allies: [],
    gates: [],
    tomes: [],
    dungeons: [dungeon('witch_house', 160, 170)],
  },
  providence: {
    signs: [sign('prov_benefit', 'Benefit Street', 32, 128, 'e'), sign('prov_kingsport', 'Kingsport Cliffs', 228, 60, 'w')],
    arenas: [
      lair('shunned_house_entity', 40, 200), lair('lilith', 110, 214), lair('terrible_old_man', 236, 112),
      lair('simon_orne', 150, 70), lair('edward_hutchinson', 32, 40),
    ],
    allies: [ally('nodens', 236, 24), ally('tritons', 208, 20)],
    gates: [],
    tomes: [tome('Cultes des Goules', 1, 64, 160)],
    dungeons: [dungeon('curwen_catacombs', 100, 100), dungeon('starry_wisdom', 170, 130)],
  },
  dunwich: {
    signs: [sign('dunwich_village', 'Dunwich Village', 220, 30, 'n'), sign('dunwich_hills', 'The Round Hills', 60, 124, 'n')],
    arenas: [arena(['shub_niggurath'], 60, 200, 32), lair('wilbur_whateley', 40, 50), lair('medusa_gorgon', 204, 140)],
    allies: [],
    gates: [gate('dunwich_mound', "The Mound (to K'n-yan)", 'knyan_gate', 220, 210, 'w')],
    tomes: [tome('Unaussprechlichen Kulten', 1, 72, 32)],
    dungeons: [dungeon('sentinel_hill', 140, 60)],
  },
  vermont: {
    signs: [sign('vermont_road', 'Akeley Farm Road', 128, 24, 'n'), sign('vermont_dark', 'Dark Mountain', 80, 200, 'e')],
    ...none,
    gates: [gate('vermont_cylinder', 'Brain Cylinder (to Yuggoth)', 'yuggoth_gate', 200, 220, 's')],
    dungeons: [dungeon('akeley', 160, 80)],
  },
  innsmouth: {
    signs: [sign('innsmouth_square', 'Innsmouth Square', 40, 40, 'e'), sign('innsmouth_reef', 'Devil Reef', 224, 112, 'w')],
    arenas: [arena(['martins_beach_horror'], 220, 40, 16), lair('ephraim_waite', 60, 200)],
    allies: [],
    gates: [gate('innsmouth_alert', "The Alert (to R'lyeh)", 'rlyeh_gate', 230, 230, 's')],
    tomes: [],
    dungeons: [dungeon('yhanthlei', 200, 128)],
  },
  mountains: {
    signs: [sign('mountains_camp', "Lake's Camp", 128, 30, 'n')],
    ...none,
    gates: [gate('mountains_gate', 'Expedition Sledges (to Miskatonic)', 'hub_antarctic', 96, 20, 'n')],
    dungeons: [dungeon('elder_city', 128, 70)],
  },
  pnakotus: {
    signs: [sign('pnakotus_camp', 'Great Sandy Desert Camp', 220, 40, 'n')],
    arenas: [arena(['colossus_pyramids'], 80, 210, 26)],
    allies: [],
    gates: [gate('pnakotus_gate', 'Expedition Crates (to Miskatonic)', 'hub_australia', 236, 18, 'n')],
    tomes: [],
    dungeons: [dungeon('archives', 180, 128)],
  },
  kn_yan: {
    signs: [sign('knyan_depths', "The Mound's Depths", 128, 30, 'n'), sign('knyan_serpents', 'Serpent Temple', 50, 164, 'n')],
    arenas: [arena(['yig'], 50, 204, 20), arena(['nug', 'yeb'], 204, 204, 24)],
    allies: [],
    gates: [gate('knyan_gate', 'The Mound (to Dunwich)', 'dunwich_mound', 160, 18, 'n')],
    tomes: [],
    dungeons: [dungeon('tsath', 128, 70)],
  },
  dreamlands: {
    signs: [
      sign('dream_wood', 'Enchanted Wood', 164, 72, 'n'), sign('dream_sarnath', 'Shores of Ib', 380, 360, 'e'),
      sign('dream_hatheg', 'Slopes of Hatheg-Kla', 400, 90, 'n'),
    ],
    arenas: [arena(['bokrug'], 420, 400, 24), lair('hypnos', 100, 180), lair('other_gods', 430, 130, 14)],
    allies: [],
    gates: [gate('dream_wood_gate', 'The Enchanted Wood (to the Stairs of Slumber)', 'dream_deeper', 136, 60, 'n')],
    tomes: [tome('Seven Cryptical Books of Hsan', 1, 300, 320)],
    dungeons: [dungeon('slumber', 60, 300), dungeon('ulthar_kadath', 200, 150)],
  },
  rlyeh: {
    signs: [sign('rlyeh_deck', "The Alert's Deck", 44, 30, 'n'), sign('rlyeh_door', 'The Great Door', 176, 100, 'n')],
    arenas: [arena(['cthulhu'], 176, 168, 48)],
    allies: [],
    gates: [gate('rlyeh_gate', 'The Alert (to Innsmouth)', 'innsmouth_alert', 20, 20, 'n')],
    tomes: [],
    dungeons: [dungeon('risen_rlyeh', 60, 60)],
  },
  yuggoth: {
    signs: [sign('yuggoth_landing', 'Mi-Go Landing', 30, 128, 'e'), sign('yuggoth_pitch', 'Rivers of Pitch', 170, 140, 'n')],
    arenas: [arena(['hastur'], 170, 192, 26)],
    allies: [],
    gates: [gate('yuggoth_gate', 'Brain Cylinder (to Vermont)', 'vermont_cylinder', 16, 150, 'e')],
    tomes: [],
    dungeons: [dungeon('migo_cities', 70, 60)],
  },
  beyond: {
    signs: [sign('beyond_threshold', 'The Threshold', 128, 24, 'n'), sign('beyond_court', "Azathoth's Court", 186, 124, 'n')],
    arenas: [
      arena(['yog_sothoth'], 60, 204, 34), arena(['azathoth'], 186, 196, 44),
      lair('zann_window_thing', 40, 110), lair('zkauba', 220, 60), lair('daemon_pipers', 236, 124), lair('ancient_ones', 36, 44),
    ],
    allies: [],
    gates: [gate('beyond_gate', 'The Ultimate Gate (to Kadath)', 'dream_ultimate', 100, 16, 'n')],
    tomes: [],
    dungeons: [dungeon('ultimate_void', 128, 56)],
  },
};
