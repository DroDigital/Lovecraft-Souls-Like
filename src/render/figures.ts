/**
 * Procedural low-poly figures (spec §3B: tweened primitives, no skeletal assets): the investigator,
 * the placeholder Deep One, the training dummy and an Echo drop. Each is a small joint hierarchy
 * that poses.ts drives. Arms and legs hang along -y from their pivots; forward is +z, the
 * figure's right is -x. Phase 2 replaces the enemies with generated sprites.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANTERN } from '../data/tuning';
import { box, tint } from './meshKit';
import { ANOMALY, BASE, mixRgb, scaleRgb, type Rgb } from './palette';
import type { TextureKind } from './textures';
import { createWorldMaterial } from './worldMaterial';

export type Rig = 'humanoid' | 'dummy' | 'echo';

export interface Figure {
  rig: Rig;
  root: THREE.Group; // at the feet, turned by yaw
  body: THREE.Group; // pelvis: lean, roll, fall
  torso: THREE.Group;
  head: THREE.Group;
  armR: THREE.Group; // shoulders
  armL: THREE.Group;
  legR: THREE.Group; // hips
  legL: THREE.Group;
  flash: THREE.Object3D | null; // muzzle flash
  hip: number; // pelvis height
  hunch: number; // resting forward lean (radians)
  materials: THREE.ShaderMaterial[];
}

interface Frame {
  hip: number;
  hunch?: number;
  shoulder: readonly [x: number, y: number];
  hipX: number;
  neck: readonly [y: number, z: number];
}

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function skeleton(rig: Rig, f: Frame): Figure {
  const root = new THREE.Group();
  const body = group(root, 0, f.hip, 0);
  const torso = group(body);
  const [sx, sy] = f.shoulder;
  return {
    rig,
    root,
    body,
    torso,
    head: group(torso, 0, f.neck[0], f.neck[1]),
    armR: group(torso, -sx, sy, 0),
    armL: group(torso, sx, sy, 0),
    legR: group(body, -f.hipX, 0, 0),
    legL: group(body, f.hipX, 0, 0),
    flash: null,
    hip: f.hip,
    hunch: f.hunch ?? 0,
    materials: [],
  };
}

/** Adds a mesh with its own world material, so a hit flash lights only this figure. Everything but Echoes is a character (rim-lit). */
function part(fig: Figure, parent: THREE.Object3D, geo: THREE.BufferGeometry, texture: TextureKind, emissive = 0): THREE.Mesh {
  const material = createWorldMaterial({ texture, uvScale: [0.5, 0.5], emissive, vertexColors: true, character: fig.rig !== 'echo' });
  fig.materials.push(material);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
}

const shade = (c: Rgb, k: number): Rgb => scaleRgb(c, k);
const cylinder = (r0: number, r1: number, h: number, y: number, c: Rgb): THREE.BufferGeometry =>
  tint(new THREE.CylinderGeometry(r0, r1, h, 9).translate(0, y, 0), c);

/**
 * A 1920s investigator in coat and fedora: sword-cane in the right hand, revolver in the left, a lantern
 * at the belt. Built from large value blocks on flat cloth: dark coat, hat and trousers, pale face and
 * hands, one light belt.
 */
function investigator(): Figure {
  const f = skeleton('humanoid', { hip: 0.92, shoulder: [0.28, 0.58], hipX: 0.11, neck: [0.64, 0] });
  const coat = shade(mixRgb(BASE.charcoal, BASE.seaGrey, 0.1), 2);
  const dark = shade(BASE.charcoal, 2);
  const pale = shade(BASE.bone, 2);
  const belt = shade(mixRgb(BASE.rust, BASE.bone, 0.3), 1.6);
  part(f, f.torso, mergeGeometries([
    box(0.44, 0.62, 0.26, 0, 0.31, 0, coat),
    box(0.48, 0.36, 0.3, 0, -0.12, 0, coat),
    box(0.5, 0.07, 0.32, 0, 0.03, 0, belt),
  ]), 'cloth');
  part(f, f.torso, box(0.1, 0.13, 0.1, 0.19, -0.1, 0.19, LANTERN.color), 'cloth', 1); // the lantern (its light: lantern.ts)
  part(f, f.head, box(0.2, 0.24, 0.22, 0, 0.13, 0.01, pale), 'cloth');
  part(f, f.head, mergeGeometries([cylinder(0.21, 0.21, 0.03, 0.26, dark), cylinder(0.12, 0.13, 0.15, 0.34, dark)]), 'cloth');
  for (const arm of [f.armR, f.armL]) {
    part(f, arm, mergeGeometries([box(0.12, 0.58, 0.13, 0, -0.29, 0, coat), box(0.09, 0.1, 0.1, 0, -0.63, 0.01, pale)]), 'cloth');
  }
  part(f, f.armR, box(0.035, 0.8, 0.035, 0, -1.0, 0.02, shade(BASE.bone, 0.9)), 'wood');
  part(f, f.armL, box(0.05, 0.2, 0.09, 0, -0.68, 0.02, dark), 'cloth');
  f.flash = part(f, f.armL, box(0.16, 0.16, 0.16, 0, -0.86, 0.02, BASE.bone), 'flesh', 1);
  f.flash.visible = false;
  for (const leg of [f.legR, f.legL]) part(f, leg, box(0.16, 0.9, 0.18, 0, -0.45, 0, dark), 'cloth');
  return f;
}

/** Placeholder Deep One: hunched, broad, a flat fish head with pale staring eyes, a dorsal fin, long clawed arms. */
function deepOne(): Figure {
  const f = skeleton('humanoid', { hip: 0.82, hunch: 0.38, shoulder: [0.33, 0.6], hipX: 0.13, neck: [0.66, 0.1] });
  const hide = shade(mixRgb(BASE.seaGrey, BASE.charcoal, 0.7), 1.1); // dark wet hide: reads against the lantern-lit floor
  const eye = shade(BASE.bone, 1.15);
  part(f, f.torso, mergeGeometries([box(0.54, 0.7, 0.38, 0, 0.35, 0, hide), box(0.04, 0.6, 0.34, 0, 0.42, -0.24, shade(hide, 0.7))]), 'flesh');
  part(
    f,
    f.head,
    mergeGeometries([
      box(0.36, 0.26, 0.42, 0, 0.12, 0.08, hide),
      box(0.1, 0.1, 0.1, -0.16, 0.17, 0.25, eye),
      box(0.1, 0.1, 0.1, 0.16, 0.17, 0.25, eye),
      box(0.28, 0.03, 0.03, 0, 0.03, 0.3, shade(BASE.charcoal, 1.5)),
    ]),
    'flesh',
  );
  const claws = (x: number): THREE.BufferGeometry => box(0.03, 0.18, 0.03, x, -0.95, 0.03, shade(BASE.bone, 0.9));
  for (const arm of [f.armR, f.armL]) {
    part(f, arm, mergeGeometries([box(0.14, 0.86, 0.15, 0, -0.43, 0, hide), claws(-0.05), claws(0), claws(0.05)]), 'flesh');
  }
  for (const leg of [f.legR, f.legL]) {
    part(f, leg, mergeGeometries([box(0.2, 0.8, 0.22, 0, -0.4, 0, hide), box(0.24, 0.05, 0.34, 0, -0.8, 0.07, hide)]), 'flesh');
  }
  return f;
}

/** A post with a crossbar and a stuffed sack; the whole thing wobbles from its base. */
function dummy(): Figure {
  const f = skeleton('dummy', { hip: 0.05, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const wood = shade(BASE.bone, 0.9);
  part(f, f.body, mergeGeometries([box(0.14, 1.85, 0.14, 0, 0.9, 0, wood), box(1.1, 0.1, 0.1, 0, 1.25, 0, wood)]), 'wood');
  part(f, f.body, mergeGeometries([box(0.46, 0.66, 0.32, 0, 1.02, 0, BASE.bone), box(0.28, 0.28, 0.28, 0, 1.56, 0, BASE.bone)]), 'rot');
  return f;
}

/** Dropped Echoes: a small spinning Void Green shard (anomaly colour: Echoes are wrong). */
function echo(): Figure {
  const f = skeleton('echo', { hip: 0.55, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const shard = (r: number, y: number): THREE.BufferGeometry => tint(new THREE.OctahedronGeometry(r, 0).translate(0, y, 0), ANOMALY.green);
  part(f, f.body, mergeGeometries([shard(0.2, 0), shard(0.08, 0.34), shard(0.06, -0.3)]), 'flesh', 0.9);
  return f;
}

const BUILDERS: Record<string, () => Figure> = { player: investigator, deepOne, dummy, echo };

export function buildFigure(model: string): Figure {
  return (BUILDERS[model] ?? dummy)();
}
