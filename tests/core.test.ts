import { describe, expect, it } from 'vitest';
import { createEcs } from '../src/core/ecs';
import { createEventBus } from '../src/core/events';

describe('ecs and events', () => {
  it('stores components per entity, queries by component, despawns fully', () => {
    const ecs = createEcs({ a: new Map<number, string>(), b: new Map<number, number>() });
    const [x, y] = [ecs.spawn(), ecs.spawn()];
    ecs.c.a.set(x, 'x').set(y, 'y');
    ecs.c.b.set(y, 2);
    expect(ecs.query('a', 'b')).toEqual([y]);
    ecs.despawn(y);
    expect(ecs.query('a')).toEqual([x]);
    expect(ecs.c.b.size).toBe(0);
  });

  it('delivers typed events to subscribers until they unsubscribe', () => {
    const bus = createEventBus<{ Ping: { n: number } }>();
    const got: number[] = [];
    const off = bus.on('Ping', (e) => got.push(e.n));
    bus.emit('Ping', { n: 1 });
    off();
    bus.emit('Ping', { n: 2 });
    expect(got).toEqual([1]);
  });
});
