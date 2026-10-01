import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { rest, signPlace, travel } from '../src/systems/checkpoints';
import { createWorldGame, stepGame } from '../src/systems/game';
import { worldLayout } from '../src/world/placements';
import { place } from './helpers';

describe('kneeling at an Elder Sign (round 29)', () => {
  it('fast travel arrives on one knee before the stone, and they rise on the first step', () => {
    const g = createWorldGame();
    const [a, b] = worldLayout().signs.filter((s) => !s.dream);
    g.overworld!.discovered.add(a.id);
    g.overworld!.discovered.add(b.id);
    expect(travel(g, b.id)).toBe(true);
    expect(g.player.kneeling).toEqual({ x: b.x, z: b.z });
    const at = signPlace(b.id)!;
    expect(g.ecs.c.transform.get(g.player.id)!.pos.x).toBeCloseTo(at.rest.x, 5);
    stepGame(g, emptyInput()); // standing still: still down
    expect(g.player.kneeling).not.toBeNull();
    stepGame(g, { ...emptyInput(), moveY: 1 });
    expect(g.player.kneeling).toBeNull();
  });

  it('a rest kneels them too, and a bare travel to a sign not found does nothing', () => {
    const g = createWorldGame();
    const s = worldLayout().signs.find((x) => !x.dream)!;
    place(g, g.player.id, s.x, s.z + 2, 0);
    expect(rest(g, s.id)).toBe(true);
    expect(g.player.kneeling).toEqual({ x: s.x, z: s.z });
    g.player.kneeling = null;
    const other = worldLayout().signs.filter((x) => !x.dream && x.id !== s.id && !g.overworld!.discovered.has(x.id))[0];
    expect(travel(g, other.id)).toBe(false);
    expect(g.player.kneeling).toBeNull();
  });
});

describe('a respawn kneels too (round 31)', () => {
  it('after a fall at a sign they come up on one knee before it, and rise on the first move', async () => {
    const { strike } = await import('../src/systems/combat');
    const { PLAYER_MOVES } = await import('../src/data/moves');
    const g = createWorldGame();
    const s = worldLayout().signs.find((x) => !x.dream)!;
    place(g, g.player.id, s.x, s.z + 2, 0);
    expect(rest(g, s.id)).toBe(true);
    g.player.kneeling = null;
    strike(g, g.player.id, g.player.id, { damage: 9999, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false });
    for (let i = 0; i < PLAYER_MOVES.death.frames + 5; i++) stepGame(g, emptyInput());
    expect(g.player.kneeling).toEqual({ x: s.x, z: s.z });
    stepGame(g, { ...emptyInput(), moveY: 1 });
    expect(g.player.kneeling).toBeNull();
  });
});
