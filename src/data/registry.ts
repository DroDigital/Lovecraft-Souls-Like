/** The entity registry (spec §3C): every tier's definitions, lookup by id, and variant overrides. */

import { ARCHETYPES } from './archetypes';
import { ALLIES } from './entities/allies';
import { GREAT_OLD_ONES } from './entities/greatOldOnes';
import { GREATER } from './entities/greater';
import { LESSER } from './entities/lesser';
import { NAMED } from './entities/named';
import { OUTER_GODS } from './entities/outerGods';
import type { ArchetypeParams, AssemblyRecipe, Behavior, EntityDef, EntityOverride, SpriteRecipe } from './schema';

export const ENTITIES: readonly EntityDef[] = [...LESSER, ...GREATER, ...NAMED, ...GREAT_OLD_ONES, ...OUTER_GODS, ...ALLIES];

const BY_ID = new Map(ENTITIES.map((d) => [d.id, d]));

export const getEntity = (id: string): EntityDef | undefined => BY_ID.get(id);

export type Variant = 'eldritch' | 'boss';

/** A copy of `def` with an override merged one level deep (variants carry no variants of their own). */
export function applyOverride(def: EntityDef, o: EntityOverride): EntityDef {
  const { eldritchVariant: _e, bossVariant: _b, ...base } = def;
  return {
    ...base,
    name: o.name ?? def.name,
    sprite: o.sprite ? ({ ...def.sprite, ...o.sprite } as SpriteRecipe) : def.sprite,
    assembly: o.assembly ? ({ ...def.assembly, ...o.assembly } as AssemblyRecipe) : def.assembly,
    behavior: o.behavior ? ({ ...def.behavior, ...o.behavior } as Behavior) : def.behavior,
    stats: { ...def.stats, ...o.stats },
    resist: o.resist ?? def.resist,
    weak: o.weak ?? def.weak,
    drops: o.drops ?? def.drops,
    insightOnSight: o.insightOnSight ?? def.insightOnSight,
    bossScript: o.bossScript ?? def.bossScript,
  };
}

/** The entity as it appears in a variant, or undefined when it has no such variant. */
export function variantOf(def: EntityDef, v: Variant): EntityDef | undefined {
  const o = v === 'eldritch' ? def.eldritchVariant : def.bossVariant;
  return o && applyOverride(def, o);
}

/** Archetype defaults with the entity's own params on top. */
export const paramsOf = (b: Behavior): ArchetypeParams => ({ ...ARCHETYPES[b.archetype], ...b.params });
