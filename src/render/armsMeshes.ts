/**
 * The investigator's found weapons as geometry (playtest round 4, data/weapons.ts), in the hand's
 * frame as the sword-cane hangs in investigator.ts: the grip at the wrist, the business end down
 * −y, the edge forward (+z). The sword-cane's own lies in investigator.ts. Round 12: Zamacona's
 * espada and Obed Marsh's cutlass, and one table of them all for the hand and the rack.
 */

import type * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { shade } from './figures';
import { box } from './meshKit';
import { BASE, mixRgb } from './palette';
import type { TextureKind } from './textures';
import type { WeaponId } from '../data/weapons';

const steel = (): ReturnType<typeof shade> => shade(BASE.bone, 1.15);
const brass = (): ReturnType<typeof shade> => shade(mixRgb(BASE.rust, BASE.bone, 0.55), 1.3);

/** A woodsman's axe: a long ash haft, an iron head with a bright bit. */
export function axeGeometry(): THREE.BufferGeometry {
  const haft = shade(mixRgb(BASE.rust, BASE.bone, 0.35), 1.3);
  const iron = shade(BASE.charcoal, 1.4);
  return mergeGeometries([
    box(0.045, 0.82, 0.045, 0, -0.38, 0.02, haft),
    box(0.05, 0.13, 0.2, 0, -0.72, 0.1, iron), // the head...
    box(0.035, 0.19, 0.05, 0, -0.72, 0.21, shade(BASE.bone, 1.1)), // ...and its bit
    box(0.055, 0.05, 0.055, 0, -0.01, 0.02, iron), // the butt's wedge
  ]);
}

/** A straight razor, open: horn scales in the fist, a thin steel blade. */
export function razorGeometry(): THREE.BufferGeometry {
  return mergeGeometries([
    box(0.028, 0.12, 0.03, 0, -0.03, 0.025, shade(mixRgb(BASE.bone, BASE.charcoal, 0.4), 1.4)),
    box(0.012, 0.19, 0.038, 0, -0.18, 0.04, shade(BASE.bone, 1.2)),
  ]);
}

/** Zamacona's espada, of Coronado's year: a dark grip, brass quillons and cup, a long thin blade. */
export function rapierGeometry(): THREE.BufferGeometry {
  return mergeGeometries([
    box(0.03, 0.12, 0.03, 0, -0.03, 0.02, shade(BASE.charcoal, 1.2)),
    box(0.17, 0.02, 0.03, 0, -0.1, 0.02, brass()),
    box(0.07, 0.05, 0.07, 0, -0.1, 0.05, brass()),
    box(0.014, 0.95, 0.024, 0, -0.6, 0.02, steel()),
  ]);
}

/** Obed Marsh's cutlass: a brass basket over the knuckles, a broad blade widening toward the point. */
export function cutlassGeometry(): THREE.BufferGeometry {
  return mergeGeometries([
    box(0.035, 0.11, 0.035, 0, -0.03, 0.02, shade(BASE.charcoal, 1.3)),
    box(0.03, 0.12, 0.1, 0, -0.06, 0.07, brass()),
    box(0.02, 0.6, 0.06, 0, -0.42, 0.035, steel()),
    box(0.02, 0.12, 0.085, 0, -0.68, 0.05, steel()),
  ]);
}

/** Every found weapon's geometry, and the texture it takes. */
export const ARMS: Record<Exclude<WeaponId, 'cane'>, readonly [() => THREE.BufferGeometry, TextureKind]> = {
  axe: [axeGeometry, 'wood'],
  razor: [razorGeometry, 'cloth'],
  rapier: [rapierGeometry, 'cloth'],
  cutlass: [cutlassGeometry, 'cloth'],
};
