import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SHADOW } from '../src/data/tuning';
import { moonFrame } from '../src/render/moonFrame';

const texel = (2 * SHADOW.range) / SHADOW.size;
const toMoon = new THREE.Vector3(-0.55, 0.62, 0.4).normalize();

describe('the frame of the moon\'s shadow map (round 34)', () => {
  it('stands toward the moon from the focus, its axes at right angles to the rays and to each other', () => {
    const f = moonFrame(toMoon, new THREE.Vector3(12, 3, -40), texel, SHADOW.depth);
    expect(f.right.dot(toMoon)).toBeCloseTo(0, 6);
    expect(f.up.dot(toMoon)).toBeCloseTo(0, 6);
    expect(f.right.dot(f.up)).toBeCloseTo(0, 6);
    const to = f.position.clone().sub(new THREE.Vector3(12, 3, -40));
    expect(to.dot(toMoon)).toBeCloseTo(SHADOW.depth / 2, 3); // half its depth up the rays, however it is shifted across them
  });

  it('holds to the map\'s own texel grid: a step of less than a texel does not move it, so the shadows do not shimmer as the investigator walks', () => {
    const at = new THREE.Vector3(100, 2, 100);
    const a = moonFrame(toMoon, at, texel, SHADOW.depth);
    const b = moonFrame(toMoon, at.clone().addScaledVector(a.right, texel * 0.2), texel, SHADOW.depth);
    expect(b.position.distanceTo(a.position)).toBeLessThan(1e-6);
    const c = moonFrame(toMoon, at.clone().addScaledVector(a.right, texel * 1.2), texel, SHADOW.depth);
    expect(c.position.distanceTo(a.position)).toBeCloseTo(texel, 4); // a whole texel when it has gone a whole one
  });

  it('has an up to hold itself by even when the moon is straight overhead', () => {
    const f = moonFrame(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), texel, SHADOW.depth);
    expect(Number.isFinite(f.right.x + f.right.y + f.right.z + f.up.x + f.up.y + f.up.z)).toBe(true);
    expect(f.right.length()).toBeCloseTo(1, 6);
  });

  it('covers ground enough for the lantern\'s neighbourhood at a texel the eye cannot count', () => {
    expect(SHADOW.range).toBeGreaterThanOrEqual(30);
    expect(texel).toBeLessThan(0.1);
    expect(SHADOW.strength).toBeGreaterThan(0);
    expect(SHADOW.strength).toBeLessThanOrEqual(1);
  });
});
