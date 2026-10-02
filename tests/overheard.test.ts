/**
 * What the people say to themselves (round 34): near one of them, in their sight, a line is overheard, one at a time and
 * each once between rests; never in a talk or a fight, never with a foe hunting close by, and never in a wall of text.
 */
import { describe, expect, it } from 'vitest';
import { NPCS } from '../src/data/npcs';
import { OVERHEARD } from '../src/data/overheard';
import { HEARD } from '../src/data/tuning';
import { teleport } from '../src/systems/checkpoints';
import { spawnCreature } from '../src/systems/creatures';
import { npcPlace } from '../src/systems/npcs';
import { createWorldGame, stepGame } from '../src/systems/game';
import type { Game } from '../src/systems/components';
import { emptyInput } from '../src/core/input';

/** A world game with the investigator `gap` metres from where `npc` stands (on the side the rest point is, so nothing lies between), their lines waiting. */
function near(npc: string, gap = 4, calm = true): { g: Game; heard: { name: string; text: string }[] } {
  const g = createWorldGame();
  g.ecs.c.health.get(g.player.id)!.immortal = calm; // the foes of the place would come for one who stood idle for minutes, and kill them
  if (calm) for (const id of [...g.ecs.c.brain.keys()]) g.ecs.c.brain.delete(id);
  const at = npcPlace(NPCS.find((n) => n.id === npc)!)!;
  const [x, z] = [at.x + Math.sin(at.yaw) * gap, at.z + Math.cos(at.yaw) * gap]; // the way they face: toward their sign's rising point
  teleport(g, { x, z, yaw: at.yaw + Math.PI });
  const heard: { name: string; text: string }[] = [];
  g.events.on('Overheard', (e) => heard.push(e));
  return { g, heard };
}

/** Steps on; with `calm`, whatever the world streams in to hunt them is called off at each turn. */
const run = (g: Game, frames: number, calm = true): void => {
  for (let i = 0; i < frames; i++) {
    if (calm && i % 60 === 0) for (const id of [...g.ecs.c.brain.keys()]) g.ecs.c.brain.delete(id);
    stepGame(g, emptyInput());
  }
};

describe('overheard', () => {
  it('has lines for every person met, a few each, short and not repeated', () => {
    const seen = new Set<string>();
    for (const n of NPCS) {
      const lines = OVERHEARD[n.id];
      expect(lines, n.id).toBeDefined();
      expect(lines.length, n.id).toBeGreaterThanOrEqual(3);
      for (const l of lines) {
        expect(l.length, l).toBeLessThanOrEqual(110);
        expect(l, l).toMatch(/[.!?]$/);
        expect(l).not.toMatch(/[{}]/);
        expect(seen.has(l), `${l} said twice`).toBe(false);
        seen.add(l);
      }
    }
    expect(Object.keys(OVERHEARD).sort()).toEqual(NPCS.map((n) => n.id).sort()); // and none for someone who is not there
  });

  it('is heard from someone near, in sight, once, and then not again for a while', () => {
    const { g, heard } = near('gilman');
    run(g, HEARD.look * 2);
    expect(heard).toHaveLength(1);
    expect(heard[0].name).toBe('Walter Gilman');
    expect(OVERHEARD.gilman).toContain(heard[0].text);
    run(g, HEARD.every - HEARD.look * 3);
    expect(heard).toHaveLength(1); // not a wall of text
    run(g, HEARD.look * 6);
    expect(heard).toHaveLength(2);
    expect(heard[1].text).not.toBe(heard[0].text); // each once
  }, 30000);

  it('runs out of lines between rests, and has them again after one (or a death)', () => {
    const every = HEARD.every;
    HEARD.every = 120; // (the minutes between lines would be minutes of the whole world stepped)
    try {
      const { g, heard } = near('zadok');
      run(g, HEARD.every * 3 + HEARD.look * 6);
      expect(heard.map((h) => h.text).sort()).toEqual([...OVERHEARD.zadok].sort());
      run(g, HEARD.every * 2);
      expect(heard).toHaveLength(3); // all said
      g.events.emit('Rested', { sign: 'x', name: 'x' });
      run(g, HEARD.look * 2);
      expect(heard).toHaveLength(4);
    } finally {
      HEARD.every = every;
    }
  }, 30000);

  it('is not heard from too far off, nor in a talk, nor in a fight', () => {
    const far = near('gilman', HEARD.range + 5);
    run(far.g, HEARD.every);
    expect(far.heard).toEqual([]);
    const talking = near('gilman');
    talking.g.player.listening = 1;
    run(talking.g, HEARD.every);
    expect(talking.heard).toEqual([]);
    talking.g.player.listening = null;
    run(talking.g, HEARD.look * 2);
    expect(talking.heard).toHaveLength(1); // and once the talk is over, they are
    const fighting = near('gilman', 4, false);
    const me = fighting.g.ecs.c.transform.get(fighting.g.player.id)!.pos;
    const foe = spawnCreature(fighting.g, 'deep_one', { x: me.x + 3, z: me.z, yaw: 0 })!;
    Object.assign(fighting.g.ecs.c.brain.get(foe)!, { state: 'engage', target: fighting.g.player.id });
    run(fighting.g, 2, false);
    expect(fighting.heard).toEqual([]); // with something hunting them close by
  }, 30000);

  it('is not heard through a wall, and not by the dead', () => {
    const walled = near('gilman');
    const [me, who] = [walled.g.ecs.c.transform.get(walled.g.player.id)!.pos, [...walled.g.ecs.c.npc].find(([, id]) => id === 'gilman')![0]];
    const at = walled.g.ecs.c.transform.get(who)!.pos;
    const wall = { kind: 'cylinder' as const, x: (me.x + at.x) / 2, z: (me.z + at.z) / 2, radius: 1.2, y0: me.y - 1, y1: me.y + 6 };
    walled.g.world.colliders.push(wall);
    run(walled.g, HEARD.look * 2);
    expect(walled.heard).toEqual([]);
    walled.g.world.colliders.pop();
    run(walled.g, HEARD.look * 2);
    expect(walled.heard).toHaveLength(1);
    const dead = near('curtis', 4, false);
    dead.g.ecs.c.health.get(dead.g.player.id)!.hp = 0;
    run(dead.g, HEARD.look * 2);
    expect(dead.heard).toEqual([]);
  });
});
