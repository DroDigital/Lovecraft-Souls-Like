/**
 * The dungeons' doors, drawn and moved (round 27; data/doors.ts, render/doorShapes.ts): each stands
 * closed in its doorway (some a little ajar) and opens as the investigator, or any foe, comes
 * near, swinging away from whoever opened it, and closes again behind them. A door is made only
 * while the camera is within reach of it. A door never stops a body: the doorway stays clear
 * (world/dungeonParts.ts), so nothing is caught, the audits' walks stand, and a foe in the
 * way is passed through as a door opens in front of it. Render only.
 */

import * as THREE from 'three';
import type { DoorKind, DoorLook } from '../data/doors';
import type { Game } from '../systems/components';
import { gatePlan, type DoorSpec } from '../world/gatePlan';
import { worldLayout } from '../world/placements';
import type { GameAudio } from './audio/gameAudio';
import { doorParts } from './doorShapes';

const MAKE = 70; // metres: nearer than this a door is made...
const KEEP = 100; // ...and farther than this it is put away
const SWING = 1.6; // radians a leaf opens
/** Metres at which it begins to open, and how long (seconds) it takes. */
const KIND: Readonly<Record<DoorKind, { reach: number; seconds: number }>> = {
  plank: { reach: 4.2, seconds: 0.8 },
  grille: { reach: 4.2, seconds: 0.6 },
  slab: { reach: 6.5, seconds: 1.5 },
  membrane: { reach: 4.2, seconds: 1.1 },
  curtain: { reach: 3.4, seconds: 0.6 },
};
const HOLD = 2; // metres farther a door stays open once it is

interface Door {
  spec: DoorSpec;
  group: THREE.Group | null;
  leaves: [THREE.Group, THREE.Group] | null;
  open: number; // 0 shut .. 1 open
  touched: boolean; // approached: an ajar door shuts from then on
  sign: 1 | -1; // which way it swings
  wasShut: boolean;
  quiet: number; // seconds until it may sound again
}

/** How open a door wants to be: wide when someone is within `reach` (farther than that, while it is open), else shut, or ajar until first approached. */
export function wantOpen(d: { ajar: boolean; touched: boolean }, nearest: number, reach: number, isOpen: boolean): number {
  if (nearest < (isOpen ? reach + HOLD : reach)) return 1;
  return d.ajar && !d.touched ? 0.35 : 0;
}

/** The pose of a door's leaves at `open`, for its look. Pure. */
export function pose(look: DoorLook, open: number, sign: 1 | -1, height: number, width: number, time: number): { left: THREE.Euler; right: THREE.Euler; scaleX: number; scaleZ: number; lift: number; slide: number } {
  const swing = look.kind === 'plank' || look.kind === 'grille' ? open * SWING * sign : 0;
  const draw = look.kind === 'curtain' || look.kind === 'membrane' ? 1 - 0.86 * open : 1;
  return {
    left: new THREE.Euler(0, swing, 0), right: new THREE.Euler(0, -swing, 0),
    scaleX: draw, scaleZ: look.kind === 'membrane' ? 1 + 0.07 * Math.sin(time * 1.6) : 1,
    lift: look.kind === 'slab' && !look.slide ? -open * (height + 0.3) : 0,
    slide: look.kind === 'slab' && look.slide ? open * (width + 0.5) : 0,
  };
}

export interface DoorViews {
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
}

export function createDoors(scene: THREE.Scene, g: Game, audio: GameAudio): DoorViews {
  const doors: Door[] = gatePlan(worldLayout()).doors.map((spec) => ({ spec, group: null, leaves: null, open: spec.ajar ? 0.35 : 0, touched: false, sign: 1, wasShut: true, quiet: 0 }));
  let last = -1;

  const make = (d: Door): void => {
    const { spec } = d;
    const parts = doorParts(spec.look, spec.width, spec.height);
    const group = new THREE.Group();
    group.position.set(spec.x, spec.y, spec.z);
    group.rotation.y = spec.yaw;
    const leaf = (part: { geo: THREE.BufferGeometry; glow?: THREE.BufferGeometry }, x: number): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.x = x;
      pivot.add(new THREE.Mesh(part.geo, parts.solid));
      if (part.glow) pivot.add(new THREE.Mesh(part.glow, parts.shine));
      group.add(pivot);
      return pivot;
    };
    const slab = spec.look.kind === 'slab';
    d.leaves = [leaf(parts.left, slab ? 0 : -spec.width / 2), leaf(parts.right, spec.width / 2)];
    if (slab) d.leaves[1].visible = false;
    if (parts.frame) group.add(new THREE.Mesh(parts.frame, parts.solid));
    scene.add(group);
    d.group = group;
  };
  const drop = (d: Door): void => {
    if (d.group) scene.remove(d.group); // its geometry and materials are shared, so nothing is disposed
    d.group = d.leaves = null;
  };

  return {
    update(camera, time, hidden) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const c = g.ecs.c;
      const me = c.transform.get(g.player.id)?.pos;
      const movers: { x: number; z: number }[] = []; // who may open a door: anything awake that is about
      for (const [e, br] of c.brain) {
        const p = c.transform.get(e)?.pos;
        if (p && br.state !== 'hidden' && !c.dead.has(e) && Math.hypot(p.x - camera.position.x, p.z - camera.position.z) < MAKE + 20) movers.push(p);
      }
      if (me) movers.push(me);
      for (const d of doors) {
        const { spec } = d;
        const far = Math.hypot(spec.x - camera.position.x, spec.z - camera.position.z);
        if (hidden || far > KEEP) {
          if (d.group) drop(d);
          continue;
        }
        if (!d.group) {
          if (far > MAKE) continue;
          make(d);
        }
        const k = KIND[spec.look.kind];
        let near = Infinity;
        for (const m of movers) near = Math.min(near, Math.hypot(m.x - spec.x, m.z - spec.z));
        const want = wantOpen({ ajar: spec.ajar, touched: d.touched }, near, k.reach, d.open > 0.5);
        if (want === 1 && near < k.reach) d.touched = true;
        if (want > 0 && d.open < 0.05 && me) { // it begins to open: away from the investigator
          const [nx, nz] = [Math.sin(spec.yaw), Math.cos(spec.yaw)];
          d.sign = (me.x - spec.x) * nx + (me.z - spec.z) * nz > 0 ? 1 : -1;
        }
        const was = d.open;
        d.open += Math.sign(want - d.open) * Math.min(Math.abs(want - d.open), dt / k.seconds);
        d.quiet -= dt;
        if (d.open - was > 0 && was < 0.04 && d.quiet <= 0 && near < 12 && spec.look.creak !== 'none') {
          d.quiet = 1.5;
          audio.sample(spec.look.creak === 'rumble' ? 'rumble' : spec.look.creak === 'flesh' ? 'flesh' : 'thud', { gain: spec.look.creak === 'thud' ? 0.3 : 0.4, pitch: spec.look.creak === 'rumble' ? 0.7 : 0.8 + 0.2 * Math.random() });
        }
        const p = pose(spec.look, d.open, d.sign, spec.height, spec.width, time);
        const [l, r] = d.leaves!;
        l.rotation.copy(p.left);
        r.rotation.copy(p.right);
        for (const leaf of [l, r]) leaf.scale.set(p.scaleX, 1, p.scaleZ);
        if (spec.look.kind === 'slab') {
          l.position.set(p.slide, p.lift, 0);
          l.rotation.z = spec.look.tilt ?? 0;
        }
      }
    },
  };
}
