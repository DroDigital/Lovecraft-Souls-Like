import { describe, expect, it } from 'vitest';
import { createWorldGame } from '../src/systems/game';
import { worldLayout } from '../src/world/placements';
import { goTo, record, run } from './worldHelpers';

describe('the rooms say their words (round 12)', () => {
  it('coming into a worded room of the Stairs of Slumber says it once, until a rest or a death', () => {
    const g = createWorldGame();
    const titles = record(g, 'Title');
    const stairs = worldLayout().dungeons.find((d) => d.layout.def.id === 'slumber')!.layout;
    const light = stairs.rooms.find((r) => r.def.id === 'light_1')!;
    goTo(g, light.x, light.z);
    run(g, 12);
    expect(titles.map((t) => t.text)).toEqual(['THE SEVENTY STEPS OF LIGHT SLUMBER']);
    run(g, 30);
    expect(titles).toHaveLength(1); // once
    g.events.emit('Rested', { sign: 'dream_cavern', name: 'Cavern of Flame' });
    goTo(g, light.x + 0.5, light.z);
    run(g, 12);
    expect(titles).toHaveLength(2); // and again after a rest
  });
});
