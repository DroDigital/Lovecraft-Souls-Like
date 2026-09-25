/**
 * The investigator (spec §3B), in detail: a 1920s field coat with lapels, shoulders and a flared
 * skirt, shirt and tie under a rust scarf, a belt with its buckle and a satchel on a strap; a
 * fedora with its band over a face with brow, nose and ears; leather gloves; the sword-cane with
 * its silver grip and ferrule; the revolver; trousers and shoes; and the lantern in its cage at the
 * belt. Large value blocks still carry the read: dark coat, lighter sleeves, pale face.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANTERN } from '../data/tuning';
import { cylinder, part, shade, skeleton, type Figure } from './figures';
import { box, tint } from './meshKit';
import { BASE, mixRgb, type Rgb } from './palette';

const slab = (w: number, h: number, d: number, x: number, y: number, z: number, c: Rgb, rz = 0, rx = 0): THREE.BufferGeometry =>
  box(w, h, d, 0, 0, 0, c).rotateX(rx).rotateZ(rz).translate(x, y, z);

export function investigator(): Figure {
  const f = skeleton('humanoid', { hip: 0.92, shoulder: [0.28, 0.58], hipX: 0.11, neck: [0.64, 0] });
  f.character = 'player';
  const coat = shade(mixRgb(BASE.charcoal, BASE.seaGrey, 0.1), 2);
  const facing = shade(coat, 0.78);
  const sleeve = shade(mixRgb(BASE.charcoal, BASE.seaGrey, 0.3), 2); // a step lighter, so attack and block poses read
  const dark = shade(BASE.charcoal, 2);
  const pale = shade(BASE.bone, 2);
  const shirt = shade(BASE.bone, 1.7);
  const leather = shade(mixRgb(BASE.rust, BASE.charcoal, 0.45), 1.7);
  const brass = shade(mixRgb(BASE.bone, BASE.rust, 0.4), 1.4);
  const scarf = shade(mixRgb(BASE.rust, BASE.charcoal, 0.2), 1.6);
  const silver = shade(BASE.bone, 1.25);

  const skirt = new THREE.CylinderGeometry(0.245, 0.3, 0.46, 4, 2, true).rotateY(Math.PI / 4).scale(1, 1, 0.66).translate(0, -0.2, 0);
  part(f, f.torso, mergeGeometries([
    box(0.42, 0.34, 0.25, 0, 0.43, 0, coat), // chest
    box(0.5, 0.1, 0.27, 0, 0.57, 0, coat), // shoulders
    box(0.4, 0.3, 0.24, 0, 0.13, 0, coat), // waist
    tint(skirt, coat),
    slab(0.07, 0.27, 0.02, -0.07, 0.45, 0.128, facing, -0.32), // lapels
    slab(0.07, 0.27, 0.02, 0.07, 0.45, 0.128, facing, 0.32),
    box(0.07, 0.11, 0.02, 0, 0.53, 0.126, shirt), // shirt in the V...
    box(0.035, 0.17, 0.02, 0, 0.47, 0.133, shade(BASE.rust, 1.1)), // ...and the tie
    box(0.025, 0.025, 0.02, 0.05, 0.3, 0.127, brass), // buttons
    box(0.025, 0.025, 0.02, 0.05, 0.19, 0.127, brass),
    box(0.43, 0.06, 0.27, 0, 0.0, 0, leather), // belt
    box(0.06, 0.05, 0.02, 0, 0.0, 0.142, brass), // buckle
    box(0.27, 0.07, 0.25, 0, 0.625, 0, scarf), // scarf about the neck...
    slab(0.08, 0.3, 0.03, 0.07, 0.46, -0.14, scarf, 0.12), // ...its tail down the back
    slab(0.045, 0.66, 0.02, 0, 0.33, 0.131, leather, 0.72), // satchel strap
    box(0.17, 0.15, 0.08, -0.2, -0.06, 0.04, leather), // satchel, on the right hip
  ]), 'cloth');
  const cage = shade(BASE.charcoal, 1.6);
  part(f, f.torso, mergeGeometries([ // the lantern's cage at the left of the belt
    box(0.13, 0.025, 0.13, 0.2, -0.02, 0.19, cage),
    box(0.13, 0.025, 0.13, 0.2, -0.18, 0.19, cage),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.015, 0.16, 0.015, 0.2 + sx * 0.055, -0.1, 0.19 + sz * 0.055, cage))),
    tint(new THREE.TorusGeometry(0.035, 0.008, 4, 8).translate(0.2, 0.02, 0.19), cage),
  ]), 'cloth');
  part(f, f.torso, box(0.09, 0.12, 0.09, 0.2, -0.1, 0.19, LANTERN.color), 'cloth', 1); // its flame (its light: lantern.ts)

  part(f, f.head, mergeGeometries([
    box(0.19, 0.22, 0.2, 0, 0.12, 0.01, pale), // face
    box(0.04, 0.06, 0.05, 0, 0.1, 0.125, shade(pale, 0.93)), // nose
    box(0.17, 0.03, 0.03, 0, 0.17, 0.105, shade(BASE.charcoal, 1.3)), // brow in the hat's shadow
    box(0.17, 0.05, 0.19, 0, 0.03, 0.02, shade(pale, 0.86)), // jaw
    box(0.03, 0.06, 0.05, -0.1, 0.12, 0, shade(pale, 0.9)), // ears
    box(0.03, 0.06, 0.05, 0.1, 0.12, 0, shade(pale, 0.9)),
    box(0.2, 0.1, 0.06, 0, 0.17, -0.085, dark), // hair at the back
  ]), 'cloth');
  part(f, f.head, mergeGeometries([ // fedora: brim, pinched crown, band
    cylinder(0.22, 0.22, 0.025, 0.25, dark),
    cylinder(0.12, 0.135, 0.13, 0.32, dark),
    box(0.03, 0.03, 0.2, 0, 0.385, 0, shade(dark, 0.8)),
    cylinder(0.137, 0.137, 0.035, 0.28, shade(BASE.rust, 0.9)),
  ]), 'cloth');

  for (const arm of [f.armR, f.armL]) {
    part(f, arm, mergeGeometries([
      box(0.13, 0.3, 0.14, 0, -0.15, 0, sleeve),
      box(0.12, 0.26, 0.13, 0, -0.42, 0, shade(sleeve, 0.94)),
      box(0.135, 0.05, 0.145, 0, -0.55, 0, facing), // cuff
      box(0.09, 0.1, 0.1, 0, -0.62, 0.01, leather), // glove
      box(0.03, 0.06, 0.04, 0.04, -0.6, 0.06, leather), // thumb
    ]), 'cloth');
  }
  part(f, f.armR, mergeGeometries([ // the sword-cane: silver grip, shaft, ferrule
    box(0.035, 0.8, 0.035, 0, -1.0, 0.02, shade(BASE.bone, 0.9)),
    box(0.11, 0.035, 0.04, 0, -0.585, 0.02, silver),
    box(0.045, 0.06, 0.045, 0, -1.41, 0.02, silver),
  ]), 'wood');
  part(f, f.armL, mergeGeometries([ // the revolver, its barrel along the arm
    box(0.045, 0.1, 0.06, 0, -0.66, 0.035, shade(BASE.rust, 0.9)),
    box(0.055, 0.07, 0.08, 0, -0.72, 0.03, dark),
    box(0.028, 0.14, 0.028, 0, -0.8, 0.03, dark),
  ]), 'cloth');
  f.flash = part(f, f.armL, box(0.16, 0.16, 0.16, 0, -0.9, 0.03, BASE.bone), 'flesh', 1);
  f.flash.visible = false;
  for (const leg of [f.legR, f.legL]) {
    part(f, leg, mergeGeometries([
      box(0.16, 0.8, 0.18, 0, -0.4, 0, dark),
      box(0.15, 0.1, 0.25, 0, -0.85, 0.035, shade(BASE.charcoal, 1.3)), // shoe
      box(0.165, 0.03, 0.185, 0, -0.78, 0, shade(dark, 0.85)), // turn-up
    ]), 'cloth');
  }
  return f;
}
