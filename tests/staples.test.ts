import { describe, expect, it } from 'vitest';
import { COMBAT, NEW_GAME_PLUS } from '../src/data/tuning';
import { getEntity } from '../src/data/registry';
import { backstab, strike } from '../src/systems/combat';
import { applyCarry, carryOf, foeBounty, parseCarry } from '../src/systems/cycles';
import { createWorldGame } from '../src/systems/game';
import { spawnCreature } from '../src/systems/creatures';
import { CARRY_KEY, storeCarry, takeCarry } from '../src/systems/records';
import { parseSave, snapshot } from '../src/systems/save';
import { place, press, scriptedGame, steps } from './helpers';

/** A store in memory. */
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe('backstabs (round 12)', () => {
  it("a blow into a foe's back lands as a riposte: much harder, and it reels", () => {
    const hitFrom = (behind: boolean): { dealt: number; move: string | null } => {
      const s = scriptedGame();
      place(s.g, s.deepOne, 0, 0, 0); // facing +z
      place(s.g, s.player, 0, behind ? -1.2 : 1.2, behind ? 0 : Math.PI);
      const h = s.g.ecs.c.health.get(s.deepOne)!;
      const before = h.hp;
      steps(s.g, 1, press('light'));
      steps(s.g, 12);
      return { dealt: before - h.hp, move: s.g.ecs.c.actor.get(s.deepOne)!.move };
    };
    const front = hitFrom(false);
    const back = hitFrom(true);
    expect(back.dealt).toBe(Math.round(front.dealt * COMBAT.riposte));
    expect(back.move).toBe('stagger');
  });

  it('no boss, and nothing colossal, is backstabbed', () => {
    const g = createWorldGame();
    const boss = spawnCreature(g, 'keziah_mason', { x: 0, z: 0, yaw: 0 })!;
    const gug = spawnCreature(g, 'gug', { x: 10, z: 0, yaw: 0 })!;
    place(g, g.player.id, 0, -1.5, 0);
    expect(backstab(g, g.player.id, boss)).toBe(false);
    place(g, g.player.id, 10, -3, 0);
    expect(backstab(g, g.player.id, gug)).toBe(false);
  });
});

describe('a new journey (NG+, round 12)', () => {
  it('carries the strength through the reload, once', () => {
    const g = createWorldGame();
    Object.assign(g.player, { stones: 4, echoes: 1234, reagentMax: 5 });
    g.player.levels.might = 7;
    g.player.arms.push('axe');
    g.player.weapon = 'axe';
    g.player.reinforced.axe = 2;
    const store = memory();
    storeCarry(store, carryOf(g));
    const carry = takeCarry(store)!;
    expect(store.getItem(CARRY_KEY)).toBeNull(); // taken once
    const next = createWorldGame({ carry });
    expect(next.player).toMatchObject({ cycle: 1, stones: 4, echoes: 1234, reagentMax: 5, weapon: 'axe' });
    expect(next.player.levels.might).toBe(7);
    expect(next.player.reinforced.axe).toBe(2);
    expect(next.overworld!.slain.size).toBe(0); // the world begins again
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(next)))! });
    expect(loaded.player.cycle).toBe(1);
  });

  it("a later journey's foes are hardier, strike harder and leave more", () => {
    const g = createWorldGame();
    applyCarry(g, parseCarry({ cycle: 2 })!);
    const e = spawnCreature(g, 'deep_one', { x: 0, z: 0, yaw: 0 })!;
    const def = getEntity('deep_one')!;
    expect(g.ecs.c.health.get(e)!.max).toBe(Math.round(def.stats.hp * (1 + 2 * NEW_GAME_PLUS.health)));
    expect(g.ecs.c.combatant.get(e)!.bounty).toBe(Math.round(def.drops.echoes * foeBounty(g)));
    const h = g.ecs.c.health.get(g.player.id)!;
    const before = h.hp;
    strike(g, e, g.player.id, { damage: 20, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false });
    expect(before - h.hp).toBe(Math.round(20 * (1 + 2 * NEW_GAME_PLUS.damage)));
  });

  it('a damaged carry is mended, not trusted', () => {
    const c = parseCarry({ cycle: 99, levels: { might: 1e6 }, arms: ['axe', 'no_such'], weapon: 'razor', stones: -4 })!;
    expect(c.cycle).toBe(NEW_GAME_PLUS.most);
    expect(c.arms).toEqual(['cane', 'axe']);
    expect(c.weapon).toBe('cane'); // not theirs
    expect(c.stones).toBe(0);
    expect(parseCarry('nonsense')).toBeNull();
  });
});
