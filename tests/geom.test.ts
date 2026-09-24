import { describe, expect, it } from 'vitest';
import { segmentBox, segmentCylinder, segSegDist2, turnToward, v3, wrapAngle } from '../src/core/geom';
import { ARENA } from '../src/data/arena';
import { CAMERA } from '../src/data/tuning';
import { createCameraRig, stepCamera } from '../src/systems/camera';
import { createArenaWorld } from '../src/world/arena';
import { hasLineOfSight, raycast, resolveCapsule } from '../src/world/colliders';

describe('geometry', () => {
  it('measures segment-to-segment distance', () => {
    expect(segSegDist2(v3(-1, 0, 0), v3(1, 0, 0), v3(0, 1, -1), v3(0, 1, 1))).toBeCloseTo(1);
    expect(segSegDist2(v3(0, 0, 0), v3(0, 0, 2), v3(1, 0, 0), v3(1, 0, 2))).toBeCloseTo(1);
    expect(segSegDist2(v3(0, 0, 0), v3(1, 0, 0), v3(3, 0, 0), v3(4, 0, 0))).toBeCloseTo(4);
    expect(segSegDist2(v3(0, 0, 0), v3(0, 0, 0), v3(0, 3, 4), v3(0, 3, 4))).toBeCloseTo(25);
  });

  it('casts segments against boxes and cylinders (including the top cap)', () => {
    const [min, max] = [v3(0, 0, 0), v3(1, 1, 1)];
    expect(segmentBox(v3(-2, 0.5, 0.5), v3(4, 0, 0), min, max)).toBeCloseTo(0.5);
    expect(segmentBox(v3(-2, 2, 0.5), v3(4, 0, 0), min, max)).toBe(Infinity);
    expect(segmentCylinder(v3(-2, 1, 0), v3(4, 0, 0), 0, 0, 0.5, 0, 2)).toBeCloseTo(1.5 / 4);
    expect(segmentCylinder(v3(-2, 3, 0), v3(4, 0, 0), 0, 0, 0.5, 0, 2)).toBe(Infinity);
    expect(segmentCylinder(v3(0, 3, 0), v3(0, -2, 0), 0, 0, 0.5, 0, 2)).toBeCloseTo(0.5);
  });

  it('wraps and turns angles the short way round', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(-Math.PI);
    expect(turnToward(3, -3, 0.1)).toBeCloseTo(3.1);
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
  });
});

describe('arena collision', () => {
  const w = createArenaWorld();

  it('pushes a capsule out of a pillar and keeps it inside the arena', () => {
    const p = { x: -7.6, y: 0, z: 1 }; // inside the pillar at (-8, 1), radius 0.8
    resolveCapsule(w, p, 0.4, 1.8);
    expect(Math.hypot(p.x + 8, p.z - 1)).toBeCloseTo(1.2);
    const q = { x: 40, y: 0, z: 0 };
    resolveCapsule(w, q, 0.4, 1.8);
    expect(Math.hypot(q.x, q.z)).toBeCloseTo(ARENA.radius - 0.4);
  });

  it('pillars block sight; a low wall does not hide a standing figure', () => {
    expect(hasLineOfSight(w, v3(-8, 1.6, 6), v3(-8, 1.35, -4))).toBe(false);
    expect(hasLineOfSight(w, v3(7, 1.6, 14), v3(7, 1.35, 8))).toBe(true); // over the 1.1 m wall
    expect(raycast(w, v3(0, 1, 0), v3(0, -1, 0))).toBeCloseTo(0.5, 1); // the ground
  });
});

describe('third-person camera', () => {
  const w = createArenaWorld();
  const still = { lookX: 0, lookY: 0, focus: null, behind: 0 };

  it('pulls in when the boom hits a pillar, then eases back out', () => {
    const rig = createCameraRig(0); // looks +z, so the boom reaches back toward -z
    stepCamera(rig, { ...still, pivot: v3(-8, 1.55, 3.5) }, w, 1 / 60); // pillar at (-8, 1), radius 0.8
    const face = 1 + Math.sqrt(0.8 ** 2 - CAMERA.shoulder ** 2); // where the boom, off to the right, meets it
    const pulled = (3.5 - face) / Math.cos(CAMERA.pitch) - CAMERA.margin;
    expect(rig.dist).toBeCloseTo(pulled, 2);
    stepCamera(rig, { ...still, pivot: v3(0, 1.55, 10) }, w, 1 / 60);
    expect(rig.dist).toBeCloseTo(pulled + CAMERA.easeOut / 60, 5);
  });

  it('swings toward the lock-on target instead of following look input', () => {
    const rig = createCameraRig(0);
    stepCamera(rig, { ...still, lookX: 1, pivot: v3(0, 1.55, 0), focus: v3(10, 1.3, 0) }, w, 1 / 60);
    expect(rig.yaw).toBeGreaterThan(0); // toward +x = yaw π/2
    expect(rig.yaw).toBeLessThan(Math.PI / 2);
  });
});
