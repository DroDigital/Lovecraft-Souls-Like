/**
 * Phase 1 flat arena: a stone floor ringed by a colonnade, a few pillars and low walls to break
 * line of sight, the Elder Sign the player respawns at, a training dummy and one Deep One.
 */

export interface Place {
  x: number;
  z: number;
  yaw: number; // radians; 0 faces +z
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
};
