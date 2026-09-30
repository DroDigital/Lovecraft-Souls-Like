/**
 * The weight of the investigator's blows, seen (playtest round 20; render only). Where a blow lands
 * on flesh a flare bursts at the wound and streaks of sparks are flung on along the swing, more and
 * faster the harder the blow (audio/impact.ts weighs it); a heavy one flings clots of ichor, and a
 * killing blow or a riposte sends a ring of light out from the wound. The camera is punched a little
 * toward the blow and shaken, easing back within a fifth of a second (the Screen shake setting
 * scales it, as it does the wounds taken: hurtFx.ts). The hitstop is the simulation's (combat.ts).
 */

import type * as THREE from 'three';
import { IMPACT } from '../data/tuning';
import type { Game } from '../systems/components';
import { blowWeight, landedBlow, LANDS } from './audio/impact';
import { FEEL } from './feel';
import { BASE, mixRgb, type Rgb } from './palette';
import type { Particles } from './particles';
import { woundPoint } from './wound';

export interface ImpactFx {
  /** Punches and shakes the camera for the blow just landed; `time` is render seconds. */
  update(camera: THREE.Camera, time: number): void;
}

const SPARK: Rgb = mixRgb(BASE.bone, [1, 0.85, 0.6], 0.6);
const FLARE: Rgb = [1, 0.97, 0.9];
const ICHOR: Rgb = mixRgb(BASE.seaGrey, BASE.charcoal, 0.5);
const STREAK = [0.11, 0.08, 0.055] as const; // a spark: a run of discs along its flight, each smaller behind
const rand = (a: number, b: number): number => a + (b - a) * Math.random();

export function createImpactFx(g: Game, fx: Particles): ImpactFx {
  const c = g.ecs.c;
  let [weight, at, pending] = [0, -Infinity, false];
  let dir = { x: 0, z: 1 };

  /** What a blow of weight `w` (0.5..most) throws, of `[least, most]`. */
  const scaled = ([lo, hi]: readonly [number, number], w: number): number => Math.round(lo + ((hi - lo) * (w - 0.5)) / (IMPACT.weight.most - 0.5));

  function burst(p: { x: number; y: number; z: number }, d: { x: number; z: number }, w: number, finish: boolean): void {
    fx.spawn({ ...p, life: 0.12, size: 0.3 + 0.45 * w, grow: 0.3, color: FLARE, glow: true, alpha: 0.95 });
    fx.spawn({ ...p, life: 0.16, size: 0.5 + 0.6 * w, grow: 0.5, color: SPARK, glow: true, alpha: 0.4 });
    const yaw = Math.atan2(d.x, d.z);
    for (let i = 0; i < scaled(IMPACT.sparks, w); i++) {
      const [a, tilt, speed, life] = [yaw + rand(-2.2, 2.2), rand(-0.2, 0.8), rand(3.5, 8) * (0.7 + 0.3 * w), rand(0.16, 0.34)]; // all about the wound: the camera sees them fly
      const [vx, vy, vz] = [Math.sin(a) * Math.cos(tilt) * speed, Math.sin(tilt) * speed, Math.cos(a) * Math.cos(tilt) * speed];
      STREAK.forEach((size, k) => fx.spawn({
        x: p.x - (vx / speed) * 0.05 * k, y: p.y - (vy / speed) * 0.05 * k, z: p.z - (vz / speed) * 0.05 * k,
        vx, vy, vz, life, size, color: k === 0 ? FLARE : SPARK, glow: true, gravity: 8, drag: 1.2,
      }));
    }
    for (let i = 0; i < scaled(IMPACT.chunks, w); i++) {
      fx.spawn({
        ...p, vx: d.x * rand(1, 4) + rand(-1.5, 1.5), vy: rand(1, 4.5), vz: d.z * rand(1, 4) + rand(-1.5, 1.5),
        life: rand(0.5, 0.9), size: rand(0.1, 0.2), grow: 0.7, color: ICHOR, gravity: 9, drag: 0.8,
      });
    }
    if (!finish) return;
    for (let i = 0; i < 14; i++) { // a ring of light standing off the wound, facing the blow
      const a = (i / 14) * Math.PI * 2;
      const [u, v] = [Math.cos(a) * 5, Math.sin(a) * 5];
      fx.spawn({ ...p, vx: -d.z * u, vy: v, vz: d.x * u, life: 0.26, size: 0.11, color: FLARE, glow: true, alpha: 0.85, drag: 7 });
    }
  }

  g.events.on('Hit', (e) => {
    const landed = landedBlow(g, e);
    if (!landed || !LANDS.includes(landed.outcome)) return;
    const wound = c.transform.has(e.attacker) ? woundPoint(g, e.target, e.attacker, 0.25) : undefined;
    if (!wound) return;
    const d = { x: wound.dx, z: wound.dz };
    const w = blowWeight(landed);
    burst(wound.at, d, w, landed.outcome === 'kill' || landed.outcome === 'riposte');
    [weight, dir, pending] = [Math.max(weight * 0.5, w), d, true];
  });

  return {
    update(camera, time) {
      if (pending) [at, pending] = [time, false];
      const t = (time - at) / IMPACT.kick.seconds;
      if (t < 0 || t >= 1 || FEEL.shake <= 0) return;
      const k = weight * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) ** 2 * FEEL.shake; // a quick punch in, easing back
      const j = IMPACT.kick.shake * k;
      camera.position.x += dir.x * IMPACT.kick.push * k + (Math.random() - 0.5) * j;
      camera.position.y += (Math.random() - 0.5) * j;
      camera.position.z += dir.z * IMPACT.kick.push * k + (Math.random() - 0.5) * j;
    },
  };
}
