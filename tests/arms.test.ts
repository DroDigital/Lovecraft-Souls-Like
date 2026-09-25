import { describe, expect, it } from 'vitest';
import { armedMoves, WEAPON_IDS, WEAPONS } from '../src/data/weapons';
import { equip } from '../src/systems/arms';
import { createGame, createWorldGame } from '../src/systems/game';
import { parseSave, snapshot } from '../src/systems/save';
import { worldLayout } from '../src/world/placements';
import { place, press, steps } from './helpers';
import { stepGame } from '../src/systems/game';
import { buildFigure } from '../src/render/figures';

describe('arms (data/weapons.ts, systems/arms.ts)', () => {
  it("every weapon's chains are sound: they start at light1 and heavy1, and every combo leads to a move it has", () => {
    for (const id of WEAPON_IDS) {
      const moves = armedMoves(id);
      expect(moves.light1, id).toBeDefined();
      expect(moves.heavy1, id).toBeDefined();
      for (const [name, m] of Object.entries(WEAPONS[id].moves)) {
        const [from, to] = m.hit!.window;
        expect(to, `${id}.${name}`).toBeLessThanOrEqual(m.frames);
        expect(m.cancel!, `${id}.${name}`).toBeGreaterThanOrEqual(to);
        for (const next of Object.values(m.combo ?? {})) expect(moves[next!], `${id}.${name} → ${next}`).toBeDefined();
        expect(from).toBeGreaterThan(0);
      }
    }
  });

  it('each handles as it says: the razor cuts first, the axe bites hardest', () => {
    const first = (id: keyof typeof WEAPONS): number => WEAPONS[id].moves.light1.hit!.window[0];
    expect(first('razor')).toBeLessThan(first('cane'));
    expect(first('axe')).toBeGreaterThan(first('cane'));
    const hardest = (id: keyof typeof WEAPONS): number => Math.max(...Object.values(WEAPONS[id].moves).map((m) => m.hit!.damage));
    expect(hardest('axe')).toBeGreaterThan(hardest('cane'));
  });

  it('only a weapon they own can be taken up, and it brings its own chains', () => {
    const g = createGame();
    const a = g.ecs.c.actor.get(g.player.id)!;
    expect(equip(g, 'razor')).toBe(false);
    g.player.arms.push('razor');
    expect(equip(g, 'razor')).toBe(true);
    expect(g.player.weapon).toBe('razor');
    stepGame(g, press('light'));
    expect(a.move).toBe('light1');
    expect(a.moves.light1.frames).toBe(WEAPONS.razor.moves.light1.frames);
    expect(a.moves.roll).toBeDefined(); // the rest of the investigator's moves stay
  });

  it('a weapon lies in the Witch House until found, then it is theirs, and stays so through a reload', () => {
    const t = worldLayout().tomes.find((x) => x.weapon === 'razor')!;
    expect(t).toBeDefined();
    const g = createWorldGame();
    const notices: string[] = [];
    g.events.on('Notice', (e) => notices.push(e.text));
    place(g, g.player.id, t.at.x, t.at.z, 0);
    steps(g, 2);
    expect(g.player.arms).toContain('razor');
    expect(notices.some((n) => n.startsWith('STRAIGHT RAZOR'))).toBe(true);
    equip(g, 'razor');
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(loaded.player.arms).toEqual(['cane', 'razor']);
    expect(loaded.player.weapon).toBe('razor');
    expect(loaded.ecs.c.actor.get(loaded.player.id)!.moves.light4).toBeDefined();
    expect([...loaded.ecs.c.tome.values()].some((x) => x.weapon === 'razor')).toBe(false); // taken for good
  });

  it('every found weapon has a trestle to lie on and a place in the hand', () => {
    const hand = buildFigure('player').arms!;
    for (const id of WEAPON_IDS) {
      expect(hand[id], id).toBeDefined();
      if (id !== 'cane') expect(buildFigure(`arm:${id}`).rig, id).toBe('prop');
    }
  });

  it('a save naming a weapon it does not own falls back to the sword-cane', () => {
    const save = { ...snapshot(createWorldGame()), arms: ['cane', 'no_such_thing'], weapon: 'axe' };
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(save))! });
    expect(loaded.player.arms).toEqual(['cane']);
    expect(loaded.player.weapon).toBe('cane');
  });
});
