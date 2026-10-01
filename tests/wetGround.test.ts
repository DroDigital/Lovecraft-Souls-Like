/**
 * The ground takes the wet of the rain (round 34): `uWet` rises as it falls, hangs on after it has passed and
 * dries over about a minute, is none under a roof, and a gale does not wet it. The shader (shaders/world.ts)
 * darkens what is soaked and lays puddles on flat ground in the heaviest.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WEATHER } from '../src/data/tuning';
import { WORLD_FRAG } from '../src/render/shaders/world';
import { createWeatherFx } from '../src/render/weather';
import type { Particles } from '../src/render/particles';
import { worldUniforms } from '../src/render/worldMaterial';
import { createWorldGame } from '../src/systems/game';

function sky() {
  const g = createWorldGame();
  const fx = createWeatherFx(new THREE.Scene(), g, { spawn() {} } as unknown as Particles);
  const camera = new THREE.PerspectiveCamera();
  let t = 0;
  const run = (seconds: number, hidden = false): number => {
    for (let i = 0; i < seconds * 60; i++) fx.update(camera, (t += 1 / 60), hidden);
    return worldUniforms.uWet.value;
  };
  const weather = (kind: 'clear' | 'rain' | 'gale', amount: number): void => void Object.assign(g.overworld!.weather, { kind, want: kind, amount });
  return { run, weather };
}

describe('wet ground', () => {
  it('soaks as the rain falls, hangs on when it has passed and dries in about a minute', () => {
    const { run, weather } = sky();
    expect(run(1)).toBe(0);
    weather('rain', 1);
    expect(run(10)).toBeGreaterThan(0.95);
    weather('clear', 0);
    expect(run(5)).toBeGreaterThan(0.7);
    expect(run(55)).toBeLessThan(0.15);
  });

  it('is wetted in step with a lighter rain, which does not soak it through', () => {
    const { run, weather } = sky();
    weather('rain', 0.3);
    const wet = run(20);
    expect(wet).toBeGreaterThan(0.3);
    expect(wet).toBeLessThan(0.6);
  });

  it('is dry at once under a roof, and a gale does not wet it', () => {
    const { run, weather } = sky();
    weather('rain', 1);
    expect(run(10)).toBeGreaterThan(0.9);
    expect(run(0.1, true)).toBe(0);
    weather('gale', 1);
    expect(run(20)).toBeLessThan(0.1);
  });

  it('is eased at the rates the tuning names', () => {
    expect(WEATHER.soak).toBeGreaterThan(WEATHER.dry * 4); // it soaks in seconds and takes much longer to dry
    expect(WEATHER.dry).toBeGreaterThan(0);
  });

  it('is read by the world shader, which keeps puddles to flat ground and out of the lit and the living', () => {
    expect(WORLD_FRAG).toContain('uniform float uWet');
    expect(WORLD_FRAG).toMatch(/uWet > 0\.01 && uEmissive < 0\.5 && uCharacter < 0\.5/);
    expect(WORLD_FRAG).toContain('smoothstep(0.86, 0.97, n.y)');
  });
});
