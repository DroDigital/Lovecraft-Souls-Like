/**
 * A bot fights every scripted boss in the arena (playtest round 24): it closes to the body's edge,
 * strikes, dodges now and again, does what E offers, and cannot be killed. Nothing may throw or be
 * left not a number, and every boss it can reach falls within two and a half minutes. Two finds came
 * out of this: a blow that killed a boss whose summons its fall had just cleared went on to reach
 * for them, and the colossi (Cthulhu, Ghatanothoa, Yog-Sothoth, Shub-Niggurath) could not be struck.
 */
import { describe, expect, it } from 'vitest';
import { ENTITIES } from '../src/data/registry';
import { botFight } from './botHelpers';

const FRAMES = 60 * 150;
const BOSSES = Object.values(ENTITIES).filter((e) => e.bossScript).map((e) => e.id);
/** What these ask of the investigator is more than the bot does: to take the Alert's helm, to keep behind a monolith from a gaze that turns flesh to stone, to cut down the roots. It wounds them all the same. */
const ASKS_MORE = ['cthulhu', 'ghatanothoa', 'shub_niggurath'];

describe('a bot fights every boss (playtest round 24)', () => {
  it('has bosses to fight', () => expect(BOSSES.length).toBeGreaterThan(40));

  it.each(BOSSES)('%s: no throw, nothing left not a number, and it falls (or is wounded, if it asks more)', (id) => {
    const r = botFight(id, FRAMES);
    expect(r.bad).toEqual([]);
    if (ASKS_MORE.includes(id)) expect(r.dealt).toBeGreaterThan(0);
    else expect(r.fell).toBe(true);
  });
});
