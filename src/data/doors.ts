/**
 * The dungeons' doors (round 27: every doorway was a hole in the wall): what stands in the doorway
 * of each kit, by the room it leads into (the way outside takes the room it opens on). Oak for
 * houses, iron for vaults and crypts, a slab sunk into the floor for tombs and ruins, a slab that
 * slides, green-lit and out of true, for R'lyeh, a pair of wet valves for the Mi-go's cities, drapes for the dream.
 * A kit not named here has no door (open ruins, the hill's circle, the drowned temple, the void).
 * Render only (render/doorViews.ts): a door never stops a body, and opens as one nears. Data only.
 */

import type { KitId } from './kits';
import type { Vec3 } from './tuning';

export type DoorKind = 'plank' | 'grille' | 'slab' | 'membrane' | 'curtain';

export interface DoorLook {
  kind: DoorKind;
  tone: Vec3; // the leaf's colour
  trim: Vec3; // its bands, bars or frame
  glow?: Vec3; // glyphs or veins that shine
  slide?: boolean; // a slab goes into the wall, not the floor
  tilt?: number; // a slab hung out of true (radians)
  ajar: number; // share of these doors found standing part open
  creak: 'thud' | 'rumble' | 'flesh' | 'none'; // what is heard as it moves
}

const OAK: Vec3 = [0.5, 0.38, 0.27];
const IRON: Vec3 = [0.3, 0.29, 0.31];

export const DOOR_LOOKS: Readonly<Partial<Record<KitId, DoorLook>>> = {
  masonry: { kind: 'slab', tone: [0.66, 0.66, 0.64], trim: IRON, ajar: 0.15, creak: 'rumble' }, // a tomb's slab
  library: { kind: 'plank', tone: [0.36, 0.27, 0.2], trim: [0.72, 0.56, 0.3], ajar: 0.3, creak: 'thud' }, // dark oak, brass
  timber: { kind: 'plank', tone: OAK, trim: IRON, ajar: 0.35, creak: 'thud' },
  townhouse: { kind: 'plank', tone: [0.42, 0.3, 0.24], trim: [0.6, 0.5, 0.36], ajar: 0.3, creak: 'thud' },
  cellar: { kind: 'plank', tone: [0.36, 0.3, 0.25], trim: IRON, ajar: 0.2, creak: 'thud' },
  mine: { kind: 'grille', tone: [0.42, 0.34, 0.27], trim: [0.36, 0.3, 0.27], ajar: 0.3, creak: 'thud' }, // a timber-and-strap gate
  brick: { kind: 'grille', tone: IRON, trim: [0.36, 0.26, 0.2], ajar: 0.2, creak: 'thud' }, // the vaults' rusted bars
  crypt: { kind: 'grille', tone: [0.3, 0.3, 0.3], trim: [0.38, 0.4, 0.36], ajar: 0.25, creak: 'thud' },
  church: { kind: 'plank', tone: [0.3, 0.23, 0.2], trim: [0.26, 0.26, 0.28], ajar: 0.2, creak: 'thud' },
  marble: { kind: 'plank', tone: [0.88, 0.85, 0.78], trim: [0.78, 0.66, 0.4], ajar: 0.4, creak: 'thud' }, // white-lacquered, gilt
  drowned: { kind: 'plank', tone: [0.34, 0.44, 0.38], trim: [0.5, 0.56, 0.46], ajar: 0.25, creak: 'thud' }, // timber gone green with weed and barnacle
  elder: { kind: 'slab', tone: [0.84, 0.86, 0.88], trim: IRON, glow: [0.6, 0.8, 0.9], ajar: 0.1, creak: 'rumble' }, // pale, barrel-ribbed
  basalt: { kind: 'slab', tone: [0.3, 0.3, 0.35], trim: IRON, glow: [0.5, 0.5, 0.8], ajar: 0.1, creak: 'rumble' },
  tsath: { kind: 'plank', tone: [0.62, 0.5, 0.26], trim: [0.42, 0.74, 0.6], glow: [0.4, 0.9, 0.7], ajar: 0.15, creak: 'thud' }, // bronze, a green serpent in it
  dream: { kind: 'curtain', tone: [0.5, 0.26, 0.5], trim: [0.86, 0.7, 0.38], ajar: 0.4, creak: 'none' },
  onyx: { kind: 'slab', tone: [0.14, 0.14, 0.17], trim: [0.72, 0.6, 0.3], glow: [0.9, 0.74, 0.36], ajar: 0.1, creak: 'rumble' },
  cyclopean: { kind: 'slab', tone: [0.36, 0.46, 0.42], trim: IRON, glow: [0.42, 0.9, 0.56], slide: true, tilt: 0.06, ajar: 0.2, creak: 'rumble' }, // R'lyeh: the angles are wrong
  fungoid: { kind: 'membrane', tone: [0.72, 0.46, 0.56], trim: [0.5, 0.26, 0.4], glow: [0.9, 0.5, 0.7], ajar: 0.25, creak: 'flesh' },
};

/** The look of a doorway into a room of `kit`, if it has a door. */
export const doorLook = (kit: KitId | undefined): DoorLook | undefined => (kit ? DOOR_LOOKS[kit] : undefined);
