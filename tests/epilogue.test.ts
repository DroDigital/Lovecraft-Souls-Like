import { describe, expect, it } from 'vitest';
import { CREDITS } from '../src/data/credits';
import { FATES, fateOf } from '../src/data/epilogues';
import { NPCS } from '../src/data/npcs';
import { QUESTS } from '../src/data/quests';
import { createWorldGame } from '../src/systems/game';
import { spawnCreature } from '../src/systems/creatures';
import { strike } from '../src/systems/combat';
import { parseSave, snapshot } from '../src/systems/save';
import { bossesSlain, playTime } from '../src/systems/tally';
import { deathblow, run } from './worldHelpers';

describe("an ending's last pages (round 12)", () => {
  it('everyone who can be met has a fate, and every favour a fate for it done and undone', () => {
    for (const n of NPCS) {
      if (n.creature) continue; // the priests keep their own counsel
      const f = FATES[n.id];
      expect(f, n.id).toBeDefined();
      if (f.quest) expect(QUESTS[f.quest], `${n.id}: ${f.quest}`).toBeDefined();
    }
    expect(fateOf('gilman', 'seal', true)).toBe(FATES.gilman.done);
    expect(fateOf('gilman', 'seal', false)).toBe(FATES.gilman.undone);
    expect(fateOf('carter', 'silver_key', true)).toBe(FATES.carter.endings!.silver_key);
    expect(fateOf('nasht', 'seal', true)).toBeUndefined();
  });

  it('the dream keeps its numbers, and a save keeps them too', () => {
    const g = createWorldGame();
    run(g, 120);
    const foe = spawnCreature(g, 'deep_one', { x: 3, z: 3, yaw: 0 })!;
    strike(g, g.player.id, foe, deathblow);
    g.events.emit('Echoes', { change: 'earned', amount: 40, total: 40 });
    strike(g, foe, g.player.id, deathblow);
    const t = g.overworld!.tally;
    expect(t.frames).toBe(120);
    expect(t.kills).toBe(1);
    expect(t.deaths).toBe(1);
    expect(t.echoes).toBeGreaterThanOrEqual(40);
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(loaded.overworld!.tally).toEqual(t);
  });

  it('reads time as a clock does, and counts the horrors put down', () => {
    expect(playTime(0)).toBe('0:00');
    expect(playTime(60 * 60 * (2 * 60 + 7))).toBe('2:07');
    const g = createWorldGame();
    g.overworld!.slain.add('boss:keziah_mason');
    const [slain, of] = bossesSlain(g);
    expect(slain).toBe(1);
    expect(of).toBeGreaterThan(40);
  });

  it('the credits name every recordist of the recorded sounds', () => {
    const sounds = CREDITS.find((b) => b.heading === 'RECORDED SOUNDS')!.lines.join(' ');
    for (const who of ['craigsmith', 'Breviceps', 'EvaMusik', 'fonografico', 'corkob', 'Lsoundaccount', 'TheKingOfGeeks360', 'waterboy920']) expect(sounds).toContain(who);
  });
});
