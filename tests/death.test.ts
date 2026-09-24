import { describe, expect, it } from 'vitest';
import { ARENA } from '../src/data/arena';
import { PLAYER_MOVES } from '../src/data/moves';
import { DEEP_ONE } from '../src/data/placeholders';
import { PLAYER } from '../src/data/tuning';
import { strike } from '../src/systems/combat';
import type { Game, GameEvents } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
import { place, press, scriptedGame, steps } from './helpers';

const deathblow = { damage: 9999, poise: 0, guard: 0, hitstop: 2, parryable: false, interrupts: false };

function echoLog(g: Game): GameEvents['Echoes'][] {
  const log: GameEvents['Echoes'][] = [];
  g.events.on('Echoes', (e) => log.push(e));
  return log;
}

/** Kills the player through normal hit resolution and waits for the respawn. */
function dieAndRespawn(g: Game, killer: number): void {
  strike(g, killer, g.player.id, deathblow);
  steps(g, PLAYER_MOVES.death.frames + 5);
}

describe('death and Echoes', () => {
  it('pays the bounty for a kill, and the foe is gone after its death throes', () => {
    const { g, player, deepOne } = scriptedGame();
    const log = echoLog(g);
    place(g, player, 0, 1.3, Math.PI);
    place(g, deepOne, 0, 0, 0);
    g.ecs.c.health.get(deepOne)!.hp = 1;
    stepGame(g, press('light'));
    steps(g, 15);
    expect(log).toEqual([{ change: 'earned', amount: DEEP_ONE.bounty, total: DEEP_ONE.bounty }]);
    expect(g.ecs.c.actor.get(deepOne)!.move).toBe('death');
    steps(g, DEEP_ONE.moves.death.frames);
    expect(g.ecs.c.dead.has(deepOne)).toBe(true);
  });

  it('drops the Echoes where the player fell, respawns at the Elder Sign and resets the foes', () => {
    const { g, player, deepOne } = scriptedGame();
    const log = echoLog(g);
    let respawned = 0;
    g.events.on('Respawned', () => respawned++);
    g.player.echoes = 300;
    place(g, player, 5, 6, 0);
    place(g, deepOne, 5, 7.3, Math.PI);
    g.ecs.c.health.get(deepOne)!.hp = 40;
    g.ecs.c.stamina.get(player)!.value = 3;

    strike(g, deepOne, player, deathblow);
    expect(g.ecs.c.actor.get(player)!.move).toBe('death');
    const [drop] = g.ecs.query('drop');
    expect(g.ecs.c.drop.get(drop)!.amount).toBe(300);
    expect(g.ecs.c.transform.get(drop)!.pos).toMatchObject({ x: 5, z: 6 });
    expect(g.player.echoes).toBe(0);
    expect(log).toEqual([{ change: 'dropped', amount: 300, total: 0 }]);

    steps(g, PLAYER_MOVES.death.frames - 10);
    expect(respawned).toBe(0);
    steps(g, 15);
    expect(respawned).toBe(1);
    const tr = g.ecs.c.transform.get(player)!;
    expect(tr.pos).toMatchObject({ x: ARENA.spawn.x, z: ARENA.spawn.z });
    expect(tr.yaw).toBe(ARENA.spawn.yaw);
    expect(g.ecs.c.health.get(player)!.hp).toBe(PLAYER.hp);
    expect(g.ecs.c.stamina.get(player)!.value).toBe(PLAYER.stamina);
    expect(g.ecs.c.actor.get(player)!.move).toBeNull();
    expect(g.ecs.c.transform.get(deepOne)!.pos).toMatchObject({ x: ARENA.deepOne.x, z: ARENA.deepOne.z });
    expect(g.ecs.c.health.get(deepOne)!.hp).toBe(DEEP_ONE.hp);
  });

  it('brings slain non-boss foes back on respawn', () => {
    const { g, player, deepOne } = scriptedGame();
    strike(g, player, deepOne, deathblow);
    steps(g, DEEP_ONE.moves.death.frames + 5);
    expect(g.ecs.c.dead.has(deepOne)).toBe(true);
    dieAndRespawn(g, deepOne);
    expect(g.ecs.c.dead.has(deepOne)).toBe(false);
    expect(g.ecs.c.actor.get(deepOne)!.move).toBeNull();
  });

  it('recovers the drop by touch, and a second death loses an unrecovered drop', () => {
    const { g, player, deepOne } = scriptedGame();
    g.player.echoes = 300;
    place(g, player, 5, 6, 0);
    dieAndRespawn(g, deepOne);
    const log = echoLog(g);
    place(g, player, 5, 6 + PLAYER.pickupRadius + 0.3, 0);
    steps(g, 2);
    expect(g.player.echoes).toBe(0);
    place(g, player, 5, 6 + PLAYER.pickupRadius - 0.3, 0);
    steps(g, 1);
    expect(g.player.echoes).toBe(300);
    expect(g.ecs.query('drop')).toEqual([]);
    expect(log).toEqual([{ change: 'recovered', amount: 300, total: 300 }]);

    place(g, player, -5, 0, 0);
    dieAndRespawn(g, deepOne); // drop of 300 at (-5, 0)
    g.player.echoes = 40;
    place(g, player, 8, -2, 0);
    dieAndRespawn(g, deepOne); // the first drop is lost; a drop of 40 at (8, -2)
    const drops = g.ecs.query('drop');
    expect(drops.map((d) => g.ecs.c.drop.get(d)!.amount)).toEqual([40]);
    expect(log.map((e) => e.change)).toEqual(['recovered', 'dropped', 'lost', 'dropped']);
  });
});
