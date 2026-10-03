import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY_IDS, type DifficultyId } from '../src/data/tuning';
import { strike, type Blow } from '../src/systems/combat';
import { applyCarry, carryOf, parseCarry } from '../src/systems/cycles';
import { createWorldGame } from '../src/systems/game';
import { parseSave, snapshot } from '../src/systems/save';
import { scriptedGame } from './helpers';

const blow: Blow = { damage: 40, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false };

/** What a blow of 40 does to `to` from `from`, at `difficulty`, in journey `cycle`. */
function dealt(difficulty: DifficultyId, cycle: number, who: 'foe' | 'player'): number {
  const { g, player, deepOne } = scriptedGame();
  g.player.difficulty = difficulty;
  g.player.cycle = cycle;
  let damage = 0;
  g.events.on('Hit', (e) => void (damage = e.damage));
  who === 'foe' ? strike(g, deepOne, player, blow) : strike(g, player, deepOne, blow);
  return damage;
}

describe('the difficulty chosen when a dream begins (round 38)', () => {
  it('weighs every enemy blow, and nobody else’s', () => {
    expect(DIFFICULTY_IDS).toEqual(['light', 'deep', 'nightmare']);
    expect(dealt('deep', 0, 'foe')).toBe(40);
    expect(dealt('light', 0, 'foe')).toBe(Math.round(40 * DIFFICULTIES.light.foe));
    expect(dealt('nightmare', 0, 'foe')).toBe(60);
    for (const d of DIFFICULTY_IDS) expect(dealt(d, 0, 'player')).toBe(40); // the investigator's blows are their own
  });

  it('is laid over the journey’s own weight', () => {
    const plain = dealt('deep', 2, 'foe');
    expect(plain).toBeGreaterThan(40);
    expect(dealt('nightmare', 2, 'foe')).toBe(Math.round(plain * 1.5));
  });

  it('begins at the one a new dream is given, and the default for a world made without one', () => {
    expect(createWorldGame().player.difficulty).toBe(DEFAULT_DIFFICULTY);
    expect(createWorldGame({ difficulty: 'nightmare' }).player.difficulty).toBe('nightmare');
  });

  it('is kept in the save, and a save from before it is the default', () => {
    const g = createWorldGame({ difficulty: 'light' });
    const json = JSON.stringify(snapshot(g));
    expect(createWorldGame({ save: parseSave(json)! }).player.difficulty).toBe('light');
    const old = JSON.parse(json) as Record<string, unknown>;
    delete old.difficulty;
    expect(createWorldGame({ save: parseSave(JSON.stringify(old))!, difficulty: 'light' }).player.difficulty).toBe(DEFAULT_DIFFICULTY); // what is not in the save is not the title's choice either
    old.difficulty = 'impossible';
    expect(createWorldGame({ save: parseSave(JSON.stringify(old))! }).player.difficulty).toBe(DEFAULT_DIFFICULTY);
  });

  it('goes with the strength carried into a second journey, which cannot choose again', () => {
    const g = createWorldGame({ difficulty: 'nightmare' });
    const carry = parseCarry(JSON.parse(JSON.stringify(carryOf(g))))!;
    expect(carry.difficulty).toBe('nightmare');
    const next = createWorldGame({ carry, difficulty: 'light' });
    expect(next.player.difficulty).toBe('nightmare');
    expect(parseCarry({ ...carryOf(g), difficulty: 'x' })!.difficulty).toBe(DEFAULT_DIFFICULTY);
    applyCarry(next, { ...carry, difficulty: 'light' });
    expect(next.player.difficulty).toBe('light'); // only a carry, made at an ending, sets it
  });
});
