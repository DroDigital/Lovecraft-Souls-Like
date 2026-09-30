/** The revolver's tests share a range: a Deep One that cannot be killed, at a distance, and a record of what the revolver does to it. */

import { emptyInput } from '../src/core/input';
import { PLAYER_MOVES } from '../src/data/moves';
import { GUN, PLAYER } from '../src/data/tuning';
import { startMove } from '../src/systems/actions';
import type { GameEvents } from '../src/systems/components';
import { stepGame } from '../src/systems/game';
import { place, press, scriptedGame, steps } from './helpers';

export const SHOT = PLAYER_MOVES.shoot.shot;

/** A game with the investigator `d` metres from a Deep One that cannot be killed, and a record of what the revolver does to it. */
export function range(d: number) {
  const { g, player, deepOne } = scriptedGame();
  place(g, player, 0, d, Math.PI);
  place(g, deepOne, 0, 0, 0);
  g.lock.target = deepOne;
  g.ecs.c.health.get(deepOne)!.hp = g.ecs.c.health.get(deepOne)!.max = 1e6;
  const hits: GameEvents['Hit'][] = [];
  g.events.on('Hit', (e) => e.attacker === player && hits.push(e));
  const shots: GameEvents['Shot'][] = [];
  g.events.on('Shot', (e) => shots.push(e));
  /** Fires `n` shots, each with a full cylinder and a full bar, so neither ammunition nor breath limits them. */
  const fire = (n: number): void => {
    for (let i = 0; i < n; i++) {
      g.player.ammo = GUN.chamber;
      g.ecs.c.stamina.get(player)!.value = PLAYER.stamina;
      steps(g, 1, press('shoot'));
      steps(g, PLAYER_MOVES.shoot.frames);
    }
  };
  /** `n` shots in as many steps: each begins on the step before its shot frame, for a count of hits over many. */
  const volley = (n: number): void => {
    const a = g.ecs.c.actor.get(player)!;
    for (let i = 0; i < n; i++) {
      g.player.ammo = GUN.chamber;
      startMove(a, 'shoot');
      a.frame = SHOT.frame - 1;
      a.hitstop = 0;
      stepGame(g, emptyInput());
    }
  };
  return { g, player, deepOne, hits, shots, fire, volley };
}
