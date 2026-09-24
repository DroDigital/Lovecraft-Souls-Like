/** Minimal hand-rolled ECS (spec §1): numeric entity ids, one typed Map per component, plain-function systems. */

export type Entity = number;

export type StoreMap = Record<string, Map<Entity, unknown>>;

export interface Ecs<S extends StoreMap> {
  /** Component stores by name. */
  readonly c: S;
  spawn(): Entity;
  /** Removes every component of `e`. */
  despawn(e: Entity): void;
  /** Entities that have all the given components, in insertion order of the first store. */
  query(...keys: (keyof S)[]): Entity[];
}

export function createEcs<S extends StoreMap>(stores: S): Ecs<S> {
  let next = 1;
  return {
    c: stores,
    spawn: () => next++,
    despawn(e) {
      for (const store of Object.values(stores)) store.delete(e);
    },
    query(...keys) {
      const out: Entity[] = [];
      if (keys.length === 0) return out;
      for (const e of stores[keys[0]].keys()) if (keys.every((k) => stores[k].has(e))) out.push(e);
      return out;
    },
  };
}
