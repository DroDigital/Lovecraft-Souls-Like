/** Typed event bus (spec §1) for cross-system signals. Handlers run synchronously, in subscription order. */

type AnyHandler = (event: unknown) => void;

export interface EventBus<E> {
  /** Subscribes; returns an unsubscribe function. */
  on<K extends keyof E>(type: K, handler: (event: E[K]) => void): () => void;
  emit<K extends keyof E>(type: K, event: E[K]): void;
}

export function createEventBus<E>(): EventBus<E> {
  const handlers = new Map<keyof E, Set<AnyHandler>>();
  return {
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) handlers.set(type, (set = new Set()));
      const h = handler as AnyHandler;
      set.add(h);
      return () => void set.delete(h);
    },
    emit(type, event) {
      handlers.get(type)?.forEach((h) => h(event));
    },
  };
}
