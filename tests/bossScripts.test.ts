import { describe, expect, it } from 'vitest';
import { ENTITIES, getEntity, variantOf, type Variant } from '../src/data/registry';
import { ARENA_CHANGES, REALITY_HOOKS, type EntityDef } from '../src/data/schema';
import { ARENA_CHANGE_IDS } from '../src/systems/arenaChanges';
import { toCombatant } from '../src/systems/creatures';
import { HOOKS } from '../src/systems/reality';
import { SIGNATURES } from '../src/systems/signatures';
import { bossGame, engage } from './bossHelpers';
import { steps } from './helpers';

/** Every roster entry, eldritch variant and boss variant that fights by a boss script. */
const SCRIPTED: [string, Variant | undefined, EntityDef][] = ENTITIES.flatMap((d) =>
  [[d.id, undefined, d] as const, ...(['eldritch', 'boss'] as const).map((v) => [d.id, v, variantOf(d, v)] as const)]
    .filter((x): x is [string, Variant | undefined, EntityDef] => !!x[2]?.bossScript),
);

describe('boss scripts (spec §3E)', () => {
  it('covers every region boss', () => {
    for (const id of ['colour_out_of_space', 'dunwich_horror', 'haunter_of_the_dark', 'whisperer']) expect(SCRIPTED.map(([x]) => x)).toContain(id);
    expect(SCRIPTED.some(([x, v]) => x === 'shoggoth' && v === 'boss')).toBe(true);
    expect(SCRIPTED.some(([x, v]) => x === 'flying_polyp' && v === 'boss')).toBe(true);
  });

  it('every reality hook and arena change has an implementation, and every signature a scripted boss', () => {
    expect(Object.keys(HOOKS).sort()).toEqual([...REALITY_HOOKS].sort());
    expect([...ARENA_CHANGE_IDS].sort()).toEqual([...ARENA_CHANGES].sort());
    for (const id of Object.keys(SIGNATURES)) expect(getEntity(id)?.bossScript ?? getEntity(id)?.bossVariant?.bossScript, id).toBeDefined();
  });

  it.each(SCRIPTED)('%s %s: its phases, attacks, summons, hooks and arena changes resolve', (_, v, def) => {
    const moves = toCombatant(def, v).moves;
    def.bossScript!.phases.forEach((phase, i) => {
      for (const { id } of phase.attacks) {
        const m = moves[id];
        expect(m, `phase ${i}: ${id}`).toBeDefined();
        expect(m.hit ?? m.volley ?? m.shot ?? m.pool ?? m.effect ?? m.sanity, `phase ${i}: ${id} does something`).toBeDefined();
      }
      for (const s of phase.summons ?? []) expect(getEntity(s), `phase ${i}: summon ${s}`).toBeDefined();
      for (const h of phase.realityHooks ?? []) expect(HOOKS[h], `phase ${i}: ${h}`).toBeDefined();
      if (phase.arenaChange) expect(ARENA_CHANGE_IDS, `phase ${i}`).toContain(phase.arenaChange);
    });
  });

  it.each(SCRIPTED)('%s %s: fights through every phase in turn', (id, v, def) => {
    const b = bossGame(id, v);
    const { g, boss, fight } = b;
    engage(b);
    expect(fight.engaged).toBe(true);
    const h = g.ecs.c.health.get(boss)!;
    const brain = g.ecs.c.brain.get(boss)!;
    def.bossScript!.phases.forEach((phase, i) => {
      if (i > 0) h.hp = h.max * phase.hpBelow - 1;
      steps(g, 2);
      expect(fight.phase, `phase ${i}`).toBe(i);
      const choices = new Set(brain.def.attacks.map((a) => a.move));
      for (const a of phase.attacks) expect(choices.has(a.id), `phase ${i} attacks with ${a.id}`).toBe(true);
      for (const hook of phase.realityHooks ?? []) expect(g.reality.hooks.has(hook), `phase ${i} holds ${hook}`).toBe(true);
      if (phase.arenaChange) expect(fight.changes.has(phase.arenaChange), `phase ${i} changes the arena`).toBe(true);
    });
    steps(g, 300); // the last phase plays out: attacks, effects, hooks
    expect(Number.isFinite(h.hp)).toBe(true);
  });
});
