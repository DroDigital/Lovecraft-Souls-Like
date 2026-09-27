import { describe, expect, it } from 'vitest';
import { NPCS } from '../src/data/npcs';
import { QUESTS } from '../src/data/quests';
import { createWorldGame } from '../src/systems/game';
import { goalPlace, mainLead } from '../src/systems/lead';
import { wayTo } from '../src/systems/leadWay';
import { npcPlace } from '../src/systems/npcs';
import { startQuest } from '../src/systems/quests';
import { worldLayout } from '../src/world/placements';
import { goTo } from './worldHelpers';

const placeOf = (id: string): { x: number; z: number } => {
  const at = npcPlace(NPCS.find((n) => n.id === id)!)!;
  return { x: at.x, z: at.z };
};

describe('where the story leads (systems/lead.ts)', () => {
  it('points a new investigator to whoever asks the first main quest', () => {
    const g = createWorldGame();
    const lead = mainLead(g)!;
    expect(lead.text).toContain('Peaslee');
    expect(lead.at).toEqual(placeOf('peaslee'));
  });

  it("then follows the open stage's goal", () => {
    const g = createWorldGame();
    startQuest(g, 'sleepers');
    const lead = mainLead(g)!;
    expect(lead.text).toBe(QUESTS.sleepers.stages[0].note);
    expect(lead.at).toEqual(placeOf('gilman'));
  });

  it('places every goal of the main line, and falls silent once it is done', () => {
    for (const q of Object.values(QUESTS).filter((x) => x.main)) {
      for (const s of q.stages) if (s.goal.kind !== 'seals') expect(goalPlace(s.goal), `${q.title}: ${s.note}`).not.toBeNull(); // the seals: sealLead
    }
    const g = createWorldGame();
    for (const [id, q] of Object.entries(QUESTS)) g.overworld!.quests.set(id, q.stages.length);
    expect(mainLead(g)).toBeNull();
  });

  it("finds a boss's fight where its ring or room is", () => {
    const arena = worldLayout().arenas.find((a) => a.bosses.includes('colour_out_of_space'))!;
    expect(goalPlace({ kind: 'slay', boss: 'colour_out_of_space' })).toEqual({ x: arena.x, z: arena.z });
  });

  describe('a goal in another realm is marked where the way to it begins (round 17)', () => {
    const w = worldLayout();
    const sleeper = w.signs.find((x) => x.dream)!;
    const gate = (id: string) => ({ x: w.gates.find((x) => x.id === id)!.x, z: w.gates.find((x) => x.id === id)!.z });
    const afterKeziah = () => {
      const g = createWorldGame();
      for (const id of ['sleepers', 'witch_house']) g.overworld!.quests.set(id, QUESTS[id].stages.length);
      g.overworld!.slain.add('boss:keziah_mason');
      startQuest(g, 'descent');
      return g;
    };

    it("the descent's lead, in the waking world, marks the Sleeper's Sign; on the sealed stairs, their gate; out in the dream, Kuranes", () => {
      const g = afterKeziah();
      expect(mainLead(g)!.at).toEqual({ x: sleeper.x, z: sleeper.z });
      goTo(g, w.dream!.x, w.dream!.z);
      expect(mainLead(g)!.at).toEqual(gate('dream_deeper'));
      const wood = w.gates.find((x) => x.id === 'dream_wood_gate')!.arrive;
      goTo(g, wood.x, wood.z);
      expect(mainLead(g)!.at).toEqual(placeOf('kuranes'));
    });

    it('the stair stays unmarked until it opens; the far realms are reached by their gates, the Beyond by the stair and then the Ultimate Gate', () => {
      const g = createWorldGame();
      const here = { x: sleeper.x + 3, z: sleeper.z + 3 };
      const beyond = w.signs.find((x) => x.region === 'beyond')!;
      expect(wayTo(g, here, placeOf('kuranes'))).not.toEqual({ x: sleeper.x, z: sleeper.z }); // shut: no way down (the nearest lit sign, if any)
      g.overworld!.slain.add('boss:keziah_mason');
      expect(wayTo(g, here, beyond)).toEqual({ x: sleeper.x, z: sleeper.z });
      expect(wayTo(g, w.dream!, beyond)).toEqual(gate('dream_deeper')); // out of the sealed stairs first
      const wood = w.gates.find((x) => x.id === 'dream_wood_gate')!.arrive;
      expect(wayTo(g, wood, beyond)).toEqual(gate('dream_ultimate'));
      const rlyeh = w.signs.find((x) => x.region === 'rlyeh')!;
      expect(wayTo(g, here, rlyeh)).toEqual(gate('innsmouth_alert'));
      expect(wayTo(g, rlyeh, placeOf('peaslee'))).toEqual(gate('rlyeh_gate'));
    });

    it('from the dream, the waking world is reached by a lit Elder Sign (its travel crosses realms), and the seals lead there', () => {
      const g = afterKeziah();
      g.overworld!.quests.set('descent', QUESTS.descent.stages.length);
      startQuest(g, 'kadath');
      const wood = w.signs.find((x) => x.region === 'dreamlands' && !x.dream)!;
      goTo(g, wood.x + 2, wood.z + 2);
      expect(mainLead(g)!.at).toBeNull(); // no sign lit here yet
      g.overworld!.discovered.add(wood.id);
      expect(mainLead(g)!.at).toEqual({ x: wood.x, z: wood.z });
    });
  });
});
