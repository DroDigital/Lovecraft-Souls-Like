import { describe, expect, it } from 'vitest';
import { createFixedStep } from '../src/core/loop';

describe('fixed-step loop', () => {
  it('runs one step per tick and carries the remainder as alpha', () => {
    const clock = createFixedStep(60, 0.25);
    expect(clock.advance(1 / 60)).toEqual({ steps: 1, alpha: 0 });
    const r = clock.advance(1.5 / 60);
    expect(r.steps).toBe(1);
    expect(r.alpha).toBeCloseTo(0.5);
  });

  it('accumulates frames shorter than a tick', () => {
    const clock = createFixedStep(4, 1);
    expect(clock.advance(0.125).steps).toBe(0);
    expect(clock.advance(0.125).steps).toBe(1);
  });

  it('clamps long frames so the simulation cannot spiral', () => {
    const clock = createFixedStep(4, 1);
    expect(clock.advance(10).steps).toBe(4);
  });

  it('ignores negative frame times', () => {
    const clock = createFixedStep(4, 1);
    expect(clock.advance(-5)).toEqual({ steps: 0, alpha: 0 });
  });
});
