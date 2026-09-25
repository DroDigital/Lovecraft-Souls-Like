/**
 * Procedural low-poly figures (spec §3B: tweened primitives, no skeletal assets): the investigator,
 * the placeholder Deep One, the training dummy, an Echo drop, a tome on its lectern, a note on its
 * crate, the world's Elder Signs and gates, and the people met in the dream (npcFigures.ts). Each is a
 * small joint hierarchy that poses.ts drives: shoulders, elbows and wrists; hips and knees. Arms and
 * legs hang along -y from their pivots; forward is +z, the figure's right is -x. Phase 2 replaces the
 * enemies with generated sprites.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, tint } from './meshKit';
import { ANOMALY, BASE, mixRgb, scaleRgb, type Rgb } from './palette';
import type { TextureKind } from './textures';
import { investigator } from './investigator';
import { npcFigure } from './npcFigures';
import { elderSignGeometry, gateGeometry } from './signMeshes';
import { createWorldMaterial } from './worldMaterial';

export type Rig = 'humanoid' | 'dummy' | 'echo' | 'prop';

export interface Figure {
  rig: Rig;
  root: THREE.Group; // at the feet, turned by yaw
  body: THREE.Group; // pelvis: lean, roll, fall
  torso: THREE.Group;
  head: THREE.Group;
  armR: THREE.Group; // shoulders: the upper arms
  armL: THREE.Group;
  elbowR: THREE.Group; // elbows: the forearms
  elbowL: THREE.Group;
  handR: THREE.Group; // wrists: the hands and what they hold
  handL: THREE.Group;
  legR: THREE.Group; // hips: the thighs
  legL: THREE.Group;
  kneeR: THREE.Group; // knees: the shins
  kneeL: THREE.Group;
  footR: THREE.Group; // ankles: the feet, kept level on the ground (gait.ts)
  footL: THREE.Group;
  skirt: THREE.Group[]; // coat panels hung at the hips, right then left, swinging with the thighs (poses.ts)
  flash: THREE.Object3D | null; // muzzle flash
  hip: number; // pelvis height
  thigh: number; // hip to knee
  shin: number; // knee to sole
  ankle: number; // sole to ankle
  hunch: number; // resting forward lean (radians)
  character?: 'player' | 'creature'; // rim-lit in the post pass (Echo drops and props are not characters)
  materials: THREE.ShaderMaterial[];
}

interface Frame {
  hip: number;
  hunch?: number;
  shoulder: readonly [x: number, y: number];
  hipX: number;
  neck: readonly [y: number, z: number];
  leg?: number; // hip to sole (default: the pelvis height)
  thigh?: number; // hip to knee (default: under half the leg)
  upper?: number; // shoulder to elbow
  fore?: number; // elbow to wrist
  ankle?: number; // sole to ankle
}

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function skeleton(rig: Rig, f: Frame): Figure {
  const root = new THREE.Group();
  const body = group(root, 0, f.hip, 0);
  const torso = group(body);
  const [sx, sy] = f.shoulder;
  const [leg, upper, fore] = [f.leg ?? f.hip, f.upper ?? 0.3, f.fore ?? 0.28];
  const thigh = f.thigh ?? leg * 0.47;
  const [armR, armL] = [group(torso, -sx, sy, 0), group(torso, sx, sy, 0)];
  const [legR, legL] = [group(body, -f.hipX, 0, 0), group(body, f.hipX, 0, 0)];
  const [elbowR, elbowL] = [group(armR, 0, -upper, 0), group(armL, 0, -upper, 0)];
  const ankle = f.ankle ?? 0.07;
  const [kneeR, kneeL] = [group(legR, 0, -thigh, 0), group(legL, 0, -thigh, 0)];
  return {
    rig,
    root,
    body,
    torso,
    head: group(torso, 0, f.neck[0], f.neck[1]),
    armR,
    armL,
    elbowR,
    elbowL,
    handR: group(elbowR, 0, -fore, 0),
    handL: group(elbowL, 0, -fore, 0),
    legR,
    legL,
    kneeR,
    kneeL,
    footR: group(kneeR, 0, ankle + thigh - leg, 0),
    footL: group(kneeL, 0, ankle + thigh - leg, 0),
    skirt: [],
    flash: null,
    hip: f.hip,
    thigh,
    shin: leg - thigh,
    ankle,
    hunch: f.hunch ?? 0,
    character: rig === 'echo' || rig === 'prop' ? undefined : 'creature',
    materials: [],
  };
}

/** Adds a mesh with its own world material, so a hit flash lights only this figure. */
export function part(fig: Figure, parent: THREE.Object3D, geo: THREE.BufferGeometry, texture: TextureKind, emissive = 0): THREE.Mesh {
  const material = createWorldMaterial({ texture, uvScale: [0.5, 0.5], emissive, vertexColors: true, character: fig.character });
  fig.materials.push(material);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
}

export const shade = (c: Rgb, k: number): Rgb => scaleRgb(c, k);
export const cylinder = (r0: number, r1: number, h: number, y: number, c: Rgb): THREE.BufferGeometry =>
  tint(new THREE.CylinderGeometry(r0, r1, h, 9).translate(0, y, 0), c);

/** Placeholder Deep One: hunched, broad, a flat fish head with pale staring eyes that glint, a dorsal fin, long clawed arms. */
function deepOne(): Figure {
  const f = skeleton('humanoid', { hip: 0.82, hunch: 0.38, shoulder: [0.33, 0.6], hipX: 0.13, neck: [0.66, 0.1], leg: 0.825, thigh: 0.4, upper: 0.42, fore: 0.44, ankle: 0.055 });
  const hide = shade(mixRgb(BASE.seaGrey, BASE.bone, 0.4), 1.7); // pale grey-green: never merges with the dark player
  const eye = shade(BASE.bone, 1.15);
  part(f, f.torso, mergeGeometries([box(0.54, 0.7, 0.38, 0, 0.35, 0, hide), box(0.04, 0.6, 0.34, 0, 0.42, -0.24, shade(hide, 0.7))]), 'flesh');
  part(f, f.head, mergeGeometries([box(0.36, 0.26, 0.42, 0, 0.12, 0.08, hide), box(0.28, 0.03, 0.03, 0, 0.03, 0.3, shade(BASE.charcoal, 1.5))]), 'flesh');
  part(f, f.head, mergeGeometries([box(0.1, 0.1, 0.1, -0.16, 0.17, 0.25, eye), box(0.1, 0.1, 0.1, 0.16, 0.17, 0.25, eye)]), 'cloth', 0.85);
  const claws = (x: number): THREE.BufferGeometry => box(0.03, 0.18, 0.03, x, -0.53, 0.03, shade(BASE.bone, 0.9));
  for (const [arm, elbow] of [[f.armR, f.elbowR], [f.armL, f.elbowL]]) {
    part(f, arm, box(0.14, 0.45, 0.15, 0, -0.21, 0, hide), 'flesh');
    part(f, elbow, mergeGeometries([box(0.13, 0.45, 0.14, 0, -0.21, 0, hide), claws(-0.05), claws(0), claws(0.05)]), 'flesh');
  }
  for (const [leg, knee, foot] of [[f.legR, f.kneeR, f.footR], [f.legL, f.kneeL, f.footL]]) {
    part(f, leg, box(0.21, 0.43, 0.23, 0, -0.2, 0, hide), 'flesh');
    part(f, knee, box(0.19, 0.41, 0.21, 0, -0.195, 0, hide), 'flesh');
    part(f, foot, box(0.24, 0.05, 0.34, 0, -0.03, 0.07, hide), 'flesh');
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

/** A tome lying open on a lectern: a post, a slanted desk, and pale pages that glow faintly, so it reads in the dark. */
function tome(): Figure {
  const f = skeleton('prop', { hip: 0, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const wood = shade(mixRgb(BASE.rust, BASE.charcoal, 0.4), 1.6);
  const desk = box(0.62, 0.05, 0.46, 0, 0, 0, wood).rotateX(0.45).translate(0, 1.08, 0); // slopes down toward the reader (+z)
  part(f, f.body, mergeGeometries([box(0.12, 1.02, 0.12, 0, 0.51, 0, wood), box(0.44, 0.06, 0.34, 0, 0.03, 0, wood), desk]), 'wood');
  const leaf = (x: number, tilt: number): THREE.BufferGeometry =>
    box(0.25, 0.025, 0.34, x, 0.04, 0, shade(BASE.bone, 1.05)).rotateZ(tilt).rotateX(0.45).translate(0, 1.1, 0);
  part(f, f.body, mergeGeometries([leaf(-0.13, 0.12), leaf(0.13, -0.12)]), 'cloth', 0.7);
  return f;
}

/** A Silver Vial on a stone plinth: a flask of West's Reagent glowing Void Green, so it reads in the dark. */
function vial(): Figure {
  const f = skeleton('prop', { hip: 0, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const stone = shade(BASE.seaGrey, 1.5);
  part(f, f.body, mergeGeometries([box(0.4, 0.8, 0.4, 0, 0.4, 0, stone), box(0.52, 0.08, 0.52, 0, 0.84, 0, stone)]), 'stone');
  const glass = ANOMALY.green;
  part(f, f.body, mergeGeometries([cylinder(0.07, 0.09, 0.2, 1.0, glass), cylinder(0.025, 0.03, 0.1, 1.15, shade(BASE.bone, 1.2))]), 'cloth', 0.95);
  return f;
}

/** An Elder Sign (spec §3D): the carved slab, its glyph glowing faintly so it reads in the dark. */
function elderSign(): Figure {
  const f = skeleton('prop', { hip: 0, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const { slab, glyph } = elderSignGeometry();
  part(f, f.body, slab, 'stone');
  part(f, f.body, glyph, 'stone', 0.9);
  return f;
}

/** A gate to another realm: a stone frame banded with glowing glyphs, a dim purple veil between its jambs. */
function gate(): Figure {
  const f = skeleton('prop', { hip: 0, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const { frame, glyphs, veil } = gateGeometry();
  part(f, f.body, frame, 'stone', 0.12);
  part(f, f.body, glyphs, 'stone', 1);
  part(f, f.body, veil, 'water', 0.8);
  return f;
}

/** A note left on a crate: a letter or a clipping, its paper glowing faintly so it reads in the dark. */
function note(): Figure {
  const f = skeleton('prop', { hip: 0, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  part(f, f.body, box(0.6, 0.5, 0.45, 0, 0.25, 0, shade(mixRgb(BASE.rust, BASE.charcoal, 0.3), 1.7)), 'wood');
  part(f, f.body, box(0.26, 0.02, 0.34, 0.05, 0.51, 0, shade(BASE.bone, 1.1)).rotateY(0.3), 'cloth', 0.7);
  return f;
}

/** An Echo cache: an iron-bound casket, its lid thrown back on Void Green shards (Echoes are wrong), so it reads in the dark. */
function cache(): Figure {
  const f = skeleton('prop', { hip: 0, shoulder: [0, 0], hipX: 0, neck: [0, 0] });
  const wood = shade(mixRgb(BASE.rust, BASE.charcoal, 0.5), 1.6);
  const iron = shade(BASE.charcoal, 1.3);
  const lid = box(0.56, 0.05, 0.38, 0, 0, 0.19, wood).rotateX(-2.1).translate(0, 0.3, -0.19); // hinged at the back, thrown open
  part(f, f.body, mergeGeometries([box(0.56, 0.3, 0.38, 0, 0.15, 0, wood), box(0.58, 0.04, 0.4, 0, 0.07, 0, iron), box(0.58, 0.04, 0.4, 0, 0.23, 0, iron), lid]), 'wood');
  const shard = (r: number, x: number, z: number): THREE.BufferGeometry => tint(new THREE.OctahedronGeometry(r, 0).translate(x, 0.32, z), ANOMALY.green);
  part(f, f.body, mergeGeometries([shard(0.07, -0.13, 0.03), shard(0.09, 0.03, -0.04), shard(0.06, 0.15, 0.06)]), 'flesh', 0.9);
  return f;
}

const BUILDERS: Record<string, () => Figure> = { player: investigator, deepOne, dummy, echo, tome, vial, elderSign, gate, note, cache };

export function buildFigure(model: string): Figure {
  if (model.startsWith('npc:')) return npcFigure(model.slice(4));
  return (BUILDERS[model] ?? dummy)();
}
