/**
 * Time-sliced work (spec §3D: chunk generation takes at most 2 ms a frame). A job is a generator
 * that yields between small steps; `run` keeps starting steps, oldest job first, until the budget is
 * spent. Jobs are keyed, so one whose chunk was unloaded before it finished can be cancelled.
 */

export interface Slicer {
  add(key: number, job: Iterator<unknown>): void;
  cancel(key: number): void;
  has(key: number): boolean;
  readonly pending: number;
  /** Runs steps until `budgetMs` has passed (a step already started finishes); returns how many ran. */
  run(budgetMs: number): number;
  /** Runs one job to its end now, outside the budget (for work that cannot wait). */
  finish(key: number): void;
}

export function createSlicer(now: () => number): Slicer {
  const jobs = new Map<number, Iterator<unknown>>();
  return {
    add: (key, job) => void jobs.set(key, job),
    cancel: (key) => void jobs.delete(key),
    has: (key) => jobs.has(key),
    get pending() {
      return jobs.size;
    },
    run(budgetMs) {
      const start = now();
      let steps = 0;
      while (jobs.size > 0 && now() - start < budgetMs) {
        const [key, job] = jobs.entries().next().value!;
        steps++;
        if (job.next().done) jobs.delete(key);
      }
      return steps;
    },
    finish(key) {
      const job = jobs.get(key);
      if (!job) return;
      while (!job.next().done);
      jobs.delete(key);
    },
  };
}
