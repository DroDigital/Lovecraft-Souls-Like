/**
 * The small lives drawn (playtest round 18; data/fauna.ts places them by world/haunts.ts, and
 * critterLife.ts lives them): the critters of the chunks about the investigator live each frame and
 * are drawn as one instanced billboard batch over their own little atlas, with the creatures' sprite
 * shader (lit by the moon, the lantern and the lamps, fogged, dithered); fireflies are glows alone.
 * A shot, or a blow struck near, sends the birds and beasts off, and the first of a startled flock
 * cries as it goes. Under a dungeon's roof none are drawn. Read-only on the simulation.
 */

import * as THREE from 'three';
import type { V3 } from '../core/geom';
import type { CritterId } from '../data/fauna';
import { FAUNA } from '../data/tuning';
import type { VoiceId } from '../data/voices';
import type { Game } from '../systems/components';
import { nestsOf } from '../world/haunts';
import { chunkKey, chunkOf } from '../world/worldMap';
import { birth, gait, live, startle, type Life } from './critterLife';
import { createHalos } from './halos';
import { SPRITE_FRAG, SPRITE_VERT } from './shaders/sprite';
import { critterAtlas, critterCell, CRITTER_CELL } from './sprites/critters';
import { worldUniforms } from './worldMaterial';

const CAPACITY = 220;
const GLOWS = 120;
const FIREFLY = [0.9, 0.86, 0.52] as const;

export interface Fauna {
  /** Lives them and draws those near the lens; `hidden` (under a dungeon's roof): none drawn. */
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
  /** Those living now (for the debug console). */
  readonly lives: () => Life[];
}

export function createFauna(scene: THREE.Scene, g: Game, cry: (voice: VoiceId, at: V3) => void): Fauna {
  const atlas = critterAtlas();
  const tex = new THREE.DataTexture(atlas.data, atlas.width, atlas.height);
  [tex.magFilter, tex.minFilter, tex.generateMipmaps, tex.needsUpdate] = [THREE.NearestFilter, THREE.NearestFilter, false, true];
  const material = new THREE.ShaderMaterial({ uniforms: { ...worldUniforms, uAtlas: { value: tex } }, vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG });
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const attr = (n: number): THREE.InstancedBufferAttribute => new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * n), n).setUsage(THREE.DynamicDrawUsage);
  const [cells, info] = [attr(4), attr(4)];
  geo.setAttribute('aCell', cells);
  geo.setAttribute('aInfo', info);
  geo.setAttribute('aWeird', attr(1)); // none of them is wrong
  const batch = new THREE.InstancedMesh(geo, material, CAPACITY);
  batch.frustumCulled = false;
  batch.count = 0;
  const glows = createHalos(GLOWS, 0.5);
  scene.add(batch, glows.mesh);

  const lives = new Map<number, Life[]>(); // by chunk
  const me = { x: 0, y: 0, z: 0 };
  let [here, last, now, lastCry, pace] = [NaN, -1, 0, -Infinity, 0];
  const heard = (l: Life): void => {
    if (!l.def.cry || now - lastCry < FAUNA.cryGap) return;
    lastCry = now;
    cry(l.def.cry, { x: l.x, y: l.y, z: l.z });
  };
  const disturb = (at: V3, reach: number): void => {
    for (const list of lives.values()) for (const l of list) if (Math.hypot(l.x - at.x, l.z - at.z) < reach && startle(l, at)) heard(l);
  };
  g.events.on('Shot', ({ from }) => disturb(from, FAUNA.shot));
  g.events.on('Hit', ({ target, outcome }) => {
    const at = outcome === 'dodged' ? undefined : g.ecs.c.transform.get(target)?.pos;
    if (at) disturb(at, FAUNA.blow);
  });

  /** The chunks about the investigator's own: those that come into it are peopled, those left behind emptied. */
  const gather = (cx: number, cz: number): void => {
    const keep = new Set<number>();
    for (let dx = -FAUNA.near; dx <= FAUNA.near; dx++) {
      for (let dz = -FAUNA.near; dz <= FAUNA.near; dz++) {
        const key = chunkKey(cx + dx, cz + dz);
        keep.add(key);
        if (!lives.has(key)) lives.set(key, nestsOf(cx + dx, cz + dz).map(birth));
      }
    }
    for (const key of [...lives.keys()]) if (!keep.has(key)) lives.delete(key);
  };

  const m4 = new THREE.Matrix4();
  const right = new THREE.Vector3();
  return {
    lives: () => [...lives.values()].flat(),
    update(camera, time, hidden) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      [last, now] = [time, time];
      const p = g.ecs.c.transform.get(g.player.id)?.pos;
      if (p) {
        const step = Math.hypot(p.x - me.x, p.z - me.z);
        if (dt > 0) pace = step > 3 ? 0 : pace * 0.8 + (step / dt) * 0.2; // a journey's jump is no run
        Object.assign(me, { x: p.x, y: p.y, z: p.z });
        const key = chunkKey(chunkOf(p.x), chunkOf(p.z));
        if (key !== here) {
          here = key;
          gather(chunkOf(p.x), chunkOf(p.z));
        }
      }
      if (dt > 0) for (const list of lives.values()) for (const l of list) if (live(l, dt, time, me, pace)) heard(l);
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      const eye = camera.position;
      glows.begin();
      let n = 0;
      for (const list of hidden ? [] : lives.values()) {
        for (const l of list) {
          if (l.seen <= 0.02 || (l.x - eye.x) ** 2 + (l.y - eye.y) ** 2 + (l.z - eye.z) ** 2 > FAUNA.draw ** 2) continue;
          if (l.def.glow) {
            glows.put(l.x, l.y, l.z, 0.42, FIREFLY, 1.3 * l.seen);
            continue;
          }
          if (n >= CAPACITY) continue;
          const coats = atlas.coats[l.nest.critter as Exclude<CritterId, 'firefly'>];
          const coat = coats[l.nest.seed % coats.length];
          const { moving, fps } = gait(l);
          const frames = moving ? coat.move : coat.rest;
          const [cx, cy] = critterCell(frames[Math.floor((time + l.phase) * fps) % frames.length]);
          cells.setXYZW(n, cx / atlas.width, cy / atlas.height, (cx + CRITTER_CELL) / atlas.width, (cy + CRITTER_CELL) / atlas.height);
          const flip = moving ? l.vx * right.x + l.vz * right.z < 0 : l.look < 0;
          info.setXYZW(n, 0, l.seen, flip ? 1 : 0, 0);
          batch.setMatrixAt(n++, m4.makeScale(l.def.size, l.def.size, 1).setPosition(l.x, l.y, l.z));
        }
      }
      glows.end();
      batch.count = n;
      cells.needsUpdate = true;
      info.needsUpdate = true;
      batch.instanceMatrix.needsUpdate = true;
    },
  };
}
