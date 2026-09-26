/**
 * The Elder Signs' shrines (playtest round 7; signMeshes.ts builds them). A sign not yet found stands
 * dark. Found, the sign carved on its stone glows as the veil's does, a bone core in a Cosmic Purple
 * glow, breathing; the ring of runes about it glows and turns slowly; its candles burn; motes rise;
 * and it lights the ground about it and glows through the fog from afar (worldLights.ts). The moment
 * it is found it flares: the sign blazes, a ring of light runs out over the ground and motes burst
 * up; resting there, a softer flare. Read-only on the simulation.
 */

import * as THREE from 'three';
import type { Entity } from '../core/ecs';
import { SIGIL } from '../data/tuning';
import type { Game } from '../systems/components';
import { PLINTH, SHRINE } from '../world/shrine';
import { BASE, mixRgb, type Rgb } from './palette';
import type { Particles } from './particles';
import { SPACE_GLSL } from './shaders/world';
import { GLOW_REACH, shrineGeometry } from './signMeshes';
import type { WorldLights } from './worldLights';
import { createWorldMaterial, worldUniforms } from './worldMaterial';

export interface SignViews {
  /** `time`: render seconds; `eye`: the camera, near which motes rise. */
  update(time: number, eye: THREE.Vector3): void;
}

const EDGE: Rgb = [0.62, 0.22, 1]; // the glow's rim, Cosmic Purple brightened
const CORE: Rgb = BASE.bone; // its heart
/** The model an Elder Sign's entity carries (checkpoints.ts): drawn here, not as a figure. */
export const SHRINE_MODEL = 'elderSign';
const LIGHT_KEY = -1; // the world lights' key for the lit signs (chunk keys are never negative)
const GLYPH_MID = PLINTH + 1.3; // about the middle of the carved sign
const [RING_IN, RING_OUT] = SHRINE.runes;

const GLOW_VERT = /* glsl */ `
${SPACE_GLSL}
uniform float uFogNear;
uniform float uFogFar;
attribute vec3 aQ;
varying vec3 vQ;
varying float vFog;
void main() {
  vQ = aQ;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 vp = viewMatrix * vec4(displace(wp.xyz), 1.0);
  gl_Position = snap(projectionMatrix * vp);
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
}
`;

// Mode 0: about a stroke (aQ: along, across, length); 1: the ring of runes (turn, in-to-out); 2: a flare's ring of light.
const GLOW_FRAG = /* glsl */ `
uniform float uMode;
uniform float uGlow;
uniform float uReach;
uniform vec3 uCore;
uniform vec3 uEdge;
varying vec3 vQ;
varying float vFog;

float band(float x, float w) { return 1.0 - smoothstep(0.0, w, abs(x)); }

float runes() {
  float u = vQ.x * 24.0;
  float cell = floor(u);
  float x = fract(u) - 0.5;
  float v = vQ.y;
  float h = fract(sin(cell * 91.7 + 3.1) * 43758.5);
  float rings = max(band(v - 0.1, 0.09), band(v - 0.9, 0.09));
  float inside = step(0.26, v) * step(v, 0.74);
  float upright = band(x - (h - 0.5) * 0.3, 0.1) * inside;
  float slant = band(x - (v - 0.5) * (h > 0.5 ? 0.9 : -0.9), 0.1) * inside * step(0.35, fract(h * 7.0));
  float bar = band(v - 0.5 + (h - 0.5) * 0.3, 0.07) * step(abs(x), 0.32) * step(fract(h * 13.0), 0.4);
  return max(rings, max(upright, max(slant, bar)));
}

void main() {
  float a;
  if (uMode < 0.5) {
    float t = clamp(vQ.x, 0.0, vQ.z);
    a = pow(max(1.0 - length(vec2(vQ.x - t, vQ.y)) / uReach, 0.0), 2.0);
  } else if (uMode < 1.5) {
    a = runes();
  } else {
    a = pow(1.0 - abs(vQ.y * 2.0 - 1.0), 2.0);
  }
  a *= uGlow;
  if (a < 0.003) discard;
  float core = uMode > 0.5 && uMode < 1.5 ? 0.3 : 1.0; // the runes stay purple, to read over lit ground
  vec3 col = mix(uEdge, uCore, clamp(a * a * core, 0.0, 1.0)) * min(a, 1.6);
  gl_FragColor = vec4(col * (1.0 - vFog * 0.55), 1.0);
}
`;

function glowMaterial(mode: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...worldUniforms,
      uMode: { value: mode },
      uGlow: { value: 0 },
      uReach: { value: GLOW_REACH },
      uCore: { value: new THREE.Vector3(...CORE) },
      uEdge: { value: new THREE.Vector3(...EDGE) },
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: mode > 0, // the rings lie on the ground: drawn over it
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
}

interface View {
  sign: string;
  root: THREE.Group;
  glyph: THREE.ShaderMaterial; // the carved sign: its emissive glows
  glow: THREE.ShaderMaterial;
  runes: THREE.Mesh;
  wave: THREE.Mesh;
  flames: THREE.Mesh;
  lit: number; // 0 dark .. 1 glowing
  flare: { at: number; k: number } | null; // `at` NaN: it starts at the next drawn frame
  motes: number; // owed, fractional
  phase: number; // its breath's own
}

const rand = (a: number, b: number): number => a + (b - a) * Math.random();

export function createSignViews(scene: THREE.Scene, g: Game, particles: Particles, lights: WorldLights): SignViews {
  const geo = shrineGeometry();
  const stone = createWorldMaterial({ texture: 'rock', seed: 5, vertexColors: true, vary: 0.4 });
  const wax = createWorldMaterial({ texture: 'cloth', vertexColors: true });
  const views = new Map<Entity, View>();
  const bySign = new Map<string, View>();
  let [last, litCount] = [0, -1];

  function build(e: Entity, sign: string): View {
    const tr = g.ecs.c.transform.get(e)!;
    const root = new THREE.Group();
    root.position.set(tr.pos.x, tr.pos.y, tr.pos.z);
    root.rotation.y = tr.yaw;
    const glyph = createWorldMaterial({ texture: 'rock', seed: 5, vertexColors: true });
    const glow = glowMaterial(0);
    const flameMat = createWorldMaterial({ texture: 'cloth', emissive: 1, vertexColors: true });
    const [runes, wave, flames] = [new THREE.Mesh(geo.runes, glowMaterial(1)), new THREE.Mesh(geo.runes, glowMaterial(2)), new THREE.Mesh(geo.flames, flameMat)];
    root.add(new THREE.Mesh(geo.stone, stone), new THREE.Mesh(geo.glyph, glyph), new THREE.Mesh(geo.glow, glow), new THREE.Mesh(geo.wax, wax), runes, wave, flames);
    scene.add(root);
    return { sign, root, glyph, glow, runes, wave, flames, lit: 0, flare: null, motes: 0, phase: Math.random() * 6 };
  }

  function sync(): void {
    for (const [e, s] of g.ecs.c.sign) {
      if (views.has(e) || !g.ecs.c.transform.has(e)) continue;
      const v = build(e, s.id);
      views.set(e, v);
      bySign.set(s.id, v);
    }
  }

  const mote = (p: THREE.Vector3, v: View): void => {
    const a = Math.random() * Math.PI * 2;
    const ring = Math.random() < 0.6;
    const r = ring ? rand(RING_IN, RING_OUT) : rand(0.1, 0.6);
    particles.spawn({
      x: p.x + Math.sin(a) * r, y: p.y + (ring ? 0.1 : rand(PLINTH + 0.5, GLYPH_MID + 0.8)), z: p.z + Math.cos(a) * r,
      vx: rand(-0.08, 0.08), vy: rand(0.3, 0.7), vz: rand(-0.08, 0.08),
      life: rand(2, 3.4), size: rand(0.04, 0.08), grow: 0.3, color: mixRgb(EDGE, CORE, Math.random() * 0.7), alpha: 0.9, glow: true, drag: 0.2,
    });
    v.motes--;
  };
  /** A flare's motes: a column out of the sign, and a spray over the ring. */
  function burst(v: View, k: number): void {
    const p = v.root.position;
    for (let i = 0; i < Math.round(SIGIL.burst * k); i++) {
      const a = Math.random() * Math.PI * 2;
      const [s, c, out] = [Math.sin(a), Math.cos(a), i % 3 === 0];
      particles.spawn({
        x: p.x + s * (out ? RING_IN : 0.3), y: p.y + (out ? 0.15 : GLYPH_MID), z: p.z + c * (out ? RING_IN : 0.3),
        vx: s * rand(out ? 2 : 0.3, out ? 3.5 : 1.2), vy: out ? rand(0.2, 0.6) : rand(1.5, 4.5), vz: c * rand(out ? 2 : 0.3, out ? 3.5 : 1.2),
        life: rand(1, 2.2), size: rand(0.06, 0.13), grow: 0.2, color: mixRgb(EDGE, CORE, Math.random()), alpha: 1, glow: true, drag: out ? 1.5 : 0.8,
      });
    }
  }
  const flare = (sign: string, k: number): void => {
    const v = bySign.get(sign);
    if (v) v.flare = { at: NaN, k };
  };
  g.events.on('Discovered', ({ sign }) => flare(sign, 1));
  g.events.on('Rested', ({ sign }) => flare(sign, 0.5));

  /** The lit signs light the world about them, a little before their carved face. */
  function light(): void {
    const spots = [...views.values()].filter((v) => v.lit > 0).map(({ root: { position: p, rotation: r } }) => ({
      x: p.x + Math.sin(r.y) * 1.4, y: p.y + GLYPH_MID - 0.3, z: p.z + Math.cos(r.y) * 1.4, kind: 'sigil' as const,
    }));
    if (spots.length) lights.add(LIGHT_KEY, spots);
    else lights.remove(LIGHT_KEY);
    litCount = spots.length;
  }

  return {
    update(time, eye) {
      sync();
      const dt = Math.min(0.1, Math.max(0, time - last));
      last = time;
      let count = 0;
      for (const v of views.values()) {
        const on = !!g.overworld?.discovered.has(v.sign);
        v.lit = on ? Math.min(1, v.lit + dt / SIGIL.wake) : 0;
        if (on) count++;
        let boost = 0;
        if (v.flare) {
          if (Number.isNaN(v.flare.at)) {
            v.flare.at = time;
            burst(v, v.flare.k);
          }
          const t = (time - v.flare.at) / SIGIL.flare;
          boost = v.flare.k * Math.max(0, 1 - t) ** 2;
          const w = Math.min(1, (time - v.flare.at) / SIGIL.wave[0]);
          const s = (RING_IN + (SIGIL.wave[1] - RING_IN) * (1 - (1 - w) ** 3)) / RING_IN;
          v.wave.scale.set(s, 1, s);
          (v.wave.material as THREE.ShaderMaterial).uniforms.uGlow.value = v.flare.k * (1 - w) ** 2 * 1.4;
          v.wave.visible = w < 1;
          if (t >= 1 && w >= 1) v.flare = null;
        } else v.wave.visible = false;
        const breath = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * SIGIL.breatheHz + v.phase);
        v.glyph.uniforms.uEmissive.value = Math.min(1, v.lit * (0.72 + 0.2 * breath) + boost * 0.3);
        v.glow.uniforms.uGlow.value = v.lit * (0.95 + 0.35 * breath) + boost * 1.6;
        const runes = v.runes.material as THREE.ShaderMaterial;
        runes.uniforms.uGlow.value = v.lit * (0.75 + 0.25 * breath) + boost;
        v.runes.visible = runes.uniforms.uGlow.value > 0.005;
        v.runes.rotation.y = time * SIGIL.turn;
        v.flames.visible = v.lit > 0.5;
        (v.flames.material as THREE.ShaderMaterial).uniforms.uEmissive.value = 0.78 + 0.22 * Math.random();
        const p = v.root.position;
        if (v.lit < 0.5 || p.distanceTo(eye) > SIGIL.moteReach) continue;
        v.motes += dt * SIGIL.motes;
        while (v.motes >= 1) mote(p, v);
      }
      if (count !== litCount) light();
    },
  };
}
