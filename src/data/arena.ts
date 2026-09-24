/**
 * Phase 1 flat arena: a stone floor ringed by a colonnade, a few pillars and low walls to break
 * line of sight, the Elder Sign the player respawns at, a training dummy and one Deep One. Phase 3
 * adds a tome and hidden-layer geometry that exists only for the enlightened.
 */

import type { Glow } from './schema';

export interface Place {
  x: number;
  z: number;
  yaw: number; // radians; 0 faces +z
}

/** Box relative to its piece: centre dx, dz, half-width (x), half-depth (z), bottom, top. */
export type LayerBox = readonly [dx: number, dz: number, hw: number, hd: number, y0: number, y1: number];

/** Hidden-layer geometry (spec §3A): stone that is there only while insight ≥ minInsight, or sanity has sunk to maxSanity's band. */
export interface HiddenPieceDef {
  name: string;
  x: number;
  z: number;
  minInsight?: number;
  maxSanity?: number; // a band floor: 70, 40 or 15
  glow: Glow; // the colour of its glyphs
  boxes: readonly LayerBox[];
}

export const ARENA = {
  seed: 7,
  radius: 22, // walkable metres from the centre
  floorSize: 64,
  floorTile: 2, // metres per texture repeat (2 × 2 slabs), the pillars' texel density
  lightCell: 0.5, // metres between floor and wall vertices, so the lantern's pool stays round
  elderSign: { x: -2.4, z: 17.4 }, // behind the spawn, off to the side so the camera boom clears it
  spawn: { x: 0, z: 15.5, yaw: Math.PI } as Place, // the checkpoint respawn point, facing north
  dummy: { x: -4.5, z: 9, yaw: 0.6 } as Place,
  deepOne: { x: 4, z: -9, yaw: 0 } as Place, // also where a `?spawn` creature appears
  ally: { x: 2.5, z: 13, yaw: Math.PI } as Place, // a `?spawn` ally, beside the player
  /** x, z, radius, height. */
  pillars: [
    [-8, 1, 0.8, 7],
    [8.5, 2, 0.8, 6.5],
    [-2.5, -4, 0.7, 2.6], // broken
    [12, -9, 0.8, 7.5],
    [-12, -8, 0.8, 7],
    [0, -15, 0.9, 8],
  ] as const,
  /** Centre x, centre z, half-width (x), half-depth (z), height. */
  walls: [
    [-6, -13, 2.4, 0.35, 1.6],
    [7, 11, 0.35, 2.2, 1.1],
  ] as const,
  colonnade: { count: 20, radius: 24.2, pillarRadius: 0.7, height: 8 },
  tome: { x: -8.5, z: 12.5, yaw: 1.1, name: 'Pnakotic Manuscripts', insight: 1 },
  hidden: [
    {
      name: 'Door That Should Not Be', // a doorway to nowhere, for those who have read enough
      x: -12, z: 4, minInsight: 1, glow: 'purple',
      boxes: [[-0.9, 0, 0.22, 0.3, 0, 3], [0.9, 0, 0.22, 0.3, 0, 3], [0, 0, 1.12, 0.34, 3, 3.5]],
    },
    {
      name: 'Wrong Angles', // standing and floating stones that show themselves to a fractured mind
      x: 13, z: 3, maxSanity: 40, glow: 'magenta',
      boxes: [[0, 0, 0.5, 0.4, 0, 4.2], [1.4, 1.1, 0.35, 0.6, 0, 2.6], [-0.6, 1.6, 0.8, 0.3, 2.3, 2.9], [0.8, -1.2, 0.4, 0.4, 3.4, 4.4], [-1.3, -0.8, 0.3, 0.7, 5.1, 5.5]],
    },
  ] as readonly HiddenPieceDef[],
};
