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
    signs: [sign('hub_quad', 'Miskatonic Quad', 256, 220, 'n'), sign('hub_dream', "The Sleeper's Sign", 80, 432, 'e', true)],
    arenas: [],
    allies: [ally('algol_light_being', 420, 420)],
    gates: [
      gate('hub_antarctic', 'Miskatonic Antarctic Expedition', 'mountains_gate', 80, 80, 'n'),
      gate('hub_australia', 'Miskatonic Australian Expedition', 'pnakotus_gate', 432, 80, 'n'),
    ],
    tomes: [],
    dungeons: [dungeon('library', 256, 296), dungeon('munoz_rooms', 430, 330), dungeon('alchemist_cellars', 100, 300), dungeon('outsider_crypt', 360, 480)],
  },
  arkham: {
    signs: [sign('arkham_streets', 'Arkham Streets', 448, 256, 'w'), sign('arkham_heath', 'Blasted Heath', 240, 184, 'w')],
    arenas: [
      arena(['colour_out_of_space'], 140, 140, 24, { well: true }),
      lair('black_man', 400, 80),
    ],
    allies: [],
    gates: [],
    tomes: [],
    dungeons: [dungeon('witch_house', 320, 340), dungeon('hound_churchyard', 80, 400), dungeon('deserted_house', 140, 300), dungeon('swamp_tomb', 400, 400)],
  },
  providence: {
    signs: [sign('prov_benefit', 'Benefit Street', 64, 256, 'e'), sign('prov_kingsport', 'Kingsport Cliffs', 456, 120, 'w')],
    arenas: [
      lair('simon_orne', 300, 140), lair('edward_hutchinson', 64, 80),
    ],
    allies: [ally('nodens', 472, 48), ally('tritons', 416, 40)],
    gates: [],
    tomes: [tome('Cultes des Goules', 1, 128, 320)],
    dungeons: [
      dungeon('curwen_catacombs', 200, 200), dungeon('starry_wisdom', 340, 260), dungeon('shunned_cellar', 80, 400), dungeon('red_hook_vaults', 220, 428),
      dungeon('old_man_house', 460, 224),
    ],
  },
  dunwich: {
    signs: [sign('dunwich_village', 'Dunwich Village', 440, 60, 'n'), sign('dunwich_hills', 'The Round Hills', 120, 248, 'n')],
    arenas: [arena(['shub_niggurath'], 120, 400, 32), lair('medusa_gorgon', 408, 280)],
    allies: [],
    gates: [gate('dunwich_mound', "The Mound (to K'n-yan)", 'knyan_gate', 440, 420, 'w')],
    tomes: [tome('Unaussprechlichen Kulten', 1, 144, 64)],
    dungeons: [dungeon('sentinel_hill', 280, 120), dungeon('whateley_farm', 80, 100)],
  },
  vermont: {
    signs: [sign('vermont_road', 'Akeley Farm Road', 256, 48, 'n'), sign('vermont_dark', 'Dark Mountain', 160, 400, 'e')],
    ...none,
    gates: [gate('vermont_cylinder', 'Brain Cylinder (to Yuggoth)', 'yuggoth_gate', 400, 440, 's')],
    dungeons: [dungeon('akeley', 320, 160)],
  },
  innsmouth: {
    signs: [sign('innsmouth_square', 'Innsmouth Square', 80, 80, 'e'), sign('innsmouth_reef', 'Devil Reef', 448, 224, 'w')],
    arenas: [arena(['martins_beach_horror'], 440, 80, 16)],
    allies: [],
    gates: [gate('innsmouth_alert', "The Alert (to R'lyeh)", 'rlyeh_gate', 460, 460, 's')],
    tomes: [],
    dungeons: [dungeon('yhanthlei', 400, 256), dungeon('waite_house', 120, 400)],
  },
  mountains: {
    signs: [sign('mountains_camp', "Lake's Camp", 256, 60, 'n')],
    ...none,
    gates: [gate('mountains_gate', 'Expedition Sledges (to Miskatonic)', 'hub_antarctic', 192, 40, 'n')],
    dungeons: [dungeon('elder_city', 256, 140)],
  },
  pnakotus: {
    signs: [sign('pnakotus_camp', 'Great Sandy Desert Camp', 440, 80, 'n')],
    arenas: [arena(['colossus_pyramids'], 160, 420, 26)],
    allies: [],
    gates: [gate('pnakotus_gate', 'Expedition Crates (to Miskatonic)', 'hub_australia', 472, 36, 'n')],
    tomes: [],
    dungeons: [dungeon('archives', 360, 256)],
  },
  kn_yan: {
    signs: [sign('knyan_depths', "The Mound's Depths", 256, 60, 'n'), sign('knyan_serpents', 'Serpent Temple', 100, 328, 'n')],
    arenas: [arena(['yig'], 100, 408, 20), arena(['nug', 'yeb'], 408, 408, 24)],
    allies: [],
    gates: [gate('knyan_gate', 'The Mound (to Dunwich)', 'dunwich_mound', 320, 36, 'n')],
    tomes: [],
    dungeons: [dungeon('tsath', 256, 140)],
  },
  dreamlands: {
    signs: [
      sign('dream_wood', 'Enchanted Wood', 328, 144, 'n'), sign('dream_sarnath', 'Shores of Ib', 760, 720, 'e'),
      sign('dream_hatheg', 'Slopes of Hatheg-Kla', 800, 180, 'n'),
    ],
    arenas: [arena(['bokrug'], 840, 800, 24), lair('other_gods', 860, 260, 14)],
    allies: [],
    gates: [gate('dream_wood_gate', 'The Enchanted Wood (to the Stairs of Slumber)', 'dream_deeper', 272, 120, 'n')],
    tomes: [tome('Seven Cryptical Books of Hsan', 1, 600, 640)],
    dungeons: [dungeon('slumber', 120, 600), dungeon('ulthar_kadath', 400, 300), dungeon('sculptor_studio', 200, 360)],
  },
  rlyeh: {
    signs: [sign('rlyeh_deck', "The Alert's Deck", 88, 60, 'n'), sign('rlyeh_door', 'The Great Door', 352, 200, 'n')],
    arenas: [arena(['cthulhu'], 352, 336, 48)],
    allies: [],
    gates: [gate('rlyeh_gate', 'The Alert (to Innsmouth)', 'innsmouth_alert', 40, 40, 'n')],
    tomes: [],
    dungeons: [dungeon('risen_rlyeh', 120, 120)],
  },
  yuggoth: {
    signs: [sign('yuggoth_landing', 'Mi-Go Landing', 60, 256, 'e'), sign('yuggoth_pitch', 'Rivers of Pitch', 340, 280, 'n')],
    arenas: [arena(['hastur'], 340, 384, 26)],
    allies: [],
    gates: [gate('yuggoth_gate', 'Brain Cylinder (to Vermont)', 'vermont_cylinder', 32, 300, 'e')],
    tomes: [],
    dungeons: [dungeon('migo_cities', 140, 120)],
  },
  beyond: {
    signs: [sign('beyond_threshold', 'The Threshold', 256, 48, 'n'), sign('beyond_court', "Azathoth's Court", 372, 248, 'n')],
    arenas: [
      arena(['yog_sothoth'], 120, 408, 34), arena(['azathoth'], 372, 392, 44),
      lair('zkauba', 440, 120), lair('daemon_pipers', 472, 248), lair('ancient_ones', 72, 88),
    ],
    allies: [],
    gates: [gate('beyond_gate', 'The Ultimate Gate (to Kadath)', 'dream_ultimate', 200, 32, 'n')],
    tomes: [],
    dungeons: [dungeon('ultimate_void', 256, 112), dungeon('rue_dauseil', 80, 220)],
  },
};
