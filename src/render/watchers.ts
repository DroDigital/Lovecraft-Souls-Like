/**
 * The watchers (round 26: a failing mind showed in the picture and the sound, never in the world): from the
 * Fractured on, now and then a tall dark figure stands far off on open ground, turned to the investigator,
 * where there was nobody. It is put behind them and out of the corner of the eye, so it is found by turning;
 * it does not move. Looked at squarely for a moment it is gone, and it is gone as they come near. Fewer the
 * steadier the mind; none in a dungeon, in the arena or under a cutscene. They are not creatures (nothing
 * in the simulation, nothing to strike or to fear): only what a mind makes of the dark. Render only.
 */

import * as THREE from 'three';
import { hasLineOfSight } from '../world/colliders';
import { SANITY } from '../data/tuning';
import type { Game } from '../systems/components';
import { box } from './meshKit';
import { createWorldMaterial } from './worldMaterial';

/** How many watchers a mind at `sanity` is given. */
export const watchersFor = (sanity: number): number => (sanity >= SANITY.bands[1] ? 0 : sanity >= SANITY.bands[2] + 10 ? 1 : sanity >= SANITY.bands[2] - 5 ? 2 : 3);

const NEAR = 18; // metres: closer than this and it is gone
const SPAWN = [42, 78] as const; // metres it is put at
const STARE = 0.22; // radians either side of where the lens looks that count as looking at it
const LOOK_AT = 1.6; // seconds looked at before it goes
const LIFE = [50, 110] as const; // seconds it stays, unwatched

interface Watcher {
  mesh: THREE.Mesh;
  born: number;
  life: number;
  looked: number; // seconds looked at
  gone: number; // seconds since it began to go (-1: not going)
}

/** A man too tall, too thin, arms to the knee and the head a little on one side. */
function figure(): THREE.BufferGeometry {
  const black = [0.03, 0.03, 0.035] as const;
  const parts = [
    box(0.42, 1.25, 0.24, 0, 1.2, 0, black),
    box(0.26, 0.3, 0.26, 0.05, 2.0, 0, black),
    box(0.12, 1.35, 0.14, -0.3, 1.2, 0, black),
    box(0.12, 1.35, 0.14, 0.3, 1.2, 0, black),
    box(0.15, 0.85, 0.16, -0.12, 0.42, 0, black),
    box(0.15, 0.85, 0.16, 0.12, 0.42, 0, black),
  ];
  const merged = new THREE.BufferGeometry();
  const pos: number[] = [];
  const col: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    for (const name of ['position', 'color', 'normal', 'uv'] as const) {
      const a = g.getAttribute(name);
      const out = name === 'position' ? pos : name === 'color' ? col : name === 'normal' ? nrm : uv;
      for (let i = 0; i < a.count * a.itemSize; i++) out.push(a.array[i]);
    }
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return merged;
}

export interface Watchers {
  update(camera: THREE.Camera, time: number, hidden: boolean, vanished: () => void): void;
}

export function createWatchers(scene: THREE.Scene, g: Game): Watchers {
  const geometry = figure();
  const material = createWorldMaterial({ texture: 'stone', vertexColors: true, character: 'creature', eldritch: 0.7, bodyScale: 2.2 });
  const list: Watcher[] = [];
  const dir = new THREE.Vector3();
  let last = -1;
  const drop = (w: Watcher): void => void scene.remove(w.mesh);
  return {
    update(camera, time, hidden, vanished) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const me = g.overworld ? g.ecs.c.transform.get(g.player.id)?.pos : undefined;
      const want = hidden || !me ? 0 : watchersFor(g.mind.sanity);
      camera.getWorldDirection(dir);
      const look = Math.atan2(dir.x, dir.z);
      for (const w of [...list]) {
        const [dx, dz] = [w.mesh.position.x - camera.position.x, w.mesh.position.z - camera.position.z];
        const bearing = Math.atan2(dx, dz);
        const off = Math.abs(Math.atan2(Math.sin(bearing - look), Math.cos(bearing - look)));
        if (w.gone < 0) {
          w.looked = off < STARE ? w.looked + dt : Math.max(0, w.looked - dt * 0.5);
          const done = Math.hypot(dx, dz) < NEAR || time - w.born > w.life || list.length > want;
          if (w.looked > LOOK_AT || done) {
            w.gone = 0;
            if (w.looked > LOOK_AT) vanished(); // seen, and gone: a breath of a whisper
          }
        } else w.gone += dt;
        const fade = w.gone >= 0 ? 1 - w.gone / 0.6 : Math.min(1, (time - w.born) / 3);
        w.mesh.visible = fade >= 1 || Math.random() < fade; // it flickers in and out of being
        w.mesh.rotation.y = bearing + Math.PI; // turned to them
        if (w.gone > 0.6) {
          drop(w);
          list.splice(list.indexOf(w), 1);
        }
      }
      if (!me || list.length >= want || Math.random() > dt * 0.25) return;
      const a = look + Math.PI * (0.55 + 0.9 * Math.random()) * (Math.random() < 0.5 ? -1 : 1); // behind them, or out at the edge of sight
      const r = SPAWN[0] + (SPAWN[1] - SPAWN[0]) * Math.random();
      const [x, z] = [camera.position.x + Math.sin(a) * r, camera.position.z + Math.cos(a) * r];
      const y = g.world.ground(x, z);
      if (!hasLineOfSight(g.world, { x: camera.position.x, y: camera.position.y, z: camera.position.z }, { x, y: y + 1.6, z })) return;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.frustumCulled = false;
      scene.add(mesh);
      list.push({ mesh, born: time, life: LIFE[0] + (LIFE[1] - LIFE[0]) * Math.random(), looked: 0, gone: -1 });
    },
  };
}
