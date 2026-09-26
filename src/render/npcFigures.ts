/**
 * The people met in the dream as figures (render only): rounded like the investigator (playtest
 * round 7), each dressed by their look (data/npcs.ts) — a tweed or black coat, a fisherman's rust
 * jacket or a dreamer's robe to the ground; a fedora, bowler, flat cap or circlet; grey, dark or white
 * hair; a beard, spectacles, an old man's stoop. Unarmed, and without the investigator's lantern.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { npcDef, type NpcLook } from '../data/npcs';
import { part, shade, skeleton, type Figure } from './figures';
import { box, lump, round } from './meshKit';
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
      return mergeGeometries([round(0.215, 0.215, 0.02, 0.255, dark, 1, 12), round(0.105, 0.128, 0.14, 0.33, dark, 1.05, 10), round(0.13, 0.13, 0.03, 0.28, shade(dark, 0.7), 1.05, 10)]);
    case 'bowler':
      return mergeGeometries([round(0.165, 0.165, 0.02, 0.255, dark, 1.05, 12), lump(0.12, 1, 0.95, 1.05, 0, 0.27, 0.005, dark)]);
    case 'cap':
      return mergeGeometries([lump(0.125, 1, 0.42, 1.05, 0, 0.255, -0.005, dark), box(0.17, 0.02, 0.1, 0, 0.245, 0.145, dark)]);
    case 'band':
      return round(0.117, 0.117, 0.035, 0.225, shade(ANOMALY.green, 0.8), 1.05, 10);
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
  const facing = shade(coat, 0.8);
  const sleeve = shade(COATS[look.coat], 2.25);
  const dark = shade(BASE.charcoal, 2);
  const pale = shade(BASE.bone, 1.9);
  const hair = shade(HAIR[look.hair], 1.8);
  const body = [
    round(0.225, 0.205, 0.36, 0.42, coat, 0.62), // chest
    round(0.205, 0.2, 0.3, 0.12, coat, 0.64), // waist
    robe ? round(0.205, 0.3, 0.9, -0.43, coat, 0.72, 10) : round(0.205, 0.245, 0.42, -0.19, coat, 0.68, 10), // a robe to the ground, or a coat's skirt to the knee
    round(0.12, 0.13, 0.07, 0.63, facing, 0.95), // collar
  ];
  if (!robe) {
    body.push(
      box(0.07, 0.26, 0.02, 0, 0, 0, facing).rotateZ(-0.3).translate(-0.07, 0.45, 0.13), // lapels
      box(0.07, 0.26, 0.02, 0, 0, 0, facing).rotateZ(0.3).translate(0.07, 0.45, 0.13),
      box(0.07, 0.12, 0.02, 0, 0.53, 0.125, shade(BASE.bone, 1.3)), // shirt in the V
    );
  } else body.push(round(0.207, 0.207, 0.05, 0.02, shade(coat, 0.7), 0.74)); // a rope belt
  part(f, f.torso, mergeGeometries(body), 'cloth');
  const head = [
    lump(0.102, 0.95, 1.12, 1.02, 0, 0.13, 0.012, pale),
    lump(0.108, 1, 0.62, 1.05, 0, 0.19, -0.018, hair), // hair
    box(0.034, 0.05, 0.05, 0, 0.115, 0.115, shade(pale, 0.93)), // nose
    box(0.03, 0.055, 0.045, -0.1, 0.13, 0, shade(pale, 0.9)), // ears
    box(0.03, 0.055, 0.045, 0.1, 0.13, 0, shade(pale, 0.9)),
  ];
  if (look.beard) head.push(lump(0.085, 1, 0.9, 0.7, 0, 0.045, 0.07, hair));
  if (look.glasses) head.push(box(0.17, 0.03, 0.02, 0, 0.15, 0.113, shade(BASE.charcoal, 1.2)));
  part(f, f.head, mergeGeometries(head), 'cloth');
  const h = hat(look, dark);
  if (h) part(f, f.head, h, 'cloth', look.hat === 'band' ? 0.6 : 0);
  for (const [arm, elbow, hand] of [[f.armR, f.elbowR, f.handR], [f.armL, f.elbowL, f.handL]]) {
    part(f, arm, round(0.074, 0.064, 0.33, -0.15, sleeve, 1.05), 'cloth');
    part(f, elbow, round(0.063, 0.055, 0.29, -0.13, sleeve), 'cloth');
    part(f, hand, lump(0.048, 0.9, 1.1, 1, 0, -0.04, 0.01, pale), 'cloth');
  }
  for (const [leg, knee, foot] of [[f.legR, f.kneeR, f.footR], [f.legL, f.kneeL, f.footL]]) {
    part(f, leg, round(0.09, 0.075, 0.45, -0.21, robe ? coat : dark, 1.1), 'cloth');
    part(f, knee, round(0.074, 0.064, 0.44, -0.2, robe ? coat : dark, 1.05), 'cloth');
    part(f, foot, lump(0.066, 1, 0.66, 1.5, 0, -0.03, 0.05, shade(BASE.charcoal, 1.4)), 'cloth');
  }
  return f;
}
