import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWatchers, watchersFor } from '../src/render/watchers';
import { createWorldGame } from '../src/systems/game';
import { setSanity } from '../src/systems/sanity';

afterEach(() => vi.restoreAllMocks());

describe('the watchers (round 26)', () => {
  it('come with a failing mind, more of them the less steady', () => {
    expect(watchersFor(100)).toBe(0);
    expect(watchersFor(60)).toBe(0);
    expect(watchersFor(35)).toBe(1);
    expect(watchersFor(18)).toBe(2);
    expect(watchersFor(5)).toBe(3);
  });

  it('stand far off on open ground when the mind fails, are gone when approached, and are not there for a steady mind', () => {
    const g = createWorldGame();
    const scene = new THREE.Scene();
    const w = createWatchers(scene, g);
    const camera = new THREE.PerspectiveCamera();
    const me = g.ecs.c.transform.get(g.player.id)!.pos;
    camera.position.set(me.x, me.y + 1.6, me.z);
    camera.updateMatrixWorld();
    let n = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ((n = (n * 7 + 3) % 97) + 0.5) / 97 * 0.2); // low: spawns at once, at varied places
    const run = (seconds: number): void => {
      for (let t = 0; t < seconds; t += 0.05) w.update(camera, t + 100, false, () => undefined);
    };
    setSanity(g, 100);
    run(10);
    expect(scene.children.length).toBe(0);
    setSanity(g, 5);
    run(20);
    expect(scene.children.length).toBeGreaterThan(0);
    for (const m of scene.children) expect(Math.hypot(m.position.x - camera.position.x, m.position.z - camera.position.z)).toBeGreaterThan(40);
    const first = scene.children[0];
    camera.position.set(first.position.x + 5, me.y + 1.6, first.position.z);
    camera.updateMatrixWorld();
    let gone = false;
    for (let t = 0; t < 2; t += 0.05) w.update(camera, 200 + t, false, () => undefined);
    gone = !scene.children.includes(first);
    expect(gone).toBe(true); // it does not let itself be come up to
    setSanity(g, 100);
    for (let t = 0; t < 3; t += 0.05) w.update(camera, 300 + t, false, () => undefined);
    expect(scene.children.length).toBe(0); // and they leave a steady mind
  });
});
