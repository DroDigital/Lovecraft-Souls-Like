/**
 * The world's lights (playtest round 5): every street lamp, fire, torch and lit window that the
 * chunk and dungeon builders report (propMeshes.ts, siteMeshes.ts) is a light spot. Each frame the
 * nearest become the shader's point lights (LAMPS_GLSL), easing to nothing toward the edge of the
 * chosen set so none pops as another takes its place; flames waver. Every spot within reach also
 * wears a soft additive halo (halos.ts), so lights glow through the dark as lights should. The
 * investigator's lantern wears one too. Round 22: `lightAt` tells the simulation how well lit the
 * ground is at a point (the mind mends faster in lamplight; sanity.ts), by the same spots.
 */

import * as THREE from 'three';
import { LIGHTS, SANITY, type LightDef, type LightKind } from '../data/tuning';
import { createHalos } from './halos';
import { paneLit } from './paneLife';
import { LAMP_SLOTS } from './shaders/world';
import { worldUniforms } from './worldMaterial';

import type { Caster } from './lampShadows';

export interface LightSpot {
  x: number;
  y: number;
  z: number;
  kind: LightKind;
  /** A lit window's pane (playtest round 13: its glow hung half a metre before the window, where the light is cast from): the glow sits on the glass, and fades as the window is seen edge on. */
  glass?: { x: number; y: number; z: number };
  pane?: number; // a lit window's seed: put out now and then, dimmed as someone passes (paneLife.ts; round 18)
}

/** How much of a window's glow shows from `eye`: all of it square on, nothing edge on or from behind. */
export function glassFacing(s: LightSpot, eye: { x: number; y: number; z: number }): number {
  const g = s.glass;
  if (!g) return 1;
  const [nx, nz] = [s.x - g.x, s.z - g.z];
  const [ex, ey, ez] = [eye.x - g.x, eye.y - g.y, eye.z - g.z];
  const cos = (nx * ex + nz * ez) / Math.max(1e-6, Math.hypot(nx, nz) * Math.hypot(ex, ey, ez));
  return Math.min(1, Math.max(0, (cos - 0.1) / 0.6));
}

export interface WorldLights {
  readonly halos: THREE.Mesh;
  add(key: number, spots: readonly LightSpot[]): void;
  remove(key: number): void;
  /** How well lit the ground at a point is by lamps, fires, torches and windows (0..1) at `time`: each counts within its share of its light's range, and the Elder Signs' glow, an Echo's and the lantern's own do not. */
  lightAt(x: number, y: number, z: number, time: number): number;
  /** Lights the world about the camera at `eye`; `lantern` (the investigator's flame, as drawn) wears its halo (null: none). */
  update(eye: THREE.Vector3, time: number, lantern: THREE.Vector3 | null): void;
  /** The lamps among the shader's nearest that may cast a shadow (torches, fires, street lamps), nearest first (round 35: lampShadows.ts). */
  readonly casters: readonly Caster[];
}

const MAX_HALOS = 400;

/** How far the mind has gone (0..1; set each frame by worldLife.ts, round 26): the flames of a failing mind's world waver harder, and some gutter out for a moment. */
export const LIGHT_NERVES = { madness: 0 };

/** A flame's waver: about 1, by `amount` (and a failing mind's), its own rhythm for each spot. */
function waver(s: LightSpot, amount: number, time: number): number {
  const m = LIGHT_NERVES.madness;
  const a = amount + m * 0.3;
  if (a <= 0) return 1;
  const phase = Math.abs(Math.sin(s.x * 12.9898 + s.z * 78.233)) * 40;
  const gutter = m > 0.15 && Math.sin(time * 1.9 + phase * 3.1) > 0.93 ? 1 - 0.75 * m : 1; // a flame that all but goes out, now and again
  return (1 + a * (0.6 * Math.sin(time * 7.3 + phase) + 0.4 * Math.sin(time * 13.1 + phase * 0.37))) * gutter;
}

export function createWorldLights(): WorldLights {
  const spots = new Map<number, readonly LightSpot[]>();
  const batch = createHalos(MAX_HALOS, LIGHTS.haloFog);
  const halos = batch.mesh;
  const near: { s: LightSpot; d: number }[] = [];
  const casters: Caster[] = [];
  return {
    halos,
    casters,
    add(key, list) {
      if (list.length) spots.set(key, list);
    },
    remove(key) {
      spots.delete(key);
    },
    lightAt(x, y, z, time) {
      let sum = 0;
      for (const list of spots.values()) {
        for (const s of list) {
          const share = SANITY.mend.light[s.kind];
          if (share <= 0) continue;
          const reach = LIGHTS.kinds[s.kind].range * SANITY.mend.reach;
          const d = Math.hypot(s.x - x, s.z - z); // along the ground: a lamp's pool lies under it, whatever height it hangs at (but not a floor above or below)
          if (d < reach && Math.abs(s.y - y) < 6) sum += share * (1 - d / reach) ** SANITY.mend.curve * (s.pane === undefined ? 1 : paneLit(s.pane, time));
        }
      }
      return Math.min(1, sum);
    },
    update(eye, time, lantern) {
      near.length = 0;
      for (const list of spots.values()) {
        for (const s of list) {
          const d = Math.hypot(s.x - eye.x, s.y - eye.y, s.z - eye.z);
          if (d < LIGHTS.haloReach) near.push({ s, d });
        }
      }
      near.sort((a, b) => a.d - b.d);
      const reach = Math.min(LIGHTS.reach, near[LAMP_SLOTS]?.d ?? Infinity); // the next in line is at nothing
      casters.length = 0;
      const lamps = worldUniforms.uLamps.value;
      const colors = worldUniforms.uLampColors.value;
      for (let i = 0; i < LAMP_SLOTS; i++) {
        const n = near[i];
        const k = n ? LIGHTS.kinds[n.s.kind] : null;
        const weight = n && k ? 1 - THREE.MathUtils.smoothstep(n.d, reach * 0.7, reach) : 0;
        if (!n || !k || weight <= 0) {
          lamps[i].w = 0;
          continue;
        }
        lamps[i].set(n.s.x, n.s.y, n.s.z, k.range);
        if (n.s.kind === 'torch' || n.s.kind === 'fire' || n.s.kind === 'lamp') casters.push({ slot: i, x: n.s.x, y: n.s.y, z: n.s.z, key: `${n.s.x.toFixed(2)},${n.s.y.toFixed(2)},${n.s.z.toFixed(2)}` });
        colors[i].set(...k.color).multiplyScalar(k.strength * weight * waver(n.s, k.flicker, time) * (n.s.pane === undefined ? 1 : paneLit(n.s.pane, time)));
      }
      batch.begin();
      if (lantern) batch.put(lantern.x, lantern.y, lantern.z, LIGHTS.lantern.halo, LIGHTS.lantern.color, LIGHTS.lantern.haloGain * waver({ x: 0, y: 0, z: 0, kind: 'torch' }, 0.05, time));
      for (const { s } of near) {
        const k: LightDef = LIGHTS.kinds[s.kind];
        if (s.glass) {
          const face = glassFacing(s, eye) * (s.pane === undefined ? 1 : paneLit(s.pane, time));
          if (face > 0 && !batch.put(s.glass.x, s.glass.y, s.glass.z, LIGHTS.paneHalo, k.haloColor ?? k.color, k.haloGain * face)) break;
          continue;
        }
        if (!batch.put(s.x, s.y, s.z, k.halo, k.haloColor ?? k.color, k.haloGain * waver(s, k.flicker, time))) break;
      }
      batch.end();
    },
  };
}
