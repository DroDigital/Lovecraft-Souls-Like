/**
 * How each boss's ground is dressed (playtest round 13: every arena was the same ring of standing
 * stones, some too small to fight in): what rings it (standing stones, or a prop of the world's
 * kinds: dead trees, pillars, obelisks, R'lyeh's spires, Yuggoth's towers, the Beyond's globes…),
 * what stands at its heart or at its far side (an altar, an idol, a sphinx-block, a stepped mound),
 * and how many braziers burn about it. A dungeon's boss room takes its heart and its fires (its
 * walls are its ring). Keyed by the first boss's roster id; the rest are plain stones. Data only.
 */

import type { PropKind } from './regions';

export interface ArenaStyle {
  ring: 'stones' | PropKind;
  ringScale?: number; // the ring's pieces, × their usual size
  spacing?: number; // metres between them (else by kind)
  centre?: { kind: PropKind; scale: number }; // at the heart, or toward the far side when the boss stands at the heart
  fires: number; // braziers about the edge
}

export const MIN_ARENA = 24; // metres: the least radius of an open arena (round 13: some were 10)

export const ARENA_STYLES: Readonly<Record<string, ArenaStyle>> = {
  // Open ground
  colour_out_of_space: { ring: 'tree', ringScale: 1.3, fires: 0 }, // the blasted heath's grey dead trees about the Gardners' well
  black_man: { ring: 'monolith', ringScale: 1.4, centre: { kind: 'altar', scale: 1.6 }, fires: 4 }, // the witches' sabbat in the ravine
  simon_orne: { ring: 'pillar', centre: { kind: 'altar', scale: 1.4 }, fires: 4 },
  edward_hutchinson: { ring: 'pillar', centre: { kind: 'obelisk', scale: 2 }, fires: 3 },
  shub_niggurath: { ring: 'tree', ringScale: 1.8, spacing: 3.5, centre: { kind: 'altar', scale: 2 }, fires: 6 }, // the black grove's rites
  medusa_gorgon: { ring: 'ruin', ringScale: 1.2, centre: { kind: 'pillar', scale: 1.4 }, fires: 2 }, // Riverside, burned
  martins_beach_horror: { ring: 'rock', ringScale: 1.6, fires: 3 }, // the beach at night, bonfires on the sand
  colossus_pyramids: { ring: 'obelisk', ringScale: 2.6, spacing: 8, centre: { kind: 'block', scale: 2 }, fires: 6 }, // beneath the pyramids
  yig: { ring: 'monolith', ringScale: 1.6, centre: { kind: 'pyramid', scale: 0.5 }, fires: 4 }, // the serpent-father's mound
  nug: { ring: 'block', ringScale: 0.8, spacing: 11, centre: { kind: 'pyramid', scale: 0.6 }, fires: 4 },
  bokrug: { ring: 'monolith', ringScale: 1.8, centre: { kind: 'pillar', scale: 2.4 }, fires: 3 }, // the sea-green idol of Ib, by the lake
  other_gods: { ring: 'rock', ringScale: 2.4, spacing: 7, fires: 0 }, // the peak of Hatheg-Kla
  cthulhu: { ring: 'spire', ringScale: 0.8, spacing: 16, fires: 0 }, // R'lyeh's leaning masonry
  hastur: { ring: 'tower', ringScale: 0.4, spacing: 15, centre: { kind: 'obelisk', scale: 3.4 }, fires: 0 }, // Carcosa's towers behind the moon
  yog_sothoth: { ring: 'globe', spacing: 9, centre: { kind: 'block', scale: 1.4 }, fires: 0 }, // the iridescent spheres
  azathoth: { ring: 'cone', ringScale: 1.3, spacing: 13, centre: { kind: 'pyramid', scale: 1 }, fires: 0 }, // the Court at the centre of all
  zkauba: { ring: 'cone', ringScale: 0.8, spacing: 10, fires: 2 }, // Yaddith
  daemon_pipers: { ring: 'globe', ringScale: 0.8, spacing: 8, fires: 0 },
  ancient_ones: { ring: 'pillar', ringScale: 1.6, spacing: 7, fires: 0 }, // the hexagonal pedestals beyond the Gate
  // Dungeons' boss rooms: a heart and fires (the room's walls ring it).
  keziah_mason: { ring: 'stones', centre: { kind: 'altar', scale: 1 }, fires: 2 },
  dunwich_horror: { ring: 'stones', centre: { kind: 'altar', scale: 2 }, fires: 4 }, // the table-stone on Sentinel Hill
  father_dagon: { ring: 'stones', centre: { kind: 'monolith', scale: 2.4 }, fires: 0 }, // the reef's monolith of Dagon
  joseph_curwen: { ring: 'stones', centre: { kind: 'altar', scale: 1.2 }, fires: 4 },
  haunter_of_the_dark: { ring: 'stones', centre: { kind: 'pillar', scale: 1 }, fires: 0 }, // the Trapezohedron's pillar (no fire: it lives in the dark)
  whisperer: { ring: 'stones', centre: { kind: 'block', scale: 0.4 }, fires: 2 },
  shoggoth: { ring: 'stones', centre: { kind: 'cone', scale: 0.5 }, fires: 0 },
  flying_polyp: { ring: 'stones', centre: { kind: 'block', scale: 0.7 }, fires: 0 },
  tsathoggua: { ring: 'stones', centre: { kind: 'pyramid', scale: 0.5 }, fires: 3 },
  high_priest: { ring: 'stones', centre: { kind: 'altar', scale: 1.6 }, fires: 4 }, // the monastery of Leng
  great_ones: { ring: 'stones', centre: { kind: 'obelisk', scale: 3 }, fires: 6 }, // the onyx castle of Kadath
  ghatanothoa: { ring: 'stones', centre: { kind: 'pyramid', scale: 0.7 }, fires: 2 }, // the temple on Yaddith-Gho
  rhan_tegoth: { ring: 'stones', centre: { kind: 'block', scale: 0.6 }, fires: 0 },
  umr_at_tawil: { ring: 'stones', centre: { kind: 'pillar', scale: 2 }, fires: 0 },
};

export const arenaStyle = (boss: string | undefined): ArenaStyle => (boss && ARENA_STYLES[boss]) || { ring: 'stones', fires: 0 };
