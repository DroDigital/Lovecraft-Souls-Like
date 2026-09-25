import { describe, expect, it } from 'vitest';
import { DOCUMENTS } from '../src/data/documents';
import { NPCS } from '../src/data/npcs';
import { QUESTS } from '../src/data/quests';
import { getEntity } from '../src/data/registry';
import { WORLD } from '../src/data/tuning';
import type { Game } from '../src/systems/components';
import { createWorldGame } from '../src/systems/game';
import { npcEntity, npcPlace, talk } from '../src/systems/npcs';
import { isDone, stageOf, UNSTARTED } from '../src/systems/quests';
import { parseSave, snapshot } from '../src/systems/save';
import { resolveCapsule } from '../src/world/colliders';
import { worldLayout } from '../src/world/placements';
import { createWorldCollision } from '../src/world/worldCollision';
import { regionAt } from '../src/world/worldMap';
import { record, run } from './worldHelpers';

const say = (g: Game, npc: string): readonly string[] => {
  const heard = record(g, 'Talked');
  talk(g, npc);
  return heard[0].lines;
};

describe('the people met in the dream', () => {
  it('each stands on open ground by their Elder Sign, and everything they talk about exists', () => {
    const w = worldLayout();
    const world = createWorldCollision();
    for (const n of NPCS) {
      const at = npcPlace(n)!;
      const sign = w.signs.find((s) => s.id === n.sign)!;
      expect(at, n.id).toBeDefined();
      expect(regionAt(at.x, at.z)?.id, n.id).toBe(sign.region);
      expect(Math.hypot(at.x - sign.rest.x, at.z - sign.rest.z), n.id).toBeGreaterThan(WORLD.reach);
      expect(Math.hypot(at.x - sign.rest.x, at.z - sign.rest.z), n.id).toBeLessThan(6);
      const p = { x: at.x, y: world.ground(at.x, at.z), z: at.z };
      resolveCapsule(world, p, 0.35, 1.8);
      expect(Math.hypot(p.x - at.x, p.z - at.z), `${n.id} stands in something`).toBeLessThan(0.01);
      for (const t of n.topics) {
        for (const c of t.when ?? []) expect(QUESTS[c.quest], `${n.id}: ${c.quest}`).toBeDefined();
        if (t.starts) expect(QUESTS[t.starts], `${n.id} starts ${t.starts}`).toBeDefined();
        for (const line of t.lines) expect(line.length, `${n.id}: ${line}`).toBeLessThan(300);
      }
    }
    for (const [id, q] of Object.entries(QUESTS)) {
      for (const { goal } of q.stages) {
        if (goal.kind === 'talk' || goal.kind === 'give') expect(NPCS.some((n) => n.id === goal.npc), `${id}: ${goal.npc}`).toBe(true);
        if (goal.kind === 'slay') expect(w.spawns.some((s) => s.unique && s.entity === goal.boss) && !!getEntity(goal.boss), `${id}: ${goal.boss}`).toBe(true);
        if (goal.kind === 'reach') expect(w.signs.some((s) => s.id === goal.sign), `${id}: ${goal.sign}`).toBe(true);
      }
      if (q.after) expect(QUESTS[q.after], `${id} after ${q.after}`).toBeDefined();
    }
  });

  it('the main line runs from Peaslee to Gilman, through the Witch House, down to Kuranes and on to the Gate', () => {
    const g = createWorldGame();
    const ow = g.overworld!;
    expect(npcEntity(g, 'peaslee')).toBeDefined();
    const changes = record(g, 'QuestChanged');
    say(g, 'gilman'); // too early: he sends the investigator to Peaslee first
    expect(stageOf(g, 'sleepers')).toBe(UNSTARTED);
    expect(say(g, 'peaslee').join(' ')).toContain('Gilman');
    expect(stageOf(g, 'sleepers')).toBe(0);
    const echoes = g.player.echoes;
    say(g, 'gilman');
    expect(isDone(g, 'sleepers')).toBe(true);
    expect(g.player.echoes).toBe(echoes + QUESTS.sleepers.reward.echoes!);
    expect(stageOf(g, 'witch_house')).toBe(0);
    ow.slain.add('boss:keziah_mason');
    run(g, 31);
    expect(isDone(g, 'witch_house')).toBe(true);
    say(g, 'gilman');
    expect(stageOf(g, 'descent')).toBe(0);
    say(g, 'kuranes');
    expect(isDone(g, 'descent')).toBe(true);
    expect(stageOf(g, 'kadath')).toBe(0);
    ow.discovered.add('beyond_threshold');
    run(g, 31);
    expect(isDone(g, 'kadath')).toBe(true);
    expect(changes.filter((c) => c.done).map((c) => c.id)).toEqual(['sleepers', 'witch_house', 'descent', 'kadath']);
  });

  it('Zadok talks for a swallow of Laudanum and gives a Silver Vial for it', () => {
    const g = createWorldGame();
    say(g, 'zadok');
    expect(stageOf(g, 'zadok')).toBe(0);
    g.player.laudanum = 0;
    expect(say(g, 'zadok')[0]).toContain('No drink');
    expect(stageOf(g, 'zadok')).toBe(0);
    g.player.laudanum = 2;
    const most = g.player.reagentMax;
    say(g, 'zadok');
    expect(isDone(g, 'zadok')).toBe(true);
    expect(g.player.laudanum).toBe(1);
    expect(g.player.reagentMax).toBe(most + 1);
  });

  it('quests and the people met are saved', () => {
    const g = createWorldGame();
    say(g, 'peaslee');
    say(g, 'wilmarth');
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    expect(stageOf(loaded, 'sleepers')).toBe(0);
    expect(stageOf(loaded, 'akeley')).toBe(0);
    expect([...loaded.overworld!.met].sort()).toEqual(['peaslee', 'wilmarth']);
  });

  it('every tome and note in the world has its text, and every text lies somewhere', () => {
    const placed = worldLayout().tomes.filter((t) => !t.vial && !t.echoes && !t.weapon).map((t) => t.name);
    for (const name of placed) expect(DOCUMENTS[name], name).toBeDefined();
    for (const name of Object.keys(DOCUMENTS)) expect(placed, name).toContain(name);
    for (const t of worldLayout().tomes.filter((x) => x.note)) expect(DOCUMENTS[t.name].kind).toBe('note');
  });
});
