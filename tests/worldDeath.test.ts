import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES } from '../src/data/moves';
import { PLAYER } from '../src/data/tuning';
import { rest, signPlace, travel } from '../src/systems/checkpoints';
import { strike } from '../src/systems/combat';
import { isAbsent } from '../src/systems/components';
import { createWorldGame } from '../src/systems/game';
import { applySave, parseSave, snapshot } from '../src/systems/save';
import { worldLayout } from '../src/world/placements';
import { creatureOf, deathblow, goTo, kill, run } from './worldHelpers';

describe('the death and Echo loop in the open world', () => {
  it('drops the Echoes where the investigator fell and brings them back to the last Elder Sign rested at', () => {
    const g = createWorldGame();
    g.overworld!.discovered.add('arkham_streets');
    travel(g, 'arkham_streets');
    rest(g, 'arkham_streets');
    run(g, 1);

    const [id, foe] = [...g.overworld!.alive].find(([k, e]) => k.startsWith('w:') && !isAbsent(g, e))!;
    kill(g, foe);
    const lair = worldLayout().spawns.find((s) => s.id === 'boss:black_man')!;
    goTo(g, lair.at.x + 6, lair.at.z);
    run(g, 1);
    kill(g, creatureOf(g, 'boss:black_man')!);

    g.player.echoes = 700;
    const fell = { ...g.ecs.c.transform.get(g.player.id)!.pos };
    strike(g, g.player.id, g.player.id, deathblow); // the foe is gone; any death will do
    run(g, PLAYER_MOVES.death.frames + 5);

    const home = signPlace('arkham_streets')!.rest;
    expect(g.ecs.c.transform.get(g.player.id)!.pos).toMatchObject({ x: home.x, z: home.z });
    expect(g.ecs.c.health.get(g.player.id)!.hp).toBe(PLAYER.hp);
    const [drop] = g.ecs.query('drop');
    expect(g.ecs.c.drop.get(drop)!.amount).toBe(700);
    expect(g.ecs.c.transform.get(drop)!.pos).toMatchObject({ x: fell.x, z: fell.z });
    expect(g.overworld!.killed.size).toBe(0);
    expect(g.overworld!.slain.has('boss:black_man')).toBe(true);

    goTo(g, fell.x + 20, fell.z); // back to where the foe fell: it has returned
    run(g, 1);
    expect(creatureOf(g, id)).toBeDefined();
    expect(creatureOf(g, 'boss:black_man')).toBeUndefined();
    goTo(g, fell.x, fell.z + 0.5);
    run(g, 1);
    expect(g.player.echoes).toBe(700);
    expect(g.ecs.query('drop')).toEqual([]);
  });

  it('a dropped Echo and the respawn point survive saving and loading', () => {
    const g = createWorldGame();
    const start = signPlace('hub_quad')!.rest;
    goTo(g, start.x + 20, start.z + 5);
    g.player.echoes = 90;
    strike(g, g.player.id, g.player.id, deathblow);
    run(g, PLAYER_MOVES.death.frames + 5);
    const loaded = createWorldGame({ save: parseSave(JSON.stringify(snapshot(g)))! });
    const [drop] = loaded.ecs.query('drop');
    expect(loaded.ecs.c.drop.get(drop)!.amount).toBe(90);
    expect(loaded.player.checkpoint).toEqual(g.player.checkpoint);
    const fresh = createWorldGame();
    applySave(fresh, snapshot(loaded));
    expect(fresh.ecs.query('drop')).toHaveLength(1);
  });
});
