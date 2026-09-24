import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { LOCK } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import { stepGame } from '../src/systems/game';
import {
  holdLock,
  lockScore,
  pickTarget,
  switchTarget,
  viewAngle,
  type Candidate,
  type LockState,
  type View,
} from '../src/systems/lockOn';
import { place, press, scriptedGame, steps } from './helpers';

// The camera stands at z = 4 looking toward -z, so +x is to its right.
const view: View = { x: 0, z: 4, yaw: Math.PI };
const eye = { x: 0, y: 1.6, z: 0 };
const foe = (id: number, x: number, z: number, visible = true): Candidate => ({ id, pos: { x, y: 1.3, z }, visible });

describe('lock-on scoring', () => {
  it('measures the horizontal angle from the camera forward, positive to the right', () => {
    expect(viewAngle(view, foe(1, 0, -10).pos)).toBeCloseTo(0);
    expect(viewAngle(view, foe(1, 3, -3).pos)).toBeCloseTo(Math.atan2(3, 7));
    expect(viewAngle(view, foe(1, -3, -3).pos)).toBeCloseTo(-Math.atan2(3, 7));
  });

  it('scores distance plus weighted angle', () => {
    const p = foe(1, 3, -3).pos;
    const d = Math.hypot(3, 0.3, 3);
    expect(lockScore(eye, view, p)).toBeCloseTo(d + LOCK.angleWeight * Math.atan2(3, 7));
  });

  it('prefers the nearer of two centred foes and a centred foe over a close one far off-axis', () => {
    expect(pickTarget(eye, view, [foe(1, 0, -12), foe(2, 0, -8)])).toBe(2);
    expect(pickTarget(eye, view, [foe(1, 0, -10), foe(2, 6, -2)])).toBe(1);
  });

  it('only considers foes within 25 m and in sight', () => {
    expect(pickTarget(eye, view, [foe(1, 0, -24.5)])).toBe(1);
    expect(pickTarget(eye, view, [foe(1, 0, -25.5)])).toBeNull();
    expect(pickTarget(eye, view, [foe(1, 0, -5, false), foe(2, 0, -20)])).toBe(2);
  });

  it('switches to the nearest foe on screen to the left or right', () => {
    const cands = [foe(1, 0, -10), foe(2, 4, -10), foe(3, 8, -10), foe(4, -5, -10), foe(5, 2, -10, false)];
    expect(switchTarget(eye, view, 1, cands, 1)).toBe(2);
    expect(switchTarget(eye, view, 1, cands, -1)).toBe(4);
    expect(switchTarget(eye, view, 2, cands, 1)).toBe(3);
    expect(switchTarget(eye, view, 3, cands, 1)).toBe(3); // nothing further right
  });

  it('holds a lock with hysteresis, and breaks it on range or after the sight grace period', () => {
    const lock: LockState = { target: 1, unseen: 0 };
    expect(holdLock(lock, eye, foe(1, 0, -26))).toBe(true);
    expect(holdLock(lock, eye, foe(1, 0, -LOCK.breakRange - 0.5))).toBe(false);
    expect(holdLock(lock, eye, undefined)).toBe(false);
    for (let i = 0; i < LOCK.graceFrames; i++) expect(holdLock(lock, eye, foe(1, 0, -10, false))).toBe(true);
    expect(holdLock(lock, eye, foe(1, 0, -10, false))).toBe(false);
    lock.unseen = 5;
    expect(holdLock(lock, eye, foe(1, 0, -10))).toBe(true);
    expect(lock.unseen).toBe(0);
  });
});

describe('lock-on in play', () => {
  it('locks the best target, switches, and breaks when the target dies', () => {
    const { g, dummy, deepOne } = scriptedGame();
    stepGame(g, press('lock'));
    expect(g.lock.target).toBe(dummy);
    stepGame(g, { ...emptyInput(), switchTarget: 1 });
    expect(g.lock.target).toBe(deepOne);
    g.ecs.c.health.get(deepOne)!.hp = 0;
    startMove(g.ecs.c.actor.get(deepOne)!, 'death');
    stepGame(g, emptyInput());
    expect(g.lock.target).toBeNull();
  });

  it('cannot lock a foe hidden behind a pillar, and loses one that stays hidden', () => {
    const { g, player, dummy, deepOne } = scriptedGame();
    g.ecs.c.combatant.delete(dummy);
    place(g, player, -8, 6, Math.PI); // pillar at (-8, 1) between player and foe
    place(g, deepOne, -8, -4, 0);
    steps(g, 2);
    stepGame(g, press('lock'));
    expect(g.lock.target).toBeNull();
    place(g, player, -4, 6, Math.PI);
    steps(g, 2);
    stepGame(g, press('lock'));
    expect(g.lock.target).toBe(deepOne);
    place(g, player, -8, 6, Math.PI);
    steps(g, LOCK.graceFrames);
    expect(g.lock.target).toBe(deepOne);
    steps(g, 2);
    expect(g.lock.target).toBeNull();
  });
});
