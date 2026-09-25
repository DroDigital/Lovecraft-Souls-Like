import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyInput } from '../src/core/input';
import { signPlace, travel } from '../src/systems/checkpoints';
import { strike } from '../src/systems/combat';
import { createWorldGame, stepGame } from '../src/systems/game';
import { createJourneys } from '../src/ui/journeys';
import { inkLine, veilField, type Veil } from '../src/ui/veil';
import { worldLayout } from '../src/world/placements';
import { press, scriptedGame } from './helpers';
import { deathblow, goTo, record } from './worldHelpers';

/** A veil that covers only when told to, and says what it was asked. */
function fakeVeil() {
  let covered = false;
  let finish: (() => void) | null = null;
  const asked: string[] = [];
  const veil: Veil = {
    cover: (words = '') => (asked.push(`cover ${words}`), new Promise<void>((r) => (finish = () => ((covered = true), r())))),
    lift: () => (asked.push('lift'), (covered = false), Promise.resolve()),
    darken: () => void (covered = true),
    haunt: () => undefined,
    get covered() {
      return covered;
    },
    get active() {
      return covered;
    },
  };
  return { veil, asked, covers: async () => (finish?.(), await Promise.resolve()) };
}

let now = 0;
const at = (ms: number): void => void (now = ms);
vi.spyOn(performance, 'now').mockImplementation(() => now);
afterEach(() => at(0));

const pos = (g: ReturnType<typeof createWorldGame>) => g.ecs.c.transform.get(g.player.id)!.pos;

describe('journeys (ui/journeys.ts)', () => {
  it('a jump waits under the veil: the world stands still while it covers, takes a step on arrival, waits for the chunks, then the veil lifts', async () => {
    const g = createWorldGame();
    g.overworld!.discovered.add('arkham_streets');
    const { veil, asked, covers } = fakeVeil();
    const j = createJourneys(g, veil);
    j.go('ARKHAM', () => travel(g, 'arkham_streets'));
    expect(asked).toEqual(['cover ARKHAM']);
    expect(j.before(emptyInput())).toBeNull();
    expect(pos(g).x).not.toBeCloseTo(signPlace('arkham_streets')!.rest.x);
    await covers();
    expect(pos(g)).toMatchObject({ x: signPlace('arkham_streets')!.rest.x, z: signPlace('arkham_streets')!.rest.z });
    expect(j.before(press('light'))).toEqual(emptyInput()); // one step without the investigator's hand...
    expect(j.before(emptyInput())).toBeNull(); // ...then the world waits in the dark
    expect(j.budget).toBeGreaterThan(10);
    at(2000);
    j.update(3); // chunks still building
    expect(asked).toEqual(['cover ARKHAM']);
    j.update(0);
    expect(asked).toEqual(['cover ARKHAM', 'lift']);
    expect(j.still).toBe(false);
  });

  it('E at a gate is a journey through it, named for where it leads', async () => {
    const g = createWorldGame();
    const gate = worldLayout().gates[0];
    const twin = worldLayout().gates.find((x) => x.id === gate.to)!;
    goTo(g, gate.arrive.x, gate.arrive.z);
    const { veil, asked, covers } = fakeVeil();
    const j = createJourneys(g, veil);
    const frame = press('interact');
    expect(j.before(frame)?.pressed.interact).toBe(false); // the world never sees it
    expect(asked).toEqual([`cover ${twin.name.toUpperCase()}`]);
    await covers();
    expect(pos(g)).toMatchObject({ x: twin.arrive.x, z: twin.arrive.z });
  });

  it('dying, the veil falls and the death throes wait for it before the respawn', async () => {
    const { g, deepOne } = scriptedGame();
    const { veil, asked, covers } = fakeVeil();
    const j = createJourneys(g, veil);
    const respawned = record(g, 'Respawned');
    strike(g, deepOne, g.player.id, deathblow);
    at(1000);
    j.update(0);
    expect(asked).toEqual(['cover THE ELDER SIGN']);
    for (let i = 0; i < 400; i++) {
      const input = j.before(emptyInput());
      if (input) stepGame(g, input);
    }
    expect(respawned).toEqual([]); // held at the last of the fall
    await covers();
    for (let i = 0; i < 5; i++) {
      const input = j.before(emptyInput());
      if (input) stepGame(g, input);
    }
    expect(respawned).toHaveLength(1);
    at(3000);
    j.update(0);
    expect(asked.at(-1)).toBe('lift');
  });
});

describe('the veil (ui/veil.ts)', () => {
  it('creeps in from the edges: nothing covered at 0, everything at 1, the corners before the centre', () => {
    const [w, h] = [48, 27];
    const f = veilField(w, h);
    const values = [...f];
    expect(Math.max(...values)).toBeLessThan(inkLine(0));
    expect(Math.min(...values)).toBeGreaterThan(inkLine(1));
    const centre = f[Math.floor(h / 2) * w + Math.floor(w / 2)];
    for (const corner of [f[0], f[w - 1], f[(h - 1) * w], f[h * w - 1]]) expect(corner).toBeGreaterThan(centre);
  });
});
