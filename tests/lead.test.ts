import { describe, expect, it } from 'vitest';
import { NPCS } from '../src/data/npcs';
import { QUESTS } from '../src/data/quests';
import { createWorldGame } from '../src/systems/game';
import { goalPlace, mainLead } from '../src/systems/lead';
import { npcPlace } from '../src/systems/npcs';
import { startQuest } from '../src/systems/quests';
import { worldLayout } from '../src/world/placements';

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
    for (const q of Object.values(QUESTS).filter((x) => x.main)) for (const s of q.stages) expect(goalPlace(s.goal), `${q.title}: ${s.note}`).not.toBeNull();
    const g = createWorldGame();
    for (const [id, q] of Object.entries(QUESTS)) g.overworld!.quests.set(id, q.stages.length);
    expect(mainLead(g)).toBeNull();
  });

  it("finds a boss's fight where its ring or room is", () => {
    const arena = worldLayout().arenas.find((a) => a.bosses.includes('colour_out_of_space'))!;
    expect(goalPlace({ kind: 'slay', boss: 'colour_out_of_space' })).toEqual({ x: arena.x, z: arena.z });
  });
});
