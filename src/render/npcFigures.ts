/**
 * The people met in the dream as figures (render only): built like the investigator from large
 * blocks, but each dressed by their look (data/npcs.ts) — a tweed or black coat, a fisherman's
 * rust jacket or a dreamer's robe; a fedora, bowler, cap or circlet; grey, dark or white hair; a
 * beard, spectacles, an old man's stoop. Unarmed, and without the investigator's lantern.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { npcDef, type NpcLook } from '../data/npcs';
import { cylinder, part, shade, skeleton, type Figure } from './figures';
import { box, tint } from './meshKit';
import { ANOMALY, BASE, mixRgb, type Rgb } from './palette';

const COATS: Readonly<Record<NpcLook['coat'], Rgb>> = {
  tweed: mixRgb(BASE.rust, BASE.bone, 0.35),
  black: mixRgb(BASE.charcoal, BASE.seaGrey, 0.05),
  grey: mixRgb(BASE.seaGrey, BASE.charcoal, 0.35),
  rust: mixRgb(BASE.rust, BASE.charcoal, 0.2),
  robe: mixRgb(BASE.bone, BASE.seaGrey, 0.35),
};
const HAIR: Readonly<Record<NpcLook['hair'], Rgb>> = { grey: mixRgb(BASE.bone, BASE.seaGrey, 0.5), dark: BASE.charcoal, white: BASE.bone };

function hat(look: NpcLook, dark: Rgb): THREE.BufferGeometry | null {
  switch (look.hat) {
    case 'fedora':
      return mergeGeometries([cylinder(0.21, 0.21, 0.03, 0.26, dark), cylinder(0.12, 0.13, 0.15, 0.34, dark)]);
    case 'bowler':
      return mergeGeometries([cylinder(0.17, 0.17, 0.025, 0.26, dark), tint(new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.27, 0.01), dark)]);
    case 'cap':
      return mergeGeometries([box(0.24, 0.07, 0.25, 0, 0.28, 0, dark), box(0.18, 0.02, 0.1, 0, 0.25, 0.15, dark)]);
    case 'band':
      return box(0.23, 0.04, 0.24, 0, 0.23, 0.01, shade(ANOMALY.green, 0.8));
    default:
      return null;
  }
}

/** The person `id` as a figure (a plain grey stranger if the id is unknown). */
export function npcFigure(id: string): Figure {
  const look: NpcLook = npcDef(id)?.look ?? { coat: 'grey', hat: 'none', hair: 'dark' };
  const robe = look.coat === 'robe';
  const f = skeleton('humanoid', { hip: 0.9, hunch: look.stoop ?? 0, shoulder: [0.27, 0.57], hipX: 0.11, neck: [0.63, 0], leg: 0.88, thigh: 0.42, upper: 0.3, fore: 0.28 });
  const coat = shade(COATS[look.coat], 2);
  const sleeve = shade(COATS[look.coat], 2.3);
  const dark = shade(BASE.charcoal, 2);
  const pale = shade(BASE.bone, 1.9);
  const hair = shade(HAIR[look.hair], 1.8);
  part(f, f.torso, mergeGeometries([box(0.42, 0.6, 0.25, 0, 0.3, 0, coat), box(0.46, robe ? 0.9 : 0.34, 0.29, 0, robe ? -0.4 : -0.12, 0, coat)]), 'cloth');
  const head = [box(0.2, 0.24, 0.22, 0, 0.13, 0.01, pale), box(0.21, 0.08, 0.23, 0, 0.23, -0.01, hair)];
  if (look.beard) head.push(box(0.18, 0.12, 0.06, 0, 0.03, 0.11, hair));
  if (look.glasses) head.push(box(0.18, 0.03, 0.02, 0, 0.15, 0.125, shade(BASE.charcoal, 1.2)));
  part(f, f.head, mergeGeometries(head), 'cloth');
  const h = hat(look, dark);
  if (h) part(f, f.head, h, 'cloth', look.hat === 'band' ? 0.6 : 0);
  for (const [arm, elbow, hand] of [[f.armR, f.elbowR, f.handR], [f.armL, f.elbowL, f.handL]]) {
    part(f, arm, box(0.12, 0.32, 0.13, 0, -0.15, 0, sleeve), 'cloth');
    part(f, elbow, box(0.115, 0.28, 0.125, 0, -0.13, 0, sleeve), 'cloth');
    part(f, hand, box(0.09, 0.1, 0.1, 0, -0.03, 0.01, pale), 'cloth');
  }
  for (const [leg, knee] of [[f.legR, f.kneeR], [f.legL, f.kneeL]]) {
    part(f, leg, box(0.16, 0.45, 0.18, 0, -0.21, 0, robe ? coat : dark), 'cloth');
    part(f, knee, box(0.15, 0.47, 0.17, 0, -0.225, 0, robe ? coat : dark), 'cloth');
  }
  return f;
}
