/**
 * Things in the sea (round 30): when the investigator looks out over open water, now and then, far
 * off, a tentacle comes up out of it, writhes, curls its tip, and goes under again, a silhouette in the
 * haze that may have been nothing. Sometimes two, or three. Where it breaks the water a ring of
 * spray, and a low sound; they come the more often the less sound the mind is. Never in a dungeon,
 * in a fight, or where there is no sea ahead. Render only: it is never a creature, and never touched.
 */

import * as THREE from 'three';
import { WORLD } from '../data/tuning';
import type { Game } from '../systems/components';
import { engagedFights } from '../systems/bossFight';
import { madnessOf } from '../systems/sanity';
import type { GameAudio } from './audio/gameAudio';
import type { Particles } from './particles';
import { SEA } from './sea';
import { seaHeight } from './seaWaves';
import { centreline, done, LIFE, pickSpot, radius, rise } from './tentacleShape';
import { createWorldMaterial } from './worldMaterial';

const STEPS = 14;
const SIDES = 7;
const EVERY = [38, 110] as const; // seconds between visitations, at ease
const FIRST = 20; // seconds of looking at open water before the first

interface One {
  x: number;
  z: number;
  yaw: number; // the way it leans
  born: number;
  hold: number;
  length: number;
  thick: number;
  seed: number;
  mesh: THREE.Mesh;
  splashed: number; // seconds of its last splash
}

function build(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const n = (STEPS + 1) * SIDES;
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const uv = new Float32Array(n * 2);
  const index: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j < SIDES; j++) {
      uv.set([(j / SIDES) * 2, (i / STEPS) * 7], (i * SIDES + j) * 2);
      if (i < STEPS) {
        const [a, b, c, d] = [i * SIDES + j, i * SIDES + ((j + 1) % SIDES), (i + 1) * SIDES + j, (i + 1) * SIDES + ((j + 1) % SIDES)];
        index.push(a, c, b, b, c, d);
      }
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

export interface Tentacles {
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
}

export function createTentacles(scene: THREE.Scene, g: Game, particles: Particles, audio: GameAudio): Tentacles {
  const material = createWorldMaterial({ texture: 'flesh', uvScale: [1.5, 3], vertexColors: true, vary: 0.4, seed: 4 });
  const live: One[] = [];
  let next = Infinity; // when the next may come; Infinity until the investigator first looks at open water
  let looking = 0; // seconds looked at open water so far
  let last = -1;
  let seed = 29;
  const rand = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const water = (x: number, z: number): boolean => g.world.ground(x, z) < WORLD.seaLevel - 1.2;
  const forward = new THREE.Vector3();

  function spray(t: One, time: number, amount: number): void {
    const y = WORLD.seaLevel + seaHeight(t.x, t.z, time, SEA.chop.value);
    for (let i = 0; i < amount; i++) {
      const a = rand() * Math.PI * 2;
      const s = 0.5 + rand() * 1.6;
      particles.spawn({ x: t.x + Math.cos(a) * t.thick, y: y + 0.2, z: t.z + Math.sin(a) * t.thick, vx: Math.cos(a) * s, vy: 1.8 + rand() * 2.6, vz: Math.sin(a) * s, life: 0.8 + rand() * 0.6, size: 0.9 + rand() * 0.9, grow: 2.2, color: [0.62, 0.68, 0.66], alpha: 0.4, gravity: 5, drag: 0.4 });
    }
  }

  function summon(from: THREE.Vector3, yaw: number, time: number): boolean {
    const spot = pickSpot(from, yaw, rand, water);
    if (!spot) return false;
    const count = rand() < 0.62 ? 1 : rand() < 0.7 ? 2 : 3;
    for (let k = 0; k < count; k++) {
      const x = spot.x + (k ? (rand() * 2 - 1) * 9 : 0);
      const z = spot.z + (k ? (rand() * 2 - 1) * 9 : 0);
      if (!water(x, z)) continue;
      const mesh = new THREE.Mesh(build(), material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      live.push({
        x, z, yaw: Math.atan2(from.x - x, from.z - z) + (rand() < 0.5 ? 1 : -1) * (0.6 + rand() * 1.4), // it leans this way or that, not always toward them
        born: time + k * (0.6 + rand() * 1.6),
        hold: LIFE.hold[0] + (LIFE.hold[1] - LIFE.hold[0]) * rand(),
        length: LIFE.height[0] + (LIFE.height[1] - LIFE.height[0]) * rand(),
        thick: LIFE.thick[0] + (LIFE.thick[1] - LIFE.thick[0]) * rand(),
        seed: rand() * 10,
        mesh,
        splashed: -9,
      });
    }
    audio.far('gurgle', 0.55, 0.62 + rand() * 0.2);
    if (rand() < 0.3) audio.far('whale', 0.32, 0.55);
    return true;
  }

  function pose(t: One, time: number): void {
    const r = rise(time - t.born, t.hold);
    const length = Math.max(0.5, t.length * r);
    const line = centreline(length, time - t.born, t.seed, STEPS);
    const base = WORLD.seaLevel + seaHeight(t.x, t.z, time, SEA.chop.value);
    const [sy, cy] = [Math.sin(t.yaw), Math.cos(t.yaw)];
    const pos = t.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = t.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    line.forEach(([lx, ly, lz], i) => {
      const s = Math.max(0, (i - 1) / STEPS);
      const rad = radius(s, t.thick) * (0.55 + 0.45 * Math.min(1, r * 2)); // thin as it comes up, whole at length
      const [px, pz] = [t.x + lx * sy + lz * cy, t.z + lx * cy - lz * sy]; // its lean turned to its heading
      for (let j = 0; j < SIDES; j++) {
        const a = (j / SIDES) * Math.PI * 2;
        const [ox, oz] = [Math.cos(a) * rad, Math.sin(a) * rad];
        pos.setXYZ(i * SIDES + j, px + ox, base + ly, pz + oz);
        const band = 0.5 + 0.5 * Math.sin(s * 40 + t.seed); // pale bands, as of its rings
        const wet = 0.7 + 0.3 * s;
        col.setXYZ(i * SIDES + j, (0.2 + 0.12 * band) * wet, (0.34 + 0.16 * band) * wet, (0.3 + 0.12 * band) * wet);
      }
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
    t.mesh.geometry.computeVertexNormals();
  }

  return {
    update(camera, time, hidden) {
      const dt = last < 0 ? 0 : Math.min(0.2, Math.max(0, time - last));
      last = time;
      const ow = g.overworld;
      const me = g.ecs.c.transform.get(g.player.id)?.pos;
      const calm = !hidden && !!ow && !!me && engagedFights(g).length === 0 && g.player.listening === null;
      camera.getWorldDirection(forward);
      const yaw = Math.atan2(forward.x, forward.z);
      if (calm && me) {
        const out = pickSpot(camera.position, yaw, () => 0.5, water, 1); // is there open sea straight ahead?
        looking = out ? looking + dt : Math.max(0, looking - dt * 2);
        if (looking > FIRST && next === Infinity) next = time + 3;
        if (time >= next && out) {
          const slow = 1 - 0.5 * madnessOf(g.mind.sanity); // a failing mind sees more
          next = summon(camera.position, yaw, time) ? time + (EVERY[0] + (EVERY[1] - EVERY[0]) * rand()) * slow : time + 4;
        }
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const t = live[i];
        const age = time - t.born;
        t.mesh.visible = age >= 0 && !hidden;
        if (age < 0) continue;
        if (done(age, t.hold) || hidden) {
          scene.remove(t.mesh);
          t.mesh.geometry.dispose();
          live.splice(i, 1);
          continue;
        }
        pose(t, time);
        const moving = age < LIFE.emerge * 0.7 || age > LIFE.emerge + t.hold; // spray where it breaks the water as it rises and as it goes down
        if (moving && time - t.splashed > 0.18) {
          t.splashed = time;
          spray(t, time, 3);
        }
      }
    },
  };
}
