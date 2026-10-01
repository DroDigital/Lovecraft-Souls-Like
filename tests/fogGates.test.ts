import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { allFogs, crosses, fogBlockSystem, fogBetween, fogToPass, passFog, sideOf } from '../src/systems/fogGates';
import { createWorldGame, stepGame } from '../src/systems/game';
import { interactable } from '../src/systems/checkpoints';
import { place } from './helpers';

const doorway = () => allFogs().find((w) => w.kind === 'doorway')!;
const ring = () => allFogs().find((w) => w.kind === 'ring')!;
const beside = (w: ReturnType<typeof doorway>, d: number) => ({ x: w.x - Math.sin(w.yaw) * d, z: w.z - Math.cos(w.yaw) * d });

describe('the fog before a horror is a wall (round 35)', () => {
  it('a step across it is a crossing, one beside it is not', () => {
    const w = doorway();
    expect(crosses(w, beside(w, 1), beside(w, -1))).toBe(true);
    expect(crosses(w, beside(w, 1), beside(w, 2))).toBe(false);
    const r = ring();
    expect(crosses(r, { x: r.x + r.radius - 1, z: r.z }, { x: r.x + r.radius + 1, z: r.z })).toBe(true);
    expect(crosses(r, { x: r.x, z: r.z }, { x: r.x + 3, z: r.z })).toBe(false);
  });

  it('nothing sees across it, and the investigator cannot walk through', () => {
    const g = createWorldGame();
    const w = doorway();
    expect(fogBetween(g, beside(w, 1.5), beside(w, -1.5))).toBe(true);
    const [a, b] = [beside(w, 0.6), beside(w, -0.6)];
    place(g, g.player.id, a.x, a.z, 0);
    const tr = g.ecs.c.transform.get(g.player.id)!;
    tr.pos.x = b.x; // a step that would carry them across
    tr.pos.z = b.z;
    fogBlockSystem(g);
    expect(tr.pos.x).toBeCloseTo(a.x, 5);
    expect(tr.pos.z).toBeCloseTo(a.z, 5);
    const foe = [...g.ecs.c.body.keys()].find((id) => id !== g.player.id && !g.ecs.c.body.get(id)!.fixed)!;
    const ft = g.ecs.c.transform.get(foe)!;
    ft.prev = { ...ft.pos, x: a.x, z: a.z };
    ft.pos = { ...ft.pos, x: b.x, z: b.z };
    fogBlockSystem(g);
    expect(ft.pos.x).toBeCloseTo(a.x, 5); // nor can a foe
  });

  it('E near it walks the investigator through, and the way back is the same', () => {
    const g = createWorldGame();
    const w = doorway();
    const a = beside(w, 1.6);
    place(g, g.player.id, a.x, a.z, 0);
    const before = Math.sign(sideOf(w, a));
    expect(fogToPass(g)?.id).toBe(w.id);
    expect(interactable(g)?.kind === 'fog' || interactable(g) !== null).toBe(true);
    passFog(g, w);
    const tr = g.ecs.c.transform.get(g.player.id)!;
    for (let i = 0; i < 400 && g.player.fogPass; i++) stepGame(g, emptyInput());
    expect(g.player.fogPass).toBeNull();
    expect(Math.sign(sideOf(w, tr.pos))).toBe(-before);
  });
});
