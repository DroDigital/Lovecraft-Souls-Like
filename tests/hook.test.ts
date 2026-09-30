import { describe, expect, it } from 'vitest';
import { SAMPLE_SETS } from '../src/data/samples';
import { HOOK, SIM } from '../src/data/tuning';
import { createWorldGame } from '../src/systems/game';
import { hookSystem, nextOmen, OMENS } from '../src/systems/hook';
import { record } from './worldHelpers';

describe("the first hour's hook (round 26)", () => {
  const at = (seconds: number) => Math.ceil((seconds * SIM.hz) / 60) * 60;

  it('is heard once the time has come, out of doors in the waking world, and not before', () => {
    const g = createWorldGame();
    g.overworld!.region = 'hub';
    const heard = record(g, 'Foreboding');
    g.frame = at(HOOK.first - 10);
    hookSystem(g);
    expect(heard).toEqual([]);
    g.frame = at(HOOK.first + 1);
    hookSystem(g);
    expect(heard.length).toBe(1);
    expect(nextOmen(g)?.id).toBe('nearer');
    hookSystem(g);
    expect(heard.length).toBe(1); // once
    g.frame = at(HOOK.second + 1);
    hookSystem(g);
    expect(heard.map((h) => h.words)).toEqual(OMENS.map((o) => o.words));
    expect(nextOmen(g)).toBeUndefined();
  });

  it('waits for peace: not in a realm beyond the waking world, nor with someone spoken to', () => {
    const g = createWorldGame();
    const heard = record(g, 'Foreboding');
    g.frame = at(HOOK.first + 5);
    g.overworld!.region = 'dreamlands';
    hookSystem(g);
    g.overworld!.region = 'hub';
    g.player.listening = 1;
    hookSystem(g);
    expect(heard).toEqual([]);
    g.player.listening = null;
    hookSystem(g);
    expect(heard.length).toBe(1);
  });

  it('is of sounds that exist, and is remembered in a save', () => {
    for (const o of OMENS) expect(SAMPLE_SETS[o.sound], o.id).toBeDefined();
    const g = createWorldGame();
    g.overworld!.told.add('omen:call');
    expect(nextOmen(g)?.id).toBe('nearer');
  });
});
