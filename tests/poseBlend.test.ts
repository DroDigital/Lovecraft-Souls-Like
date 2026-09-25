import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES, type MoveDef } from '../src/data/moves';
import { buildFigure, type Figure } from '../src/render/figures';
import { createPoseBlend, type PoseBlend } from '../src/render/poseBlend';
import { pose, type PoseInput } from '../src/render/poses';

const STILL: PoseInput = { move: null, def: undefined, frame: 0, speed: 0, stride: 0, guard: false, flinch: 0, rollYaw: 0, time: 0 };
const swing = (frame: number): PoseInput => ({ ...STILL, move: 'light1', def: PLAYER_MOVES.light1 as MoveDef, frame });
const GUARD: PoseInput = { ...STILL, guard: true };

/** Poses the figure through its crossfade at `time`, as actorViews.ts does. */
function draw(f: Figure, blend: PoseBlend, p: PoseInput, time: number): void {
  blend.watch(p.move, p.guard, time);
  pose(f, p);
  blend.apply(time);
}

/** The sword arm as a pose alone would put it. */
function armIn(p: PoseInput): THREE.Quaternion {
  const f = buildFigure('player');
  pose(f, p);
  return f.armR.quaternion.clone();
}

describe('pose crossfade (render/poseBlend.ts)', () => {
  it('eases a swing called off by the guard into the guard, rather than jumping to it', () => {
    const f = buildFigure('player');
    const blend = createPoseBlend(f);
    draw(f, blend, swing(6), 0);
    const [swung, up] = [f.armR.quaternion.clone(), armIn(GUARD)];
    expect(swung.angleTo(up)).toBeGreaterThan(0.3);
    draw(f, blend, GUARD, 1 / 60);
    expect(f.armR.quaternion.angleTo(up)).toBeGreaterThan(0.05);
    expect(f.armR.quaternion.angleTo(up)).toBeLessThan(swung.angleTo(up));
    draw(f, blend, GUARD, 0.2);
    expect(f.armR.quaternion.angleTo(up)).toBeLessThan(1e-6);
  });

  it('leaves a pose alone while its move goes on', () => {
    const f = buildFigure('player');
    const blend = createPoseBlend(f);
    draw(f, blend, swing(6), 0);
    draw(f, blend, swing(7), 1 / 60);
    expect(f.armR.quaternion.angleTo(armIn(swing(7)))).toBeLessThan(1e-6);
  });

  it("comes out of a roll's full turn the short way, never spinning back", () => {
    const f = buildFigure('player');
    const blend = createPoseBlend(f);
    const roll = PLAYER_MOVES.roll as MoveDef;
    draw(f, blend, { ...STILL, move: 'roll', def: roll, frame: roll.frames - 1 }, 0);
    for (let i = 1; i <= 8; i++) {
      draw(f, blend, STILL, i / 60);
      expect(f.body.quaternion.angleTo(new THREE.Quaternion()), `step ${i}`).toBeLessThan(0.2);
    }
  });
});
