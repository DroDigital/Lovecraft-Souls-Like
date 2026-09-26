/** Fixed-timestep simulation clock with interpolated rendering (spec §1). */

export interface FixedStep {
  /** Feed real elapsed seconds; returns sim steps to run and the render blend factor in [0, 1). */
  advance(frameSeconds: number): { steps: number; alpha: number };
}

export function createFixedStep(hz: number, maxFrameSeconds: number): FixedStep {
  const dt = 1 / hz;
  let acc = 0;
  return {
    advance(frameSeconds) {
      acc += Math.min(Math.max(frameSeconds, 0), maxFrameSeconds);
      let steps = 0;
      while (acc >= dt) {
        acc -= dt;
        steps++;
      }
      return { steps, alpha: acc / dt };
    },
  };
}

export interface LoopHooks {
  step(dt: number): void;
  render(alpha: number): void;
}

/**
 * Drives the hooks from requestAnimationFrame. Returns a stop function. A frame that throws stops
 * the loop and is handed to `failed` (the crash screen), rather than freezing on its last frame.
 */
export function startLoop(hooks: LoopHooks, hz: number, maxFrameSeconds: number, failed?: (e: unknown) => void): () => void {
  const clock = createFixedStep(hz, maxFrameSeconds);
  const dt = 1 / hz;
  let last = performance.now();
  let raf = 0;
  const frame = (now: number): void => {
    const { steps, alpha } = clock.advance((now - last) / 1000);
    last = now;
    try {
      for (let i = 0; i < steps; i++) hooks.step(dt);
      hooks.render(alpha);
    } catch (e) {
      if (!failed) throw e;
      failed(e);
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
