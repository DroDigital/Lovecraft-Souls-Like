/**
 * The investigator (spec §3B; rounded out in playtest round 7): a 1920s field coat, tapered and
 * rounded so it takes the light as a body does, its collar turned up, an Inverness cape over the
 * shoulders, and a long skirt in two panels that swing with the legs; shirt and tie under a rust
 * scarf, a belt with its buckle and a satchel on a strap; a snap-brim fedora with its band over a
 * face with brow, nose, moustache and ears; leather gloves; the sword-cane with its silver grip and
 * ferrule; the revolver; trousers and round-toed shoes; and a hurricane lantern at the belt. Arms bend
 * at the elbow and legs at the knee. Value blocks carry the read: a mid-dark coat, lighter sleeves,
 * the darkest hat and trousers, a pale face.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANTERN } from '../data/tuning';
import { axeGeometry, razorGeometry } from './armsMeshes';
import { part, shade, skeleton, type Figure } from './figures';
import { box, lump, round, tint } from './meshKit';
import { BASE, mixRgb, type Rgb } from './palette';

const slab = (w: number, h: number, d: number, x: number, y: number, z: number, c: Rgb, rz = 0, rx = 0): THREE.BufferGeometry =>
  box(w, h, d, 0, 0, 0, c).rotateX(rx).rotateZ(rz).translate(x, y, z);

/**
 * One half of the coat's skirt, a closed flared shell from the belt to mid-calf that hangs at the hip
 * and swings with its thigh (gait.ts), so a striding leg stays inside the coat.
 */
function skirtPanel(side: 1 | -1, c: Rgb): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 3, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const t = 0.5 - p.getY(i); // 0 at the belt, 1 at the hem
    const out = p.getX(i) + 0.5; // 0 at the middle, 1 at the side
    const bulge = Math.sin(out * Math.PI) * 0.018; // rounder at the flank
    p.setXYZ(i, side * (0.006 + out * (0.2 + 0.05 * t)), 0.03 - 0.6 * t, p.getZ(i) * 2 * (0.13 + 0.055 * t + bulge));
  }
  g.computeVertexNormals();
  return tint(g, c);
}

export function investigator(): Figure {
  const f = skeleton('humanoid', { hip: 0.92, shoulder: [0.28, 0.58], hipX: 0.11, neck: [0.64, 0], leg: 0.9, thigh: 0.42, upper: 0.3, fore: 0.28, ankle: 0.07 });
  f.character = 'player';
  const coat = shade(mixRgb(BASE.charcoal, BASE.seaGrey, 0.3), 1.95);
  const facing = shade(coat, 0.8);
  const sleeve = shade(coat, 1.12); // a step lighter, so attack and block poses read
  const dark = shade(BASE.charcoal, 1.9);
  const pale = shade(BASE.bone, 1.3); // skin under the lantern's light, never brighter than its flame (playtest round 5)
  const shirt = shade(BASE.bone, 1.3);
  const leather = shade(mixRgb(BASE.rust, BASE.charcoal, 0.45), 1.7);
  const brass = shade(mixRgb(BASE.bone, BASE.rust, 0.4), 1.4);
  const scarf = shade(mixRgb(BASE.rust, BASE.charcoal, 0.15), 1.7);
  const silver = shade(BASE.bone, 1.25);

  for (const side of [-1, 1] as const) {
    const panel = new THREE.Group();
    f.body.add(panel);
    f.skirt.push(panel);
    part(f, panel, skirtPanel(side, coat), 'cloth');
  }
  part(f, f.torso, mergeGeometries([
    round(0.235, 0.215, 0.36, 0.43, coat, 0.62), // chest
    round(0.215, 0.205, 0.3, 0.13, coat, 0.64), // waist
    round(0.212, 0.212, 0.06, 0, leather, 0.66), // belt...
    box(0.06, 0.05, 0.02, 0, 0, 0.142, brass), // ...and its buckle
    slab(0.075, 0.28, 0.02, -0.075, 0.44, 0.13, facing, -0.32), // lapels
    slab(0.075, 0.28, 0.02, 0.075, 0.44, 0.13, facing, 0.32),
    box(0.07, 0.11, 0.02, 0, 0.53, 0.126, shirt), // shirt in the V...
    box(0.035, 0.17, 0.02, 0, 0.47, 0.135, shade(BASE.rust, 1.1)), // ...and the tie
    box(0.025, 0.025, 0.02, 0.055, 0.3, 0.131, brass), // buttons
    box(0.025, 0.025, 0.02, 0.055, 0.19, 0.133, brass),
    slab(0.12, 0.05, 0.02, -0.12, 0.2, 0.13, facing), // pocket flaps
    slab(0.12, 0.05, 0.02, 0.13, 0.2, 0.13, facing),
    round(0.125, 0.14, 0.13, 0.67, facing, 0.95, 8, true), // the collar, turned up
    round(0.128, 0.138, 0.07, 0.61, scarf, 0.95), // the scarf about the neck...
    slab(0.07, 0.34, 0.03, 0.1, 0.44, 0.14, scarf, 0.1, 0.12), // ...its end down the front...
    slab(0.08, 0.3, 0.03, -0.06, 0.46, -0.15, scarf, -0.12), // ...and the other down the back
    slab(0.045, 0.66, 0.02, 0, 0.33, 0.134, leather, 0.72), // satchel strap
    box(0.17, 0.15, 0.08, -0.21, -0.06, 0.04, leather), // satchel, on the right hip
    box(0.15, 0.03, 0.085, -0.21, 0.02, 0.04, shade(leather, 0.8)), // its flap
  ]), 'cloth');
  const cape = part(f, f.torso, round(0.16, 0.37, 0.3, 0.49, coat, 0.66, 10, true), 'cloth'); // the Inverness cape over the shoulders
  (cape.material as THREE.ShaderMaterial).side = THREE.DoubleSide;
  const metal = shade(BASE.charcoal, 1.6);
  const [lx, ly, lz] = [0.3, -0.14, 0.02]; // the lantern hangs low at the left side of the belt, clear of the coat and the swinging arm
  const at = (g: THREE.BufferGeometry): THREE.BufferGeometry => g.translate(lx, ly, lz);
  part(f, f.torso, mergeGeometries([ // a hurricane lantern: base, guard wires, cap and bail
    at(tint(new THREE.CylinderGeometry(0.06, 0.065, 0.03, 8).translate(0, -0.08, 0), metal)),
    at(tint(new THREE.CylinderGeometry(0.035, 0.06, 0.05, 8).translate(0, 0.085, 0), metal)),
    ...[0, 1, 2, 3].map((i) => at(box(0.012, 0.15, 0.012, Math.sin(i * 1.57 + 0.78) * 0.058, 0, Math.cos(i * 1.57 + 0.78) * 0.058, metal))),
    at(tint(new THREE.TorusGeometry(0.04, 0.007, 4, 8, Math.PI).translate(0, 0.11, 0), metal)),
  ]), 'cloth');
  part(f, f.torso, at(tint(new THREE.CylinderGeometry(0.042, 0.048, 0.12, 8), LANTERN.color)), 'cloth', 1); // its glass and flame (its light: lantern.ts)
  f.flame = new THREE.Object3D();
  f.flame.position.set(lx, ly, lz);
  f.torso.add(f.flame);

  part(f, f.head, mergeGeometries([
    lump(0.105, 0.92, 1.12, 1.02, 0, 0.12, 0.012, pale), // the head
    box(0.035, 0.055, 0.05, 0, 0.105, 0.115, shade(pale, 0.93)), // nose
    box(0.165, 0.03, 0.03, 0, 0.168, 0.092, shade(BASE.charcoal, 1.3)), // brow in the hat's shadow
    box(0.075, 0.016, 0.02, 0, 0.07, 0.108, shade(BASE.charcoal, 1.5)), // moustache
    lump(0.07, 1.25, 0.55, 1.1, 0, 0.035, 0.02, shade(pale, 0.86)), // jaw
    box(0.03, 0.055, 0.045, -0.1, 0.12, 0, shade(pale, 0.9)), // ears
    box(0.03, 0.055, 0.045, 0.1, 0.12, 0, shade(pale, 0.9)),
    box(0.19, 0.09, 0.07, 0, 0.18, -0.07, dark), // hair at the back
  ]), 'cloth');
  part(f, f.head, mergeGeometries([ // snap-brim fedora: the brim dipped at the front, the crown pinched, its band
    round(0.235, 0.235, 0.02, 0, dark, 1, 14).rotateX(0.1).translate(0, 0.245, 0.01),
    round(0.108, 0.132, 0.14, 0.325, dark, 1.05, 10),
    box(0.03, 0.025, 0.19, 0, 0.39, 0, shade(dark, 0.8)),
    round(0.135, 0.135, 0.035, 0.275, shade(BASE.rust, 0.9), 1.05, 10),
  ]), 'cloth');

  // Arms: the upper sleeve at the shoulder, the forearm and cuff from the elbow, the gloved hand at the wrist.
  for (const [arm, elbow, hand] of [[f.armR, f.elbowR, f.handR], [f.armL, f.elbowL, f.handL]]) {
    part(f, arm, round(0.078, 0.066, 0.34, -0.15, sleeve, 1.05), 'cloth');
    part(f, elbow, mergeGeometries([
      round(0.064, 0.056, 0.28, -0.12, shade(sleeve, 0.94)),
      round(0.07, 0.072, 0.05, -0.25, facing), // cuff
    ]), 'cloth');
    part(f, hand, mergeGeometries([
      lump(0.05, 0.9, 1.1, 1, 0, -0.045, 0.012, leather), // glove
      box(0.03, 0.06, 0.04, 0.04, -0.02, 0.06, leather), // thumb
    ]), 'cloth');
  }
  const cane = part(f, f.handR, mergeGeometries([ // the sword-cane: silver grip, shaft, ferrule
    round(0.018, 0.016, 0.8, -0.42, shade(BASE.bone, 0.9), 1, 6).translate(0, 0, 0.02),
    box(0.11, 0.035, 0.04, 0, -0.005, 0.02, silver),
    round(0.024, 0.02, 0.06, -0.83, silver, 1, 6).translate(0, 0, 0.02),
  ]), 'wood');
  f.arms = { cane, axe: part(f, f.handR, axeGeometry(), 'wood'), razor: part(f, f.handR, razorGeometry(), 'cloth') }; // found weapons (armsMeshes.ts), shown when in hand
  f.arms.axe.visible = f.arms.razor.visible = false;
  part(f, f.handL, mergeGeometries([ // the revolver, its barrel along the arm
    box(0.045, 0.1, 0.06, 0, -0.08, 0.035, shade(BASE.rust, 0.9)),
    round(0.036, 0.036, 0.07, -0.14, dark, 1, 6).translate(0, 0, 0.03), // cylinder
    box(0.028, 0.14, 0.028, 0, -0.22, 0.03, dark),
  ]), 'cloth');
  f.flash = part(f, f.handL, box(0.16, 0.16, 0.16, 0, -0.32, 0.03, BASE.bone), 'flesh', 1);
  f.flash.visible = false;
  // Legs: the thigh at the hip, the shin and turn-up from the knee (0.42 m down), the shoe at the ankle (the soles 0.9 m below the hip).
  for (const [leg, knee, foot] of [[f.legR, f.kneeR, f.footR], [f.legL, f.kneeL, f.footL]]) {
    part(f, leg, round(0.095, 0.078, 0.47, -0.215, dark, 1.1), 'cloth');
    part(f, knee, mergeGeometries([
      round(0.077, 0.066, 0.41, -0.175, dark, 1.05),
      round(0.074, 0.074, 0.03, -0.36, shade(dark, 0.85)), // turn-up
    ]), 'cloth');
    const sole = shade(BASE.charcoal, 1.3);
    part(f, foot, mergeGeometries([box(0.13, 0.09, 0.16, 0, -0.025, -0.01, sole), lump(0.068, 1, 0.66, 1.45, 0, -0.035, 0.07, sole)]), 'cloth'); // shoe, round at the toe
  }
  return f;
}
