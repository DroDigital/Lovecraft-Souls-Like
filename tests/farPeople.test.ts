import { describe, expect, it } from 'vitest';
import { FAR_NPCS } from '../src/data/npcsFar';
import { QUESTS } from '../src/data/quests';
import { REGIONS } from '../src/data/regions';
import { discover, travel } from '../src/systems/checkpoints';
import type { Game } from '../src/systems/components';
import { createWorldGame } from '../src/systems/game';
import { mainLead } from '../src/systems/lead';
import { npcEntity, npcPlace, talk } from '../src/systems/npcs';
import { isDone, stageOf, startQuest } from '../src/systems/quests';
import { worldLayout } from '../src/world/placements';
import { record, run } from './worldHelpers';

const say = (g: Game, npc: string): readonly string[] => {
  const heard = record(g, 'Talked');
  talk(g, npc);
  return heard[0].lines;
};

describe('the far realms (round 12)', () => {
  it('each realm that stood empty has someone in it, with a favour to ask', () => {
    const w = worldLayout();
    for (const region of ['pnakotus', 'kn_yan', 'rlyeh', 'yuggoth', 'beyond']) {
      const here = FAR_NPCS.filter((n) => w.signs.find((s) => s.id === n.sign)?.region === region);
      expect(here.length, region).toBeGreaterThan(0);
      expect(here.some((n) => n.topics.some((t) => t.starts && QUESTS[t.starts])), region).toBe(true);
    }
  });

  it('every spawn table holds at least three kinds of creature, and the thin ones four (Dunwich had one; Vermont, Yuggoth and Beyond two)', () => {
    for (const r of REGIONS) expect(Object.keys(r.spawns.table).length, r.id).toBeGreaterThanOrEqual(['dunwich', 'vermont', 'yuggoth', 'beyond'].includes(r.id) ? 4 : 3);
  });

  it("Zamacona's thanks is his espada; Johansen's, star-stones", () => {
    const g = createWorldGame();
    say(g, 'zamacona');
    expect(stageOf(g, 'zamacona')).toBe(0);
    g.overworld!.slain.add('boss:tsathoggua');
    run(g, 31);
    expect(isDone(g, 'zamacona')).toBe(true);
    expect(g.player.arms).toContain('rapier');
    say(g, 'johansen');
    g.overworld!.slain.add('boss:cthulhu');
    const before = g.player.stones;
    run(g, 31);
    expect(g.player.stones).toBe(before + QUESTS.alert.reward.stones!);
  });

  it("Akeley's favour runs through the Fungoid Cities to Rhan-Tegoth", () => {
    const g = createWorldGame();
    say(g, 'akeley');
    discover(g, 'yuggoth_cities');
    run(g, 31);
    expect(stageOf(g, 'cylinders')).toBe(1);
    expect(say(g, 'akeley').join(' ')).toContain('Rhan-Tegoth');
  });

  it('the priests of the Cavern of Flame speak through the ally who stands for them', () => {
    const g = createWorldGame();
    discover(g, 'dream_cavern');
    travel(g, 'dream_cavern');
    run(g, 30);
    const e = npcEntity(g, 'nasht');
    expect(e).toBeDefined();
    expect(g.ecs.c.model.get(e!)).toBe('creature:nasht_kaman_thah');
    expect(say(g, 'nasht')[0]).toContain('Nasht and Kaman-Thah');
    expect(npcPlace(FAR_NPCS.find((n) => n.id === 'nasht')!)).toBeDefined(); // the lead can find them
  });

  it('once Keziah falls, the lead goes to Kuranes whether or not Gilman is seen again (the sequence break)', () => {
    const g = createWorldGame();
    startQuest(g, 'sleepers');
    talk(g, 'gilman'); // sleepers done; he asks the Witch House
    expect(stageOf(g, 'witch_house')).toBe(0);
    g.overworld!.slain.add('boss:keziah_mason');
    run(g, 61);
    expect(isDone(g, 'witch_house')).toBe(true);
    expect(stageOf(g, 'descent')).toBe(0);
    expect(mainLead(g)!.text).toContain('Kuranes');
    talk(g, 'kuranes'); // straight on, without going back to Gilman
    expect(isDone(g, 'descent')).toBe(true);
    expect(stageOf(g, 'kadath')).toBe(0);
    expect(mainLead(g)!.text).toContain('of 4 have fallen');
  });
});
