/**
 * The fog before a horror (round 27; data/fogThemes.ts, world/gatePlan.ts): a wall of mist across the
 * doorway of a boss's room, or rising all round its ring in the open, in the weather of that place.
 * The investigator walks through it and the fight begins a few steps beyond. It thickens while the
 * fight holds them and is gone, dissolving over a few seconds, once every horror it keeps is slain.
 * A wall is made only when the camera is near. Render only.
 */

import * as THREE from 'three';
import { FOG_THEMES, type FogMotion, type FogTheme } from '../data/fogThemes';
import type { Game } from '../systems/components';
import { gatePlan, type FogWall } from '../world/gatePlan';
import { worldLayout } from '../world/placements';
import type { GameAudio } from './audio/gameAudio';
import type { Particles } from './particles';

const VERT = `varying vec3 vWorld; varying vec2 vUv;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const FRAG = `uniform vec3 uBase, uTop, uSpark, uGlow; uniform vec3 uCentre; uniform vec4 uPart; // uPart: where the fog parts (a walker passing), and how wide
uniform float uTime, uVis, uDensity, uSpeed, uMode, uShimmer, uShare, uFoot, uHeight, uHeld, uGlyph;
varying vec3 vWorld; varying vec2 vUv;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 7.0) + 0.15 * noise(p * 4.3 + 3.0); }
void main() {
  float col_boost = 0.0;
  float h = clamp((vWorld.y - uFoot) / uHeight, 0.0, 1.0);
  float t = uTime * uSpeed * 0.3;
  vec3 p = vec3(vWorld.x, vWorld.y, vWorld.z) * 0.32;
  if (uMode < 0.5) p.y -= t * 1.4;                                          // rise
  else if (uMode < 1.5) { p.x += t * 1.1; p.z -= t * 0.7; p.y -= t * 0.2; } // roll
  else if (uMode < 2.5) {                                                   // swirl, about the centre
    vec2 d = vWorld.xz - uCentre.xz; float a = t * 0.9; float c = cos(a), s = sin(a);
    p.xz = (mat2(c, -s, s, c) * d) * 0.32; p.y -= t * 0.4;
  } else { p.x += t * 2.4; p.y += sin(vWorld.x * 0.5 + uTime * uSpeed) * 0.15; p.z += t * 0.4; } // shear, in sheets
  float n = fbm(p);
  float crown = 1.0 - smoothstep(0.5 + 0.35 * n, 1.0, h);
  float foot = smoothstep(0.0, 0.07, h);
  float a = uDensity * (0.35 + 0.95 * n) * crown * foot;
  // A wall, not a haze (round 35: the horror could be seen through it): solid from its foot to near its crown, the mist's own mottling in its colour.
  a = max(min(0.96, a * (1.0 + 0.3 * uHeld)), 0.985 * (1.0 - smoothstep(0.8, 1.0, h)) * foot) * uVis;
  if (uPart.w > 0.0) { // it parts about a body passing through, in a ragged round, and eddies at its edge
    float dd = length(vWorld - uPart.xyz);
    float edge = uPart.w * (0.82 + 0.4 * fbm(vWorld * 0.9 + uTime * 0.6));
    a *= smoothstep(edge * 0.55, edge, dd);
    col_boost += 0.35 * (1.0 - smoothstep(edge, edge * 1.5, dd)) * step(0.001, a);
  }
  vec3 col = mix(uBase, uTop, clamp(h * 0.5 + (n - 0.5) * 1.5 + 0.25, 0.0, 1.0));
  col *= 0.72 + 0.5 * noise(p * vec3(2.2, 0.5, 2.2) + 11.0); // drifting banks, darker and paler
  if (uShimmer > 0.0) col = mix(col, 0.55 + 0.45 * cos(6.2832 * (n * 1.6 + uTime * 0.12 + vec3(0.0, 0.33, 0.67))), uShimmer * 0.6);
  if (uShare > 0.0) { // motes that catch the light
    vec3 q = floor(p * 9.0);
    float s = step(1.0 - 0.06 * uShare, hash(q)) * (0.5 + 0.5 * sin(uTime * 3.0 + hash(q + 3.0) * 40.0));
    col += uSpark * s * 0.9; a = max(a, s * 0.7 * uVis * foot);
  }
  if (uGlyph > 0.0) col += uGlow * pow(n, 5.0) * 1.6 * (0.6 + 0.4 * sin(uTime * 1.3));
  gl_FragColor = vec4(col + col_boost, a);
}`;

const MODE: Record<FogMotion, number> = { rise: 0, roll: 1, swirl: 2, shear: 3 };
const SEE = 138; // metres from its nearest point past which a wall is not made
const FADE = [112, 134] as const; // and over which it thins to nothing
const DISSOLVE = 3.5; // seconds a slain horror's fog takes to go

/** How much of a wall shows `distance` metres off. */
export const fogSeen = (distance: number): number => Math.min(1, Math.max(0, (FADE[1] - distance) / (FADE[1] - FADE[0])));

/** The nearest distance from `p` to a wall (the doorway's middle, or the ring's circumference). */
export const wallGap = (w: Pick<FogWall, 'kind' | 'x' | 'z' | 'radius'>, p: { x: number; z: number }): number =>
  w.kind === 'ring' ? Math.abs(Math.hypot(p.x - w.x, p.z - w.z) - w.radius) : Math.hypot(p.x - w.x, p.z - w.z);

function materialOf(w: FogWall, theme: FogTheme): THREE.ShaderMaterial {
  const v = (c: readonly number[]): THREE.Vector3 => new THREE.Vector3(c[0], c[1], c[2]);
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: v(theme.base) }, uTop: { value: v(theme.top) }, uSpark: { value: v(theme.sparks?.colour ?? [0, 0, 0]) }, uGlow: { value: v(theme.glyph ?? [0, 0, 0]) }, uCentre: { value: new THREE.Vector3(w.x, w.y, w.z) },
      uTime: { value: 0 }, uVis: { value: 0 }, uDensity: { value: theme.density }, uSpeed: { value: theme.speed }, uMode: { value: MODE[theme.motion] },
      uShimmer: { value: theme.shimmer ?? 0 }, uShare: { value: theme.sparks?.share ?? 0 }, uFoot: { value: w.y }, uHeight: { value: w.height }, uHeld: { value: 0 }, uPart: { value: new THREE.Vector4(0, 0, 0, 0) }, uGlyph: { value: theme.glyph ? 1 : 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}

interface Wall {
  w: FogWall;
  theme: FogTheme;
  mesh: THREE.Mesh | null;
  vis: number; // 0..1 shown now
  held: number; // 0..1 while a fight holds the investigator
  gone: boolean;
  owed: number; // motes owed
  engaged: boolean; // its horror was awake at the last look
}

export interface BossFog {
  update(camera: THREE.Camera, time: number, hidden: boolean): void;
}

export function createBossFog(scene: THREE.Scene, g: Game, particles: Particles, audio: GameAudio): BossFog {
  const walls: Wall[] = gatePlan(worldLayout()).fogs.map((w) => ({ w, theme: FOG_THEMES[w.theme], mesh: null, vis: 0, held: 0, gone: false, owed: 0, engaged: false }));
  g.events.on('FogPassing', () => audio.sample('rumble', { gain: 0.4, pitch: 0.85 }));
  g.events.on('FogPassed', (e) => {
    const b = walls.find((w) => w.w.id === e.wall);
    if (b) burst(b, e); // it closes behind them
  });
  let last = -1;
  const seed = { v: 11 };
  const rand = (): number => (seed.v = (seed.v * 16807) % 2147483647) / 2147483647;
  const make = (b: Wall): THREE.Mesh => {
    const { w } = b;
    const geo = w.kind === 'ring' ? new THREE.CylinderGeometry(w.radius, w.radius, w.height, Math.max(48, Math.round(w.radius * 2)), 1, true).translate(0, w.height / 2, 0) : new THREE.PlaneGeometry(w.width, w.height).translate(0, w.height / 2, 0);
    const mesh = new THREE.Mesh(geo, materialOf(w, b.theme));
    mesh.position.set(w.x, w.y, w.z);
    mesh.rotation.y = w.kind === 'ring' ? 0 : w.yaw;
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
    return mesh;
  };
  return {
    update(camera, time, hidden) {
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      const ow = g.overworld;
      const me = g.ecs.c.transform.get(g.player.id)?.pos;
      const fights = [...g.ecs.c.fight.values()];
      for (const b of walls) {
        const slain = !ow || b.w.spawns.every((s) => ow.slain.has(s));
        const near = wallGap(b.w, camera.position);
        const held = fights.some((f) => f.veiled && b.w.bosses.includes(f.id));
        const engaged = fights.some((f) => f.engaged && b.w.bosses.includes(f.id));
        const want = hidden || slain || near > SEE ? 0 : fogSeen(near);
        b.vis += Math.sign(want - b.vis) * Math.min(Math.abs(want - b.vis), dt / (slain ? DISSOLVE : 1.2));
        b.held += ((held ? 1 : 0) - b.held) * Math.min(1, dt * 2);
        if (slain && b.vis <= 0.001) b.gone = true;
        if (!b.mesh && b.vis > 0.001 && !b.gone) b.mesh = make(b);
        if (!b.mesh) continue;
        b.mesh.visible = b.vis > 0.001;
        const u = (b.mesh.material as THREE.ShaderMaterial).uniforms;
        u.uTime.value = time;
        u.uVis.value = b.vis;
        u.uHeld.value = b.held;
        const pass = g.player.fogPass;
        if (pass && pass.wall === b.w.id && me) { // the walk through: the fog opens about them, widest as they cross it
          const k = pass.frame / pass.frames;
          const opening = 3.4 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, k))), 0.7);
          u.uPart.value.set(me.x, g.world.ground(me.x, me.z) + 1.1, me.z, opening);
          if (k > 0.1 && k < 0.9) eddy(b, me, dt);
        } else u.uPart.value.w = 0;
        if (me && engaged && !b.engaged && near < 40) burst(b, me); // it has woken: the fog is crossed
        b.engaged = engaged;
        if (b.mesh.visible && me && near < 30 && !slain && !engaged) seep(b, me, dt);
      }
    },
  };

  /** The point of a wall nearest `me`. */
  function nearest(w: FogWall, me: { x: number; z: number }): [number, number] {
    if (w.kind === 'doorway') return [w.x, w.z];
    const a = Math.atan2(me.x - w.x, me.z - w.z);
    return [w.x + Math.sin(a) * w.radius, w.z + Math.cos(a) * w.radius];
  }

  /** A mote: mist low down, or a spark higher up, where the wall is. */
  function mote(b: Wall, x: number, z: number, spark: boolean, rise: number): void {
    const { w, theme } = b;
    const c = spark ? theme.sparks!.colour : theme.base;
    particles.spawn({ x, y: g.world.ground(x, z) + (spark ? rand() * w.height * 0.7 : rand() * 0.6), z, vy: rise * (0.4 + rand()), life: spark ? 2.6 : 2.4, size: spark ? 0.22 : 1.4, grow: spark ? 1 : 2, color: [c[0], c[1], c[2]], alpha: spark ? 0.85 : 0.22, drag: 0.4, glow: spark });
  }

  /** Motes that seep off a wall near the investigator. */
  function seep(b: Wall, me: { x: number; z: number }, dt: number): void {
    b.owed += dt * (b.theme.sparks ? 16 : 9);
    for (; b.owed >= 1; b.owed--) {
      const [cx, cz] = nearest(b.w, me);
      const s = (rand() - 0.5) * (b.w.kind === 'ring' ? 12 : b.w.width);
      const [x, z] = b.w.kind === 'ring' ? [cx + Math.cos(Math.atan2(me.x - b.w.x, me.z - b.w.z)) * s, cz - Math.sin(Math.atan2(me.x - b.w.x, me.z - b.w.z)) * s] : [cx + Math.cos(b.w.yaw) * s, cz - Math.sin(b.w.yaw) * s];
      mote(b, x, z, !!b.theme.sparks && rand() < b.theme.sparks.share, 0.5);
    }
  }

  /** Mist torn from the wall as a body goes through it: curls that stream past, thickest as it crosses. */
  function eddy(b: Wall, me: { x: number; z: number }, dt: number): void {
    b.owed += dt * 60;
    for (; b.owed >= 1; b.owed--) {
      const a = rand() * Math.PI * 2;
      const r = 0.5 + rand() * 1.4;
      mote(b, me.x + Math.cos(a) * r, me.z + Math.sin(a) * r, !!b.theme.sparks && rand() < b.theme.sparks.share, 0.9);
    }
  }

  /** The fog is crossed and the horror wakes: a billow of it where the investigator came through, and a low sound. */
  function burst(b: Wall, me: { x: number; z: number }): void {
    const [cx, cz] = nearest(b.w, me);
    for (let i = 0; i < 46; i++) mote(b, cx + (rand() - 0.5) * (b.w.kind === 'ring' ? 10 : b.w.width), cz + (rand() - 0.5) * 3, !!b.theme.sparks && rand() < b.theme.sparks.share * 1.4, 1.4);
    audio.sample('rumble', { gain: 0.55, pitch: 0.62 });
  }
}
