import { describe, expect, it } from 'vitest';
import { ENDING_IDS, ENDINGS } from '../src/data/endings';
import { COURT_SIGN, courtEndings, courtOpen, endGame } from '../src/systems/endings';
import { createWorldGame } from '../src/systems/game';
import { applySave, parseSave, snapshot } from '../src/systems/save';
import { signPlace } from '../src/systems/checkpoints';
import { record } from './worldHelpers';

describe('the three endings (spec §5)', () => {
  it('are wake and seal the Gate, pass through with ’Umr at-Tawil, and become Nyarlathotep’s herald', () => {
    expect([...ENDING_IDS]).toEqual(['seal', 'silver_key', 'herald']);
    for (const id of ENDING_IDS) {
      expect(ENDINGS[id].title.trim()).not.toBe('');
      expect(ENDINGS[id].lines.length).toBeGreaterThan(0);
    }
  });

  it("the Court's Elder Sign offers the Gate's sealing and the herald's kneeling once Azathoth slumbers", () => {
    const g = createWorldGame();
    expect(signPlace(COURT_SIGN)).toBeDefined();
    expect(courtOpen(g)).toBe(false);
    expect(courtEndings(g, COURT_SIGN)).toEqual([]);
    g.overworld!.slain.add('boss:azathoth');
    expect(courtEndings(g, COURT_SIGN)).toEqual(['seal', 'herald']);
    expect(courtEndings(g, 'hub_quad')).toEqual([]);
  });

  it('an ending is announced and remembered, through a save', () => {
    const g = createWorldGame();
    const told = record(g, 'Ending');
    endGame(g, 'herald');
    expect(told).toEqual([{ id: 'herald' }]);
    expect(g.overworld!.ending).toBe('herald');
    const loaded = createWorldGame();
    applySave(loaded, parseSave(JSON.stringify(snapshot(g)))!);
    expect(loaded.overworld!.ending).toBe('herald');
    expect(parseSave(JSON.stringify({ ...snapshot(g), ending: 'dreamless' }))).toBeNull();
  });
});
