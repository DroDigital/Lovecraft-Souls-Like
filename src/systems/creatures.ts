/**
 * Registry entries as combatants: body size from the sprite's silhouette (or the assembly's
 * scale), moves compiled from the attack library, a brain from the archetype, and the creature's
 * hold on the mind (Dread). Spawned creatures carry their VariantSwap and HiddenLayer data, and
 * `morph` rebuilds a living one as another variant. Pure: no Three.js.
 */

import type { Entity } from '../core/ecs';
import { compileAttack } from '../data/attacks';
import type { Place } from '../data/arena';
import { REACTIONS, type MoveDef } from '../data/moves';
import { BOSS } from '../data/tuning';
import type { CombatantDef } from '../data/placeholders';
import { getEntity, variantOf, type Variant } from '../data/registry';
import type { AttackId, EntityDef, Silhouette } from '../data/schema';
import type { Dread, Game } from './components';
import { phaseBrain } from './fightPhase';
import { newFight } from './fightTypes';
import { addLayer } from './hiddenLayer';
import { atOrBelow } from './sanity';
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
    brain: phaseBrain(def, 0, height), // a boss starts in its script's first phase (bossFight.ts moves it on)
    moves,
  };
}

/** The roster id and variant a creature is drawn and fought as (its model names them). */
export function creatureOf(g: Game, e: Entity): { id: string; variant?: Variant } | undefined {
  const model = g.ecs.c.model.get(e);
  if (!model?.startsWith(MODEL_PREFIX)) return undefined;
  const [id, variant] = model.slice(MODEL_PREFIX.length).split('#') as [string, Variant | undefined];
  return { id, variant };
}

export function defOf(g: Game, e: Entity): EntityDef | undefined {
  const k = creatureOf(g, e);
  return k && resolveCreature(k.id, k.variant);
}

/** Resolves a roster id (and optional variant) to the definition that should appear. */
export function resolveCreature(id: string, variant?: Variant): EntityDef | undefined {
  const def = getEntity(id);
  return def && variant ? variantOf(def, variant) : def;
}

export const dreadOf = (def: EntityDef): Dread => ({
  id: def.id,
  tier: def.tier,
  aura: def.stats.sanityAura,
  blow: def.stats.sanityDamage,
  insight: def.insightOnSight,
  glow: (def.sprite?.glow ?? def.assembly?.glow) !== undefined,
});

/**
 * Spawns a roster creature; allies join the player's side. Undefined for an unknown id or variant.
 * Without a requested variant, one with an eldritch variant swaps with the sanity band (and starts
 * swapped if the mind is already Fractured or lower); a `hidden` entry goes on its hidden layer; one
 * with a boss script holds a fight over the arena around where it stands (bossFight.ts).
 */
export function spawnCreature(g: Game, id: string, at: Place, variant?: Variant): Entity | undefined {
  const swaps = variant === undefined && getEntity(id)?.eldritchVariant !== undefined;
  const v = swaps && atOrBelow(g.mind, 'fractured') ? 'eldritch' : variant;
  const def = resolveCreature(id, v);
  if (!def) return undefined;
  const e = spawnCombatant(g, toCombatant(def, v), at, def.tier === 'ally' ? 'player' : 'enemy');
  g.ecs.c.dread.set(e, dreadOf(def));
  if (swaps) g.ecs.c.swap.set(e, { id, eldritch: v === 'eldritch' });
  if (def.hidden) addLayer(g, e, def.hidden);
  if (def.bossScript) g.ecs.c.fight.set(e, newFight(id, def.bossScript, { x: at.x, z: at.z, radius: BOSS.arena }));
  if (def.bossScript?.unseen) g.ecs.c.unseen.set(e, { revealed: 0 });
  return e;
}

/** Rebuilds a living creature as its roster entry in `variant` (undefined: the base form): look, name, body, moves, brain, dread. Health and poise keep their fractions. */
export function morph(g: Game, e: Entity, id: string, variant: Variant | undefined): void {
  const def = resolveCreature(id, variant);
  if (!def) return;
  const cd = toCombatant(def, variant);
  const c = g.ecs.c;
  c.model.set(e, cd.model);
  Object.assign(c.combatant.get(e)!, { name: cd.name, bounty: c.phantom.has(e) ? 0 : cd.bounty });
  Object.assign(c.body.get(e)!, { radius: cd.radius, height: cd.height, aimHeight: cd.aimHeight });
  const h = c.health.get(e)!;
  [h.hp, h.max] = [(h.hp / h.max) * cd.hp, cd.hp];
  const po = c.poise.get(e)!;
  [po.value, po.max] = [(po.value / po.max) * cd.poise, cd.poise];
  c.actor.get(e)!.moves = cd.moves; // a move the new form lacks simply ends
  const br = c.brain.get(e);
  const fight = c.fight.get(e);
  if (fight && def.bossScript) fight.script = def.bossScript; // bossFight.ts rebuilds its brain for the phase it is in
  if (br && cd.brain) [br.def, br.speed] = [cd.brain, cd.speed];
  const m = c.mover.get(e);
  if (m && cd.brain) m.turnRate = cd.brain.params.turnRate;
  if (c.dread.has(e)) c.dread.set(e, dreadOf(def));
}
