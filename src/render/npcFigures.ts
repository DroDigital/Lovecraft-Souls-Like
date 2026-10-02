/**
 * The people met in the dream as figures (render only), built like the investigator from large blocks
 * but each their own (round 35: they were a coat, a head and a hat in five colours; now each has what
 * the story gives them, and a coat with a collar, lapels, buttons, a belt and tails that swing as
 * they walk; a face with brows, nose, eyes, ears, a moustache or a beard; a hat with its band; hair
 * cut one way or another; boots; gloves; and, by who they are, spectacles, a watch chain, a satchel,
 * a doctor's bag, a cane, a pipe, a flask, a shawl, a conquistador's morion and cuirass, a sailor's
 * knitted cap, a priest's tall hat and staff). Unarmed, and without the investigator's lantern.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { npcDef, type NpcLook } from '../data/npcs';
import { cylinder, part, shade, skeleton, type Figure } from './figures';
import { skirtPanel } from './investigator';
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

type Cut = 'combed' | 'short' | 'wild' | 'long' | 'bald';
type Item = 'spectacles' | 'chain' | 'satchel' | 'bag' | 'cane' | 'pipe' | 'flask' | 'shawl' | 'morion' | 'cuirass' | 'knit' | 'staff' | 'scarf' | 'braces' | 'gloves' | 'moustache';
/** What each is, beyond their coat, hat and beard: their hair, how pale, a waistcoat's colour, and what they carry or wear. */
const WHO: Readonly<Record<string, { cut: Cut; skin?: number; vest?: Rgb; tie?: Rgb; items: readonly Item[] }>> = {
  peaslee: { cut: 'combed', vest: [0.42, 0.34, 0.2], tie: [0.3, 0.16, 0.14], items: ['spectacles', 'chain', 'moustache'] },
  gilman: { cut: 'wild', skin: 0.92, tie: [0.28, 0.3, 0.34], items: ['satchel', 'scarf'] },
  morgan: { cut: 'short', vest: [0.3, 0.3, 0.32], tie: [0.2, 0.2, 0.22], items: ['bag', 'gloves', 'moustache'] },
  kuranes: { cut: 'long', skin: 1.04, items: ['staff'] },
  zadok: { cut: 'wild', skin: 0.84, items: ['flask', 'pipe', 'braces'] },
  wilmarth: { cut: 'combed', vest: [0.3, 0.34, 0.3], tie: [0.34, 0.2, 0.18], items: ['spectacles', 'satchel', 'scarf'] },
  willett: { cut: 'short', vest: [0.2, 0.2, 0.24], tie: [0.22, 0.22, 0.24], items: ['bag', 'chain'] },
  curtis: { cut: 'wild', skin: 0.86, items: ['braces', 'pipe'] },
  dyer: { cut: 'short', vest: [0.34, 0.3, 0.26], tie: [0.3, 0.3, 0.34], items: ['spectacles', 'gloves', 'scarf', 'moustache'] },
  nathaniel: { cut: 'combed', skin: 0.94, vest: [0.4, 0.32, 0.22], items: ['spectacles', 'cane', 'chain'] },
  zamacona: { cut: 'short', skin: 0.82, items: ['morion', 'cuirass'] },
  johansen: { cut: 'short', skin: 0.88, items: ['knit', 'braces'] },
  akeley: { cut: 'wild', skin: 0.9, items: ['shawl', 'cane'] },
  carter: { cut: 'combed', vest: [0.26, 0.22, 0.3], tie: [0.36, 0.14, 0.18], items: ['satchel', 'cane', 'gloves'] },
  nasht: { cut: 'long', skin: 0.96, items: ['staff'] },
};

const slab = (w: number, h: number, d: number, x: number, y: number, z: number, c: Rgb, rz = 0): THREE.BufferGeometry => box(w, h, d, 0, 0, 0, c).rotateZ(rz).translate(x, y, z);

function hat(look: NpcLook, dark: Rgb, band: Rgb): THREE.BufferGeometry | null {
  switch (look.hat) {
    case 'fedora':
      return mergeGeometries([cylinder(0.215, 0.215, 0.025, 0.26, dark), cylinder(0.12, 0.135, 0.14, 0.33, dark), box(0.03, 0.03, 0.2, 0, 0.395, 0, shade(dark, 0.8)), cylinder(0.138, 0.138, 0.035, 0.295, band)]);
    case 'bowler':
      return mergeGeometries([cylinder(0.17, 0.17, 0.025, 0.26, dark), tint(new THREE.SphereGeometry(0.125, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.27, 0.01), dark), cylinder(0.128, 0.128, 0.03, 0.285, band)]);
    case 'cap':
      return mergeGeometries([box(0.24, 0.07, 0.25, 0, 0.285, 0, dark), box(0.2, 0.025, 0.12, 0, 0.255, 0.16, shade(dark, 0.85)), box(0.245, 0.03, 0.255, 0, 0.255, 0, shade(dark, 0.9))]);
    case 'band':
      return mergeGeometries([box(0.23, 0.04, 0.24, 0, 0.235, 0.01, shade(ANOMALY.green, 0.8)), box(0.05, 0.05, 0.03, 0, 0.24, 0.135, shade(ANOMALY.green, 1.1))]);
    default:
      return null;
  }
}

/** Hair, cut one way or another, over a skull of 0.2 × 0.24 (the hat sits on it). */
function hairOf(cut: Cut, c: Rgb): THREE.BufferGeometry[] {
  if (cut === 'bald') return [box(0.06, 0.12, 0.04, -0.105, 0.13, -0.03, c), box(0.06, 0.12, 0.04, 0.105, 0.13, -0.03, c)];
  const cap = [box(0.212, 0.075, 0.15, 0, 0.215, -0.03, c), box(0.205, 0.1, 0.06, 0, 0.15, -0.085, c)];
  if (cut === 'combed') return [...cap, box(0.216, 0.03, 0.05, 0, 0.245, 0.06, shade(c, 1.1)), box(0.03, 0.09, 0.14, -0.108, 0.17, -0.01, c), box(0.03, 0.09, 0.14, 0.108, 0.17, -0.01, c)];
  if (cut === 'wild') return [...cap, box(0.07, 0.05, 0.06, -0.09, 0.265, 0.02, c), box(0.08, 0.06, 0.06, 0.07, 0.275, -0.02, c), box(0.04, 0.12, 0.1, -0.12, 0.14, -0.06, c), box(0.04, 0.12, 0.1, 0.12, 0.14, -0.06, c)];
  if (cut === 'long') return [...cap, box(0.23, 0.3, 0.05, 0, 0.04, -0.12, c), box(0.04, 0.26, 0.12, -0.12, 0.06, -0.03, c), box(0.04, 0.26, 0.12, 0.12, 0.06, -0.03, c)];
  return [...cap, box(0.03, 0.06, 0.12, -0.108, 0.16, -0.02, c), box(0.03, 0.06, 0.12, 0.108, 0.16, -0.02, c)];
}

/** The person `id` as a figure (a plain grey stranger if the id is unknown). */
export function npcFigure(id: string): Figure {
  const look: NpcLook = npcDef(id)?.look ?? { coat: 'grey', hat: 'none', hair: 'dark' };
  const who = WHO[id] ?? { cut: 'short' as Cut, items: [] as readonly Item[] };
  const has = (i: Item): boolean => who.items.includes(i);
  const robe = look.coat === 'robe';
  const f = skeleton('humanoid', { hip: 0.9, hunch: look.stoop ?? 0, shoulder: [0.27, 0.57], hipX: 0.11, neck: [0.63, 0], leg: 0.88, thigh: 0.42, upper: 0.3, fore: 0.28 });
  const coatC = shade(COATS[look.coat], 2);
  const sleeve = shade(COATS[look.coat], 2.3);
  const facing = shade(coatC, 0.78);
  const dark = shade(BASE.charcoal, 2);
  const trouser = shade(mixRgb(BASE.charcoal, COATS[look.coat], 0.35), 1.9);
  const pale = shade(BASE.bone, 1.9 * (who.skin ?? 1));
  const hair = shade(HAIR[look.hair], 1.8);
  const shirt = shade(BASE.bone, 1.7);
  const leather = shade(mixRgb(BASE.rust, BASE.charcoal, 0.5), 1.7);
  const brass = shade(mixRgb(BASE.bone, BASE.rust, 0.4), 1.5);
  const steel = shade(BASE.seaGrey, 1.9);
  const vest = who.vest ? shade(who.vest, 1.7) : null;

  // The coat: chest, shoulders, waist, lapels, collar, shirt, tie, waistcoat, buttons, belt; a robe hangs whole.
  const torso = [
    box(0.42, 0.34, 0.25, 0, 0.43, 0, coatC), box(0.5, 0.1, 0.27, 0, 0.57, 0, coatC), box(0.4, 0.3, 0.24, 0, 0.13, 0, coatC),
    box(0.22, 0.05, 0.16, 0, 0.625, 0, shirt), // the collar
    ...(robe ? [box(0.46, 0.9, 0.29, 0, -0.4, 0, coatC), box(0.44, 0.07, 0.3, 0, 0.1, 0, facing), box(0.06, 0.55, 0.02, 0, 0.3, 0.135, facing)] : [
      slab(0.07, 0.27, 0.02, -0.07, 0.45, 0.128, facing, -0.32), slab(0.07, 0.27, 0.02, 0.07, 0.45, 0.128, facing, 0.32),
      box(0.08, 0.12, 0.02, 0, 0.53, 0.126, shirt), ...(vest ? [box(0.2, 0.3, 0.02, 0, 0.3, 0.126, vest)] : []),
      ...(who.tie ? [box(0.035, 0.17, 0.02, 0, 0.47, 0.135, shade(who.tie, 1.5))] : []),
      box(0.025, 0.025, 0.02, 0.06, 0.3, 0.14, brass), box(0.025, 0.025, 0.02, 0.06, 0.2, 0.14, brass),
      box(0.43, 0.05, 0.27, 0, 0.0, 0, leather), box(0.06, 0.05, 0.02, 0, 0.0, 0.142, brass),
    ]),
  ];
  if (has('chain')) torso.push(slab(0.1, 0.012, 0.012, -0.05, 0.28, 0.138, brass, -0.35), box(0.03, 0.04, 0.012, -0.1, 0.25, 0.14, brass));
  if (has('braces')) torso.push(box(0.03, 0.55, 0.02, -0.09, 0.32, 0.13, leather), box(0.03, 0.55, 0.02, 0.09, 0.32, 0.13, leather));
  if (has('scarf')) torso.push(box(0.28, 0.07, 0.26, 0, 0.63, 0, shade(mixRgb(BASE.rust, BASE.charcoal, 0.4), 1.6)), slab(0.07, 0.3, 0.025, 0.07, 0.46, 0.14, shade(mixRgb(BASE.rust, BASE.charcoal, 0.4), 1.6), 0.1));
  if (has('shawl')) torso.push(box(0.56, 0.14, 0.32, 0, 0.57, 0, shade(mixRgb(BASE.rust, BASE.bone, 0.25), 1.6)), box(0.4, 0.4, 0.04, 0, 0.35, -0.15, shade(mixRgb(BASE.rust, BASE.bone, 0.25), 1.5)));
  if (has('cuirass')) torso.push(box(0.46, 0.4, 0.29, 0, 0.4, 0.0, steel), box(0.5, 0.05, 0.3, 0, 0.6, 0, shade(steel, 0.85)), box(0.12, 0.3, 0.02, 0, 0.4, 0.15, shade(steel, 1.15)));
  if (has('satchel')) torso.push(slab(0.045, 0.66, 0.02, 0, 0.33, 0.131, leather, 0.72), box(0.17, 0.15, 0.08, -0.2, -0.06, 0.04, leather), box(0.18, 0.03, 0.09, -0.2, 0.02, 0.04, shade(leather, 0.8)));
  if (has('bag')) torso.push(box(0.24, 0.17, 0.1, 0.27, -0.28, 0.0, dark), box(0.26, 0.03, 0.11, 0.27, -0.19, 0.0, shade(dark, 1.2)), box(0.03, 0.05, 0.04, 0.27, -0.16, 0.04, brass));
  if (has('flask')) torso.push(box(0.06, 0.14, 0.04, -0.2, -0.05, 0.1, steel), box(0.03, 0.03, 0.03, -0.2, 0.04, 0.1, brass));
  if (has('staff')) torso.push(box(0.04, 1.5, 0.04, 0.34, -0.2, 0.1, shade(BASE.bone, 0.9)), box(0.1, 0.08, 0.08, 0.34, 0.58, 0.1, brass));
  part(f, f.torso, mergeGeometries(torso), 'cloth');
  if (!robe) {
    for (const side of [-1, 1] as const) { // the coat's tails, swinging with the legs
      const panel = new THREE.Group();
      f.body.add(panel);
      f.skirt.push(panel);
      part(f, panel, skirtPanel(side, coatC), 'cloth');
    }
  }

  // The head: a face with brow, nose, eyes, ears, jaw; moustache and beard; hair; spectacles; the hat.
  const head = [
    box(0.2, 0.24, 0.22, 0, 0.13, 0.01, pale), box(0.04, 0.06, 0.05, 0, 0.11, 0.135, shade(pale, 0.92)), // face, nose
    box(0.17, 0.025, 0.03, 0, 0.18, 0.12, shade(hair, 0.9)), // brow
    box(0.035, 0.03, 0.02, -0.05, 0.15, 0.121, dark), box(0.035, 0.03, 0.02, 0.05, 0.15, 0.121, dark), // eyes
    box(0.03, 0.06, 0.05, -0.108, 0.13, 0, shade(pale, 0.9)), box(0.03, 0.06, 0.05, 0.108, 0.13, 0, shade(pale, 0.9)), // ears
    box(0.17, 0.05, 0.2, 0, 0.03, 0.02, shade(pale, 0.88)), // jaw
    ...hairOf(look.hat === 'none' || who.cut !== 'short' ? who.cut : 'short', hair),
  ];
  if (look.beard) head.push(box(0.19, 0.12, 0.08, 0, 0.02, 0.1, hair), box(0.12, 0.1, 0.07, 0, -0.06, 0.1, shade(hair, 0.95)), box(0.1, 0.03, 0.03, 0, 0.075, 0.14, shade(hair, 1.05)));
  else if (has('moustache')) head.push(box(0.12, 0.03, 0.04, 0, 0.075, 0.135, hair));
  if (has('spectacles') || look.glasses) head.push(box(0.07, 0.06, 0.012, -0.05, 0.15, 0.13, shade(BASE.charcoal, 1.4)), box(0.07, 0.06, 0.012, 0.05, 0.15, 0.13, shade(BASE.charcoal, 1.4)), box(0.2, 0.012, 0.012, 0, 0.16, 0.13, shade(BASE.charcoal, 1.4)));
  if (has('pipe')) head.push(box(0.025, 0.025, 0.12, 0.04, 0.05, 0.17, leather), box(0.05, 0.06, 0.05, 0.04, 0.08, 0.235, dark));
  part(f, f.head, mergeGeometries(head), 'cloth');
  const h = hat(look, dark, shade(look.coat === 'black' ? BASE.rust : BASE.charcoal, 1.4));
  if (h) part(f, f.head, h, 'cloth', look.hat === 'band' ? 0.6 : 0);
  if (has('morion')) part(f, f.head, mergeGeometries([tint(new THREE.SphereGeometry(0.135, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.24, 0), steel), cylinder(0.22, 0.2, 0.025, 0.245, steel), box(0.03, 0.09, 0.26, 0, 0.375, 0, shade(steel, 0.9))]), 'cloth');
  if (has('knit')) part(f, f.head, mergeGeometries([cylinder(0.125, 0.135, 0.12, 0.27, shade(mixRgb(BASE.seaGrey, BASE.charcoal, 0.5), 1.8)), cylinder(0.14, 0.14, 0.04, 0.22, shade(mixRgb(BASE.seaGrey, BASE.charcoal, 0.3), 1.6)), box(0.05, 0.05, 0.05, 0, 0.36, 0, shade(BASE.bone, 1.2))]), 'cloth');

  // Arms: the sleeve and cuff, a hand (gloved for some), what they hold.
  const glove = has('gloves') ? leather : pale;
  for (const [arm, elbow, hand] of [[f.armR, f.elbowR, f.handR], [f.armL, f.elbowL, f.handL]]) {
    part(f, arm, box(0.12, 0.32, 0.13, 0, -0.15, 0, sleeve), 'cloth');
    part(f, elbow, mergeGeometries([box(0.115, 0.28, 0.125, 0, -0.13, 0, sleeve), box(0.13, 0.04, 0.14, 0, -0.245, 0, shirt)]), 'cloth');
    part(f, hand, mergeGeometries([box(0.09, 0.1, 0.1, 0, -0.03, 0.01, glove), box(0.03, 0.06, 0.04, 0.04, -0.02, 0.06, glove)]), 'cloth');
  }
  if (has('cane')) part(f, f.handR, mergeGeometries([box(0.03, 0.78, 0.03, 0, -0.4, 0.02, shade(BASE.charcoal, 1.6)), box(0.1, 0.035, 0.04, 0, 0.0, 0.02, brass), box(0.04, 0.05, 0.04, 0, -0.8, 0.02, brass)]), 'wood');

  // Legs: trousers, boots with a heel and a toecap.
  for (const [leg, knee, foot] of [[f.legR, f.kneeR, f.footR], [f.legL, f.kneeL, f.footL]]) {
    part(f, leg, box(0.16, 0.45, 0.18, 0, -0.21, 0, robe ? coatC : trouser), 'cloth');
    part(f, knee, mergeGeometries([box(0.15, 0.43, 0.17, 0, -0.2, 0, robe ? coatC : trouser), box(0.165, 0.1, 0.185, 0, -0.38, 0, leather)]), 'cloth');
    part(f, foot, mergeGeometries([box(0.14, 0.05, 0.26, 0, -0.02, 0.07, leather), box(0.14, 0.03, 0.08, 0, -0.01, 0.17, shade(leather, 0.8))]), 'cloth');
  }
  return f;
}
