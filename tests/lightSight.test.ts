import { describe, expect, it } from 'vitest';
import { createLightSight } from '../src/render/lightSight';
import type { CollisionWorld } from '../src/world/colliders';
import type { LightSpot } from '../src/render/worldLights';

describe('lightSight', () => {
  it('shows a light under the open sky from anywhere, without a ray', () => {
    const world = {} as CollisionWorld; // a ray on it would throw
    const sight = createLightSight(world);
    const lamp = { x: 3, y: 2, z: 3, kind: 'lamp' } as LightSpot;
    expect(sight.sees(lamp, { x: 40, y: 1.6, z: 40 }, 0)).toBe(true);
    expect(sight.sees(lamp, { x: -40, y: 1.6, z: 9 }, 100)).toBe(true);
  });
});
