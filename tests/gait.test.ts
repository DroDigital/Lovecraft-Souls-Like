import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES, type MoveDef } from '../src/data/moves';
import { buildFigure, type Figure } from '../src/render/figures';
import { cadence, strideAt, type Ground, type Leg } from '../src/render/gait';
import { pose, type PoseInput } from '../src/render/poses';

const SPEEDS = [1.4, 2.2, 4.2, 6.4]; // a stroll, the guarded walk, the run, the sprint
const STILL: PoseInput = { move: null, def: undefined, frame: 0, speed: 0, stride: 0, guard: false, flinch: 0, rollYaw: 0, time: 0 };
const STANDING = Object.keys(PLAYER_MOVES).filter((m) => !['death', 'roll', 'helm'].includes(m)); // every move on the feet

/** The lowest point of everything hung from a joint, in the figure's frame (the ground under its origin is 0). */
function lowest(f: Figure, joint: THREE.Object3D): number {
  f.root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(joint).min.y;
}

/** Where a planted foot's ankle sits ahead of its hip (metres). */
const footAhead = (l: Leg): number => 0.42 * Math.sin(l.thigh) + 0.41 * Math.sin(l.thigh - l.knee);

describe('gait (render/gait.ts)', () => {
  it('stands straight when still, and quickens its cadence with speed', () => {
    const s = strideAt(0, 1.3);
    expect([s.right.thigh, s.right.knee, s.left.thigh, s.left.knee, s.lift]).toEqual([0, 0, 0, 0, 0]);
    for (let i = 1; i < SPEEDS.length; i++) expect(cadence(SPEEDS[i])).toBeGreaterThan(cadence(SPEEDS[i - 1]));
  });

  it('keeps the planted foot at the pace of the ground, so the feet do not skate', () => {
    for (const v of SPEEDS) {
      const { stance } = strideAt(v, 0);
      const swept = footAhead(strideAt(v, 0).right) - footAhead(strideAt(v, 2 * Math.PI * stance).right);
      expect((swept * cadence(v)) / stance / v, `${v} m/s`).toBeGreaterThan(0.85);
      expect((swept * cadence(v)) / stance / v, `${v} m/s`).toBeLessThan(1.15);
    }
  });

  it('never puts a foot through the ground, striding or fighting', () => {
    const f = buildFigure('player');
    const check = (p: PoseInput, what: string): void => {
      pose(f, p);
      for (const knee of [f.kneeR, f.kneeL]) expect(lowest(f, knee), what).toBeGreaterThan(-0.025);
    };
    for (const speed of SPEEDS) for (let i = 0; i < 24; i++) check({ ...STILL, speed, stride: (i / 24) * 2 * Math.PI }, `${speed} m/s`);
    for (const move of STANDING) {
      const def = (PLAYER_MOVES as Record<string, MoveDef>)[move];
      for (let frame = 0; frame < def.frames; frame += 2) check({ ...STILL, move, def, frame }, `${move} @${frame}`);
    }
  });

  it('keeps the thighs inside the coat as they stride', () => {
    const f = buildFigure('player');
    const [right, left] = f.skirt;
    for (const speed of SPEEDS) {
      for (let i = 0; i < 24; i++) {
        pose(f, { ...STILL, speed, stride: (i / 24) * 2 * Math.PI });
        f.root.updateMatrixWorld(true);
        for (const [leg, panel] of [[f.legR, right], [f.legL, left]] as const) {
          const shell = (panel.children[0] as THREE.Mesh).geometry.getAttribute('position');
          const ys = Array.from({ length: shell.count }, (_, k) => shell.getY(k));
          const [top, hem] = [Math.max(...ys), Math.min(...ys)];
          const depthAt = (y: number): number => {
            const at = (edge: number): number => Math.max(...Array.from({ length: shell.count }, (_, k) => (shell.getY(k) === edge ? shell.getZ(k) : 0)));
            return at(top) + ((at(hem) - at(top)) * (top - y)) / (top - hem);
          };
          for (const y of [-0.05, -0.2, -0.35]) {
            for (const z of [-0.095, 0.095]) {
              const p = panel.worldToLocal(leg.localToWorld(new THREE.Vector3(0, y, z)));
              if (p.y > hem) expect(Math.abs(p.z), `${speed} m/s, stride ${i}`).toBeLessThanOrEqual(depthAt(p.y) + 0.005);
            }
          }
        }
      }
    }
  });

  it('plants both feet on a slope', () => {
    const f = buildFigure('player');
    const ground: Ground = (x) => 0.3 * x; // falling away to the right
    pose(f, { ...STILL, ground });
    for (const [knee, x] of [[f.kneeR, f.legR.position.x], [f.kneeL, f.legL.position.x]] as const) {
      const gap = lowest(f, knee) - ground(x, 0);
      expect(gap).toBeGreaterThan(-0.03);
      expect(gap).toBeLessThan(0.05);
    }
  });
});
