/**
 * The weather drawn (round 26; systems/weather.ts has what it is): rain as a few hundred thin streaks
 * falling in a box about the lens, slanted a little by the wind and thinned or thickened as the spell
 * comes and goes; a gale as dust and leaves racing one way past the investigator; the dream's motes as
 * slow lights rising and drifting. None under a dungeon's roof, none in the arena. Render only.
 */

import * as THREE from 'three';
import { WEATHER, WORLD } from '../data/tuning';
import type { Game } from '../systems/components';
import type { Particles } from './particles';
import { wetness } from './wetness';
import { worldUniforms } from './worldMaterial';

const BOX = 15; // metres about the lens the rain falls in
const TOP = 9;
const FALL = 15; // m/s
const SLANT = 0.22; // share of the fall blown sideways
const LEN = 0.5; // metres a streak is long
const STRIDE = 0.9; // metres between the splashes of a walk on soaked ground
const DROP: readonly [number, number, number] = [0.72, 0.78, 0.86];

const VERT = 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = 'uniform float uAlpha; uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, uAlpha); }';

/** How many of `max` streaks fall at `amount` of a spell. */
export const streaksAt = (amount: number, max = WEATHER.rain): number => Math.round(max * Math.min(1, Math.max(0, amount)));

export interface WeatherFx {
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
}

export function createWeatherFx(scene: THREE.Scene, g: Game, particles: Particles): WeatherFx {
  const max = WEATHER.rain;
  const at = new Float32Array(max * 3); // each streak's head
  const verts = new Float32Array(max * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3).setUsage(THREE.DynamicDrawUsage));
  const alpha = { value: 0 };
  const material = new THREE.ShaderMaterial({ uniforms: { uAlpha: alpha, uColor: { value: new THREE.Vector3(0.55, 0.6, 0.68) } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
  const lines = new THREE.LineSegments(geo, material);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);
  let [last, seeded, owed, wet] = [-1, false, 0, 0];
  let [px, pz, strode] = [NaN, NaN, 0]; // where the investigator was, and how far they have gone since the last splash
  const wind = { x: SLANT, z: SLANT * 0.4 };

  const seed = (i: number, cam: THREE.Vector3, fresh: boolean): void => {
    at[i * 3] = cam.x + (Math.random() * 2 - 1) * BOX;
    at[i * 3 + 1] = fresh ? cam.y - 3 + Math.random() * (TOP + 3) : cam.y + TOP * (0.7 + 0.3 * Math.random());
    at[i * 3 + 2] = cam.z + (Math.random() * 2 - 1) * BOX;
  };

  return {
    update(camera, time, hidden) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const w = g.overworld?.weather;
      const amount = !w || hidden ? 0 : w.amount;
      worldUniforms.uWind.value = 1 + (w?.kind === 'gale' ? 2.4 * amount : w?.kind === 'rain' ? 0.7 * amount : 0); // the trees and the grass bend with it (round 34)
      const cam = camera.position;
      const rain = w?.kind === 'rain' && amount > 0;
      const soak = rain ? Math.min(1, amount * 1.5) : 0; // the ground is soaked before the rain is at its fullest
      wet = hidden ? 0 : wet + (soak - wet) * Math.min(1, dt * (soak > wet ? WEATHER.soak : WEATHER.dry)); // dry at once under a roof
      wetness.value = wet;
      const me = g.ecs.c.transform.get(g.player.id)?.pos;
      if (me && !hidden) {
        const moved = Number.isNaN(px) ? 0 : Math.hypot(me.x - px, me.z - pz);
        [px, pz, strode] = [me.x, me.z, moved > 3 ? 0 : strode + moved]; // (a leap is not a stride)
        if (strode >= STRIDE && wet > 0.35 && me.y > WORLD.seaLevel) {
          strode = 0;
          for (let k = 0; k < 5; k++) { // a stride on soaked ground throws a few drops
            const a = Math.random() * Math.PI * 2;
            particles.spawn({ x: me.x + Math.sin(a) * 0.15, y: me.y + 0.05, z: me.z + Math.cos(a) * 0.15, vx: Math.sin(a) * (0.6 + Math.random() * 0.8), vy: 1.3 + Math.random() * 1.2, vz: Math.cos(a) * (0.6 + Math.random() * 0.8), life: 0.4, size: 0.07, grow: 0.6, color: DROP, alpha: 0.75 * wet, gravity: 9, drag: 0.5 });
          }
        }
      }
      lines.visible = rain;
      if (rain) {
        const n = streaksAt(amount, max);
        alpha.value = 0.22 + 0.3 * amount;
        for (let i = 0; i < max; i++) {
          if (!seeded) seed(i, cam, true);
          else {
            at[i * 3] += wind.x * FALL * dt;
            at[i * 3 + 1] -= FALL * dt;
            at[i * 3 + 2] += wind.z * FALL * dt;
            const [dx, dz] = [at[i * 3] - cam.x, at[i * 3 + 2] - cam.z];
            if (at[i * 3 + 1] < cam.y - 3 || Math.abs(dx) > BOX || Math.abs(dz) > BOX) seed(i, cam, false);
          }
          const live = i < n;
          const [x, y, z] = [at[i * 3], at[i * 3 + 1], at[i * 3 + 2]];
          verts.set(live ? [x, y, z, x - wind.x * LEN, y + LEN, z - wind.z * LEN] : [0, -999, 0, 0, -999, 0], i * 6);
        }
        seeded = true;
        geo.attributes.position.needsUpdate = true;
      } else seeded = false;
      if (!w || hidden || amount <= 0 || (w.kind !== 'gale' && w.kind !== 'motes')) return;
      owed += dt * (w.kind === 'gale' ? 70 : 9) * amount; // particles a second
      for (; owed >= 1; owed--) {
        const [a, r] = [Math.random() * Math.PI * 2, 3 + Math.random() * 10];
        const [x, z] = [cam.x + Math.sin(a) * r, cam.z + Math.cos(a) * r];
        const y = g.world.ground(x, z);
        if (w.kind === 'gale') {
          const dust = Math.random() < 0.7;
          particles.spawn({ x, y: y + 0.2 + Math.random() * 2.2, z, vx: 9 + Math.random() * 5, vy: 0.3 + Math.random() * 0.8, vz: 3 + Math.random() * 3, life: 1.1 + Math.random() * 0.8, size: dust ? 0.22 : 0.12, grow: 1.2, color: dust ? [0.34, 0.32, 0.28] : [0.3, 0.22, 0.12], alpha: dust ? 0.3 : 0.7, gravity: dust ? -0.05 : 0.6, drag: 0.15 });
        } else {
          particles.spawn({ x, y: y + 0.4 + Math.random() * 3.5, z, vx: (Math.random() - 0.5) * 0.4, vy: 0.25 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.4, life: 4 + Math.random() * 3, size: 0.08 + Math.random() * 0.08, grow: 0.6, color: Math.random() < 0.5 ? [0.72, 0.6, 1] : [0.96, 0.84, 0.5], alpha: 0.85, glow: true, gravity: -0.02, drag: 0.3 });
        }
      }
    },
  };
}
