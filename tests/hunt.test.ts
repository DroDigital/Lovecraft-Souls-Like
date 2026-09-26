import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { distXZ } from '../src/core/geom';
import { AI, SIM } from '../src/data/tuning';
import type { Game } from '../src/systems/components';
import { creatureModel, spawnCreature } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { hears, sight } from '../src/systems/perception';
import { place, press, steps } from './helpers';

const find = (g: Game, model: string): Entity => [...g.ecs.c.model].find(([, m]) => m === model)![0];

/** The arena with a ghoul (a pack hunter) at (4, −9) facing +z, and the investigator unkillable. */
function arena(): { g: Game; foe: Entity; player: Entity } {
  const g = createGame({ creature: 'ghoul' });
  g.ecs.c.health.get(g.player.id)!.immortal = true;
  return { g, foe: find(g, creatureModel('ghoul')), player: g.player.id };
}
const brain = (g: Game, id: Entity) => g.ecs.c.brain.get(id)!;
const pos = (g: Game, id: Entity) => g.ecs.c.transform.get(id)!.pos;
const hunting = (g: Game, id: Entity): boolean => brain(g, id).state === 'engage' && brain(g, id).target === g.player.id;

describe('playtest round 8: how creatures sense the investigator', () => {
  it('sees farther than it did (16 m, all or nothing): a far glimpse stirs it, and a moment later it is sure', () => {
    const { g, foe, player } = arena();
    place(g, player, 4, 11, Math.PI); // 20 m ahead of it, in its sight cone
    steps(g, 1);
    expect(brain(g, foe).state).toBe('alert');
    steps(g, Math.round(2 * SIM.hz));
    expect(hunting(g, foe)).toBe(true);
  });

  it('knows at once what is plainly before it, glimpses what is beside it only up close, and nothing behind', () => {
    const { g, foe, player } = arena();
    const p = brain(g, foe).def.params;
    place(g, player, 4, 1, Math.PI); // 10 m ahead
    expect(sight(g, foe, player, p)).toBe(1);
    place(g, player, 9, -9, 0); // 5 m to its side: a glimpse
    expect(sight(g, foe, player, p)).toBeGreaterThan(0);
    expect(sight(g, foe, player, p)).toBeLessThan(1);
    place(g, player, 13, -9, 0); // 9 m to its side
    expect(sight(g, foe, player, p)).toBe(0);
    place(g, player, 4, -19, 0); // 10 m behind
    expect(sight(g, foe, player, p)).toBe(0);
  });

  it('hears running farther than footsteps, and less through a wall', () => {
    const { g, foe, player } = arena();
    place(g, foe, 8.5, -1, 0); // a tall pillar at (8.5, 2) stands between it and anything straight behind (+z) it
    const at = (x: number, z: number) => ({ x, y: 0, z });
    expect(hears(g, foe, at(8.5, -10), AI.noise.sprint)).toBe(true); // 9 m, in the open
    expect(hears(g, foe, at(8.5, -10), AI.noise.walk)).toBe(false);
    expect(hears(g, foe, at(8.5, 8.5), AI.noise.sprint)).toBe(false); // 9.5 m, behind the pillar: half as far
    expect(hears(g, foe, at(8.5, 5), AI.noise.sprint)).toBe(true); // 6 m behind it
    void player;
  });

  it('hears the investigator running behind it, turns, and comes to look', () => {
    const { g, foe, player } = arena();
    place(g, player, 4, -18, 0); // 9 m behind it
    const run = press('dodge');
    run.moveX = 1;
    steps(g, 1, run);
    steps(g, 39, { ...run, pressed: { ...run.pressed, dodge: false } }); // held: a sprint across behind it
    expect(['alert', 'engage']).toContain(brain(g, foe).state);
    steps(g, 90);
    expect(hunting(g, foe)).toBe(true); // it turned, and saw them
  });

  it('struck from afar, it turns on its attacker at once and rouses its kind: the near at once, the farther to look', () => {
    const { g, foe, player } = arena();
    place(g, player, 4, -21, 0); // 12 m behind it
    const near = spawnCreature(g, 'ghoul', { x: 6, z: -9, yaw: 0 })!;
    const far = spawnCreature(g, 'ghoul', { x: 4, z: 3, yaw: 0 })!; // 12 m on
    g.events.emit('Hit', { attacker: player, target: foe, outcome: 'hit', damage: 5 });
    expect(hunting(g, foe)).toBe(true);
    expect(hunting(g, near)).toBe(true);
    expect(brain(g, far).state).toBe('alert');
  });

  it('losing its quarry, it looks where it last knew it, then goes home', () => {
    const { g, foe, player } = arena();
    place(g, foe, 4, -9, Math.PI / 2); // facing +x, toward a tall pillar at (12, −9)
    place(g, player, 15.5, -9, 0); // hidden behind the pillar, standing still
    Object.assign(brain(g, foe), { state: 'engage', target: player, aware: 1, last: { x: 10, z: -9 } });
    steps(g, Math.round((AI.lose + 0.2) * SIM.hz));
    expect(brain(g, foe).state).toBe('search');
    steps(g, 90);
    expect(distXZ(pos(g, foe), { x: 10, z: -9 })).toBeLessThan(2); // it went to look
    let looked = 90;
    while (brain(g, foe).state === 'search' && looked < 2000) [looked] = [looked + 1, steps(g, 1)];
    expect(looked / SIM.hz).toBeCloseTo(AI.search, 0); // it looked about there a while...
    expect(brain(g, foe).state).toBe('return'); // ...and then gave up
    steps(g, 600);
    expect(brain(g, foe).state).toBe('idle');
    expect(distXZ(pos(g, foe), { x: 4, z: -9 })).toBeLessThan(0.5);
  });
});

describe('playtest round 8: how creatures fight', () => {
  it('only a few close in at once; the rest keep off, circling, waiting their turn', () => {
    const { g, foe, player } = arena();
    place(g, player, 0, 5, 0);
    const foes = [foe, ...[[-6, 0], [6, 0], [-6, 10], [6, 10]].map(([x, z]) => spawnCreature(g, 'ghoul', { x, z, yaw: 0 })!)];
    for (const f of foes) Object.assign(brain(g, f), { state: 'engage', target: player, aware: 1 });
    steps(g, 150);
    const gaps = foes.map((f) => distXZ(pos(g, f), pos(g, player)));
    const tokens = foes.filter((f) => brain(g, f).token);
    expect(tokens.length).toBeLessThanOrEqual(AI.tokens);
    for (const [i, f] of foes.entries()) if (!brain(g, f).token && g.ecs.c.actor.get(f)!.move === null) expect(gaps[i], `ghoul ${i}`).toBeGreaterThan(3);
    expect(gaps.filter((d) => d < 3).length).toBeLessThanOrEqual(AI.tokens);
  });

  it('strikes into an opening: the investigator drinking, before its cooldown is quite spent', () => {
    for (const drink of [false, true]) {
      const { g, foe, player } = arena();
      place(g, player, 4, -7.6, Math.PI);
      const br = brain(g, foe);
      Object.assign(br, { state: 'engage', target: player, aware: 1, token: true, cooldown: Math.round(br.def.params.cooldown[1] * 0.4) });
      steps(g, 1, drink ? press('item') : undefined);
      steps(g, 2);
      expect(g.ecs.c.actor.get(foe)!.move !== null, drink ? 'drinking' : 'standing guard').toBe(drink);
    }
  });

  it('hunters keep a little room between them', () => {
    const { g, foe, player } = arena();
    place(g, player, 4, 8, Math.PI);
    const other = spawnCreature(g, 'ghoul', { x: 4.2, z: -9, yaw: 0 })!;
    for (const f of [foe, other]) Object.assign(brain(g, f), { state: 'engage', target: player, aware: 1, cooldown: 1e6 });
    steps(g, 40);
    const r = g.ecs.c.body.get(foe)!.radius + g.ecs.c.body.get(other)!.radius;
    expect(distXZ(pos(g, foe), pos(g, other))).toBeGreaterThan(r + AI.space * 0.5);
  });
});
