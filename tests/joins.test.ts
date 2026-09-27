import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { spawnCreature } from '../src/systems/creatures';
import { createWorldGame, stepGame } from '../src/systems/game';

describe('a boss that joins another (playtest round 17)', () => {
  it('Brown Jenkin waits in the walls, unseen, until Keziah is half spent, then comes out and says so', () => {
    const g = createWorldGame();
    const p = g.ecs.c.transform.get(g.player.id)!.pos;
    const keziah = spawnCreature(g, 'keziah_mason', { x: p.x + 8, z: p.z, yaw: 0 })!;
    const jenkin = spawnCreature(g, 'brown_jenkin', { x: p.x + 3, z: p.z, yaw: 0 })!;
    const notices: string[] = [];
    g.events.on('Notice', (e) => void notices.push(e.text));
    for (let i = 0; i < 30; i++) stepGame(g, emptyInput());
    expect(g.ecs.c.brain.get(jenkin)!.state).toBe('hidden'); // three metres off, and still in the walls
    const h = g.ecs.c.health.get(keziah)!;
    h.hp = h.max * 0.45;
    for (let i = 0; i < 5; i++) stepGame(g, emptyInput());
    expect(g.ecs.c.brain.get(jenkin)!.state).toBe('engage');
    expect(notices).toContain('BROWN JENKIN JOINS THE FIGHT');
  });
});
