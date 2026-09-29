/**
 * What a cutscene's beats let loose about someone (playtest round 20; cinema.ts): ash that drifts
 * down, gold motes and embers that rise, stars that stream out from a point and are gone. Each is a
 * handful of the particles the world already has.
 */

import type { Beat } from '../data/cutscenes';
import type { Rgb } from './palette';
import type { Particles } from './particles';

type Kind = NonNullable<Beat['burst']>['kind'];

interface Recipe {
  color: readonly Rgb[]; // one at random for each
  size: readonly [number, number]; // metres
  life: readonly [number, number]; // seconds
  rise: readonly [number, number]; // m/s upward
  out: number; // m/s outward (from the middle)
  spread: number; // metres about it it begins
  gravity: number;
  drag: number;
  glow: boolean;
}

const RECIPES: Readonly<Record<Kind, Recipe>> = {
  ash: { color: [[0.78, 0.75, 0.68], [0.6, 0.58, 0.54]], size: [0.05, 0.1], life: [3, 5.5], rise: [0.3, 1.4], out: 0.5, spread: 0.5, gravity: 0.35, drag: 0.7, glow: false },
  motes: { color: [[0.96, 0.82, 0.48], [0.9, 0.7, 0.36]], size: [0.07, 0.12], life: [3, 5], rise: [0.4, 1], out: 0.35, spread: 0.9, gravity: -0.05, drag: 0.4, glow: true },
  embers: { color: [[1, 0.36, 0.12], [0.85, 0.16, 0.08], [1, 0.6, 0.2]], size: [0.06, 0.11], life: [2, 4], rise: [0.8, 2.2], out: 0.5, spread: 0.8, gravity: -0.2, drag: 0.3, glow: true },
  stars: { color: [[0.95, 0.94, 1], [0.7, 0.55, 1], [0.85, 0.8, 1]], size: [0.1, 0.18], life: [2, 3.6], rise: [-0.3, 0.5], out: 2.4, spread: 3.5, gravity: 0, drag: 0.1, glow: true },
};

const between = ([lo, hi]: readonly [number, number]): number => lo + (hi - lo) * Math.random();

/** `count` of them about `at` (its feet, and how tall it stands): about its middle. */
export function burst(particles: Particles, kind: Kind, at: { x: number; y: number; z: number }, height: number, count: number): void {
  const r = RECIPES[kind];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const [dx, dz] = [Math.cos(a), Math.sin(a)];
    const reach = Math.random() * r.spread;
    particles.spawn({
      x: at.x + dx * reach,
      y: at.y + height * (0.25 + 0.6 * Math.random()),
      z: at.z + dz * reach,
      vx: dx * r.out * Math.random(),
      vy: between(r.rise),
      vz: dz * r.out * Math.random(),
      life: between(r.life),
      size: between(r.size),
      grow: 0.4,
      color: r.color[Math.floor(Math.random() * r.color.length)],
      alpha: 0.9,
      glow: r.glow,
      gravity: r.gravity,
      drag: r.drag,
    });
  }
}
