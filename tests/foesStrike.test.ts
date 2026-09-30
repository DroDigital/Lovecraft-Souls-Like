import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/core/ecs';
import { ENTITIES } from '../src/data/registry';
import type { Game } from '../src/systems/components';
import { creatureModel } from '../src/systems/creatures';
import { createGame } from '../src/systems/game';
import { place, steps } from './helpers';

/**
 * Those that land no blow on one who stands before them, by design: the harmless, the unseen by the
 * sane, and those that work on the mind from where they are (their roars and gazes take sanity).
 */
const MIND_ONLY = new Set(['albino_penguin', 'being_from_beyond', 'moon_bog_wraith', 'voice_in_the_tomb', 'azathoth', 'ancient_ones']);

const foeIn = (g: Game, id: string): Entity => [...g.ecs.c.model].find(([, m]) => m === creatureModel(id))![0];

describe('every foe strikes (round 19: skirmishers held a ring their own blows could not reach, and a colossus swung over one who stood close)', () => {
  const foes = ENTITIES.filter((d) => d.tier !== 'ally' && !MIND_ONLY.has(d.id)).map((d) => [d.id] as const);

  it.each(foes)('%s lands a blow on an investigator standing three metres before it', (id) => {
    const g = createGame({ creature: id });
    const foe = foeIn(g, id);
    const at = g.ecs.c.transform.get(foe)!.pos;
    place(g, g.player.id, at.x, at.z - 3, 0);
    const h = g.ecs.c.health.get(g.player.id)!;
    h.max = h.hp = 1e7;
    let hits = 0;
    g.events.on('Hit', (e) => void (e.target === g.player.id && e.attacker === foe && hits++));
    for (let s = 0; s < 20 && !hits; s++) steps(g, 60);
    expect(hits).toBeGreaterThan(0);
  });

  it.each(foes)('%s lands a blow on an investigator standing at the edge of its body (round 24: the Whisperer, who cannot move, had no blow that reached one who stood at its chair)', (id) => {
    const g = createGame({ creature: id });
    const foe = foeIn(g, id);
    const at = g.ecs.c.transform.get(foe)!.pos;
    place(g, g.player.id, at.x, at.z - (g.ecs.c.body.get(foe)!.radius + 1.2), 0);
    const h = g.ecs.c.health.get(g.player.id)!;
    h.max = h.hp = 1e7;
    let hits = 0;
    g.events.on('Hit', (e) => void (e.target === g.player.id && e.attacker === foe && hits++));
    for (let s = 0; s < 20 && !hits; s++) steps(g, 60);
    expect(hits).toBeGreaterThan(0);
  });

  it('the Light-Being from Algol, and every ally, never turns on the investigator: it falls in beside them, once said', () => {
    for (const id of ENTITIES.filter((d) => d.tier === 'ally').map((d) => d.id)) {
      const g = createGame({ creature: id });
      for (const [e, c] of [...g.ecs.c.combatant]) if (c.faction === 'enemy') g.ecs.despawn(e);
      const said: string[] = [];
      g.events.on('Notice', (e) => void said.push(e.text));
      let struck = 0;
      g.events.on('Hit', (e) => void (e.target === g.player.id && struck++));
      steps(g, 600);
      expect(struck, id).toBe(0);
      expect(g.ecs.c.brain.get(foeIn(g, id))!.state, id).toBe('follow');
      expect(said.filter((t) => t.endsWith('· AT YOUR SIDE')), id).toHaveLength(1);
    }
  });
});
