/**
 * The investigator (spec §3B), in detail: a 1920s field coat with lapels, shoulders and a flared
 * skirt in two panels that swing with the legs, shirt and tie under a rust scarf, a belt with its
 * buckle and a satchel on a strap; a fedora with its band over short hair and a face with brow,
 * nose and ears; leather gloves; the sword-cane with its silver grip and ferrule; the revolver;
 * trousers and shoes; and the lantern in its cage at the belt. Arms bend at the elbow and legs at
 * the knee. Large value blocks still carry the read: dark coat, lighter sleeves, pale face.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANTERN } from '../data/tuning';
import { axeGeometry, razorGeometry } from './armsMeshes';
import { cylinder, part, shade, skeleton, type Figure } from './figures';
import { box, tint } from './meshKit';
import { BASE, mixRgb, type Rgb } from './palette';

const slab = (w: number, h: number, d: number, x: number, y: number, z: number, c: Rgb, rz = 0, rx = 0): THREE.BufferGeometry =>
  box(w, h, d, 0, 0, 0, c).rotateX(rx).rotateZ(rz).translate(x, y, z);

/**
 * One half of the coat's skirt, a closed flared shell from the belt to the knee that hangs at the hip
 * and swings with its thigh (poses.ts), so a striding leg stays inside the coat.
 */
function skirtPanel(side: 1 | -1, c: Rgb): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const t = 0.5 - p.getY(i); // 0 at the belt, 1 at the hem
    const out = p.getX(i) + 0.5; // 0 at the middle, 1 at the side
    p.setXYZ(i, side * (0.006 + out * (0.205 + 0.035 * t)), 0.03 - 0.46 * t, p.getZ(i) * 2 * (0.125 + 0.045 * t));
  }
  g.computeVertexNormals();
  return tint(g, c);
}

/**
 * A short back and sides under the hat (playtest round 10: it was a slab stuck on the back of the
 * head): it wraps the skull close from the brim down, above and behind the ears, tapers in to the
 * nape, and leaves short sideburns before the ears.
 */
function hairGeometry(c: Rgb): THREE.BufferGeometry[] {
  return [
    box(0.206, 0.09, 0.144, 0, 0.195, -0.032, c), // from the brim down to the ears, round the back and sides
    box(0.2, 0.045, 0.072, 0, 0.1275, -0.064, c), // behind the ears...
    box(0.14, 0.03, 0.036, 0, 0.09, -0.078, c), // ...narrowing to the nape
    box(0.198, 0.035, 0.022, 0, 0.1325, 0.039, c), // sideburns
  ];
}

export function investigator(): Figure {
  const f = skeleton('humanoid', { hip: 0.92, shoulder: [0.28, 0.58], hipX: 0.11, neck: [0.64, 0], leg: 0.9, thigh: 0.42, upper: 0.3, fore: 0.28, ankle: 0.07 });
  f.character = 'player';
  const coat = shade(mixRgb(BASE.charcoal, BASE.seaGrey, 0.1), 2);
  const facing = shade(coat, 0.78);
  const sleeve = shade(mixRgb(BASE.charcoal, BASE.seaGrey, 0.3), 2); // a step lighter, so attack and block poses read
  const dark = shade(BASE.charcoal, 2);
  const pale = shade(BASE.bone, 1.3); // skin under the lantern's light, never brighter than its flame (playtest round 5)
  const shirt = shade(BASE.bone, 1.3);
  const leather = shade(mixRgb(BASE.rust, BASE.charcoal, 0.45), 1.7);
  const brass = shade(mixRgb(BASE.bone, BASE.rust, 0.4), 1.4);
  const scarf = shade(mixRgb(BASE.rust, BASE.charcoal, 0.2), 1.6);
  const silver = shade(BASE.bone, 1.25);
  const hair = shade(mixRgb(BASE.charcoal, BASE.rust, 0.3), 1.4); // dark brown, apart from the hat

  for (const side of [-1, 1] as const) {
    const panel = new THREE.Group();
    f.body.add(panel);
    f.skirt.push(panel);
    part(f, panel, skirtPanel(side, coat), 'cloth');
  }
  part(f, f.torso, mergeGeometries([
    box(0.42, 0.34, 0.25, 0, 0.43, 0, coat), // chest
    box(0.5, 0.1, 0.27, 0, 0.57, 0, coat), // shoulders
    box(0.4, 0.3, 0.24, 0, 0.13, 0, coat), // waist
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
  const [lx, ly, lz] = [0.285, -0.14, 0.02]; // the lantern hangs low at the left side of the belt, clear of the coat and the swinging arm
  part(f, f.torso, mergeGeometries([ // its cage
    box(0.13, 0.025, 0.13, lx, ly + 0.08, lz, cage),
    box(0.13, 0.025, 0.13, lx, ly - 0.08, lz, cage),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.015, 0.16, 0.015, lx + sx * 0.055, ly, lz + sz * 0.055, cage))),
    tint(new THREE.TorusGeometry(0.035, 0.008, 4, 8).translate(lx, ly + 0.12, lz), cage),
  ]), 'cloth');
  part(f, f.torso, box(0.09, 0.12, 0.09, lx, ly, lz, LANTERN.color), 'cloth', 1); // its flame (its light: lantern.ts)
  f.flame = new THREE.Object3D();
  f.flame.position.set(lx, ly, lz);
  f.torso.add(f.flame);

  part(f, f.head, mergeGeometries([
    box(0.19, 0.22, 0.2, 0, 0.12, 0.01, pale), // face
    box(0.04, 0.06, 0.05, 0, 0.1, 0.125, shade(pale, 0.93)), // nose
    box(0.17, 0.03, 0.03, 0, 0.17, 0.105, shade(BASE.charcoal, 1.3)), // brow in the hat's shadow
    box(0.17, 0.05, 0.19, 0, 0.03, 0.02, shade(pale, 0.86)), // jaw
    box(0.03, 0.06, 0.05, -0.1, 0.12, 0, shade(pale, 0.9)), // ears
    box(0.03, 0.06, 0.05, 0.1, 0.12, 0, shade(pale, 0.9)),
    ...hairGeometry(hair),
  ]), 'cloth');
  part(f, f.head, mergeGeometries([ // fedora: brim, pinched crown, band
    cylinder(0.22, 0.22, 0.025, 0.25, dark),
    cylinder(0.12, 0.135, 0.13, 0.32, dark),
    box(0.03, 0.03, 0.2, 0, 0.385, 0, shade(dark, 0.8)),
    cylinder(0.137, 0.137, 0.035, 0.28, shade(BASE.rust, 0.9)),
  ]), 'cloth');

  // Arms: the upper sleeve at the shoulder, the forearm and cuff from the elbow, the gloved hand at the wrist.
  for (const [arm, elbow, hand] of [[f.armR, f.elbowR, f.handR], [f.armL, f.elbowL, f.handL]]) {
    part(f, arm, box(0.13, 0.33, 0.14, 0, -0.15, 0, sleeve), 'cloth');
    part(f, elbow, mergeGeometries([
      box(0.12, 0.28, 0.13, 0, -0.12, 0, shade(sleeve, 0.94)),
      box(0.135, 0.05, 0.145, 0, -0.25, 0, facing), // cuff
    ]), 'cloth');
    part(f, hand, mergeGeometries([
      box(0.09, 0.1, 0.1, 0, -0.04, 0.01, leather), // glove
      box(0.03, 0.06, 0.04, 0.04, -0.02, 0.06, leather), // thumb
    ]), 'cloth');
  }
  const cane = part(f, f.handR, mergeGeometries([ // the sword-cane: silver grip, shaft, ferrule
    box(0.035, 0.8, 0.035, 0, -0.42, 0.02, shade(BASE.bone, 0.9)),
    box(0.11, 0.035, 0.04, 0, -0.005, 0.02, silver),
    box(0.045, 0.06, 0.045, 0, -0.83, 0.02, silver),
  ]), 'wood');
  f.arms = { cane, axe: part(f, f.handR, axeGeometry(), 'wood'), razor: part(f, f.handR, razorGeometry(), 'cloth') }; // found weapons (armsMeshes.ts), shown when in hand
  f.arms.axe.visible = f.arms.razor.visible = false;
  part(f, f.handL, mergeGeometries([ // the revolver, its barrel along the arm
    box(0.045, 0.1, 0.06, 0, -0.08, 0.035, shade(BASE.rust, 0.9)),
    box(0.055, 0.07, 0.08, 0, -0.14, 0.03, dark),
    box(0.028, 0.14, 0.028, 0, -0.22, 0.03, dark),
  ]), 'cloth');
  f.flash = part(f, f.handL, box(0.16, 0.16, 0.16, 0, -0.32, 0.03, BASE.bone), 'flesh', 1);
  f.flash.visible = false;
  // Legs: the thigh at the hip, the shin and turn-up from the knee (0.42 m down), the shoe at the ankle (the soles 0.9 m below the hip).
  for (const [leg, knee, foot] of [[f.legR, f.kneeR, f.footR], [f.legL, f.kneeL, f.footL]]) {
    part(f, leg, box(0.17, 0.47, 0.19, 0, -0.215, 0, dark), 'cloth');
    part(f, knee, mergeGeometries([
      box(0.155, 0.41, 0.175, 0, -0.175, 0, dark),
      box(0.165, 0.03, 0.185, 0, -0.36, 0, shade(dark, 0.85)), // turn-up
    ]), 'cloth');
    part(f, foot, box(0.15, 0.1, 0.25, 0, -0.02, 0.035, shade(BASE.charcoal, 1.3)), 'cloth'); // shoe, from the ankle
  }
  return f;
}
