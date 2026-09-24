/**
 * Registry entries as combatants: body size from the sprite's silhouette (or the assembly's
 * scale), moves compiled from the attack library, a brain from the archetype. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { brainOf, type AttackChoice } from '../data/archetypes';
import { attackRange, compileAttack } from '../data/attacks';
import type { Place } from '../data/arena';
import { REACTIONS, type MoveDef } from '../data/moves';
import type { CombatantDef } from '../data/placeholders';
import { getEntity, variantOf, type Variant } from '../data/registry';
import type { AttackId, EntityDef, Silhouette } from '../data/schema';
import type { Game } from './components';
import { spawnCombatant } from './spawn';

/** Body height and capsule radius as fractions of the sprite's scale. */
const BODY: Record<Silhouette, readonly [height: number, radius: number]> = {
  humanoid: [0.9, 0.18],
  hunched: [0.85, 0.22],
  robed: [0.9, 0.2],
  quadruped: [0.55, 0.3],
  serpent: [0.5, 0.25],
  winged: [0.7, 0.25],
  crustacean: [0.7, 0.28],
  barrel: [0.85, 0.24],
  cone: [0.95, 0.26],
  blob: [0.7, 0.36],
  orb: [0.7, 0.3],
  swarm: [0.35, 0.4],
  cephalopod: [0.95, 0.26],
  giant: [0.95, 0.2],
  toad: [0.6, 0.36],
  spectre: [0.9, 0.22],
};

/** Capsule radius of an assembly as a fraction of its height (see render/assemblies.ts). */
const ASSEMBLY_RADIUS = { lathe: 0.3, spheres: 0.38, mound: 0.5 } as const;

export const MODEL_PREFIX = 'creature:';

/** `creature:<id>` or `creature:<id>#<variant>`: what creatureViews draws. */
export const creatureModel = (id: string, variant?: Variant): string => `${MODEL_PREFIX}${id}${variant ? `#${variant}` : ''}`;

export function bodyOf(def: EntityDef): { height: number; radius: number } {
  if (def.sprite) {
    const [h, r] = BODY[def.sprite.silhouette];
    return { height: def.sprite.scale * h, radius: Math.max(0.2, def.sprite.scale * r) };
  }
  const { scale, body } = def.assembly!;
  return { height: scale, radius: scale * ASSEMBLY_RADIUS[body] }; // as wide as it looks: nothing walks inside a colossus
}

/** Every attack the entity may use: its own list plus its boss script's. */
export function attacksOf(def: EntityDef): AttackId[] {
  const ids = new Set<AttackId>(def.behavior.attacks);
  for (const ph of def.bossScript?.phases ?? []) for (const a of ph.attacks) ids.add(a.id);
  return [...ids];
}

export function toCombatant(def: EntityDef, variant?: Variant): CombatantDef {
  const { height, radius } = bodyOf(def);
  const moves: Record<string, MoveDef> = { ...REACTIONS, death: { frames: 80, hold: true } };
  for (const id of attacksOf(def)) moves[id] = compileAttack(id, def.stats, height);
  // Bosses fight with their current phase's weighted attacks (phase 1 until Phase 5 adds the rest).
  const weighted = def.bossScript && def.behavior.archetype === 'boss' ? def.bossScript.phases[0].attacks : def.behavior.attacks.map((id) => ({ id, weight: 1 }));
  const choices: AttackChoice[] = weighted.map((a) => ({ move: a.id, weight: a.weight, range: attackRange(a.id, height) }));
  return {
    name: def.name,
    model: creatureModel(def.id, variant),
    hp: def.stats.hp,
    poise: def.stats.poise,
    speed: def.stats.speed,
    radius,
    height,
    aimHeight: Math.min(6, height * 0.6),
    bounty: def.drops.echoes,
    brain: brainOf(def.behavior.archetype, def.behavior.params, choices),
    moves,
  };
}

/** Resolves a roster id (and optional variant) to the definition that should appear. */
export function resolveCreature(id: string, variant?: Variant): EntityDef | undefined {
  const def = getEntity(id);
  return def && variant ? variantOf(def, variant) : def;
}

/** Spawns a roster creature; allies join the player's side. Undefined for an unknown id or variant. */
export function spawnCreature(g: Pick<Game, 'ecs' | 'world'>, id: string, at: Place, variant?: Variant): Entity | undefined {
  const def = resolveCreature(id, variant);
  if (!def) return undefined;
  return spawnCombatant(g, toCombatant(def, variant), at, def.tier === 'ally' ? 'player' : 'enemy');
}
