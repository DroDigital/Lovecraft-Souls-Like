import { describe, expect, it } from 'vitest';
import { PLAYER_MOVES, type HitDef, type MoveSet } from '../src/data/moves';
import { ENTITIES } from '../src/data/registry';
import { WEAPONS } from '../src/data/weapons';
import { aimAt, capsuleGap2, hitCentre } from '../src/systems/combat';
import { spawnCreature } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { conjure } from '../src/systems/hallucinations';
import { place, press, scriptedGame, steps } from './helpers';

describe('playtest round 7: combat', () => {
  it('every blow reaches every creature in front of the investigator, however short (the Zoogs, Brown Jenkin)', () => {
    const g = createGame();
    const blows: HitDef[] = [PLAYER_MOVES.light1.hit!, ...[WEAPONS.razor, WEAPONS.axe].flatMap((w) => Object.values(w.moves as MoveSet).map((m) => m.hit!))];
    for (const d of ENTITIES.filter((e) => e.tier !== 'ally')) {
      const e = spawnCreature(g, d.id, { x: 0, z: 1.1, yaw: Math.PI });
      if (e === undefined) continue;
      const feet = { x: 0, y: 0, z: 0 };
      for (const hit of blows) {
        const reach = Math.min(...[0, 0.25, 0.5, 0.75].map((p) => {
          const [s0, s1] = [hitCentre(feet, 0, hit, p), hitCentre(feet, 0, hit, p + 0.25)];
          const { gap2, radius } = capsuleGap2(g, e, aimAt(g, e, 0, s0), aimAt(g, e, 0, s1));
          return Math.sqrt(gap2) - radius - hit.radius;
        }));
        expect(reach, `${d.id}`).toBeLessThanOrEqual(0);
      }
      g.ecs.despawn(e);
    }
  });

  it('a blow never drops below the knee, nor rises to meet a tall body', () => {
    const g = createGame();
    const zoog = spawnCreature(g, 'zoog', { x: 0, z: 1, yaw: 0 })!;
    const s = { x: 0, y: 1.2, z: 1 };
    expect(aimAt(g, zoog, 0, s).y).toBeLessThan(1.2);
    expect(aimAt(g, zoog, 0, s).y).toBeGreaterThanOrEqual(0.25);
    const tall = spawnCreature(g, 'deep_one', { x: 0, z: 1, yaw: 0 })!;
    expect(aimAt(g, tall, 0, s)).toEqual(s);
  });

  it('the guard holds backing away from a blow, without a lock (it faces where the investigator looks)', () => {
    const { g, player, deepOne } = scriptedGame();
    place(g, player, 0, 0, 0);
    place(g, deepOne, 0, 1.6, Math.PI);
    g.camera.yaw = 0; // looking at the Deep One
    const back = press('block');
    back.moveY = -1; // backing away
    steps(g, 20, back);
    const me = g.ecs.c.transform.get(player)!.pos;
    expect(me.z).toBeLessThan(-0.3); // backing away, still facing the Deep One
    place(g, deepOne, me.x, me.z + 1.1, Math.PI);
    const a = g.ecs.c.actor.get(deepOne)!;
    const attack = Object.keys(a.moves).find((m) => a.moves[m].hit && !a.moves[m].hit!.unblockable)!;
    Object.assign(a, { move: attack, frame: 0 });
    a.hits.clear();
    const outcomes: string[] = [];
    g.events.on('Hit', (e) => e.target === player && outcomes.push(e.outcome));
    steps(g, a.moves[attack].frames, back);
    expect(outcomes.length).toBeGreaterThan(0);
    expect(outcomes.every((o) => o === 'blocked')).toBe(true);
  });

  it('a hallucination struck says so as it goes', () => {
    const g = createGame();
    g.mind.band = 'unmoored';
    const e = conjure(g)!;
    expect(g.ecs.c.phantom.has(e)).toBe(true);
    const gone: { struck: boolean }[] = [];
    g.events.on('Vanished', (v) => gone.push(v));
    g.events.emit('Hit', { attacker: g.player.id, target: e, outcome: 'hit', damage: 10 });
    expect(gone).toEqual([expect.objectContaining({ struck: true })]);
    expect(g.ecs.c.transform.has(e)).toBe(false);
  });
});
