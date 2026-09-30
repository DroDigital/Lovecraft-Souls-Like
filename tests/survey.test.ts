import { describe, expect, it } from 'vitest';
import { SURVEY } from '../src/data/tuning';
import { beaconAlpha } from '../src/render/beacons';
import { isExplored } from '../src/systems/exploration';
import { createWorldGame } from '../src/systems/game';
import { nearestUnfound } from '../src/systems/survey';
import { worldLayout } from '../src/world/placements';
import { place } from './helpers';
import { record } from './worldHelpers';

describe('a page sketches the way (round 26)', () => {
  it('draws the ground about the nearest Elder Sign not yet found onto the map, and says so', () => {
    const g = createWorldGame();
    const signs = worldLayout().signs.filter((s) => !s.dream);
    const start = signs[0];
    place(g, g.player.id, start.x + 5, start.z, 0);
    const target = nearestUnfound(g, g.ecs.c.transform.get(g.player.id)!.pos)!;
    expect(target).toBeDefined();
    expect(target.id).not.toBe(start.id === target.id ? '' : 'x');
    expect(isExplored(g.overworld!.explored, target.x, target.z)).toBe(false);
    const notices = record(g, 'Notice');
    g.events.emit('Read', { name: 'Necronomicon' });
    expect(isExplored(g.overworld!.explored, target.x, target.z)).toBe(true);
    expect(notices.some((n) => n.text.includes(target.name.toUpperCase()))).toBe(true);
  });

  it('skips the signs found, and the far ones', () => {
    const g = createWorldGame();
    const all = worldLayout().signs.filter((s) => !s.dream);
    const me = { x: all[0].x, z: all[0].z };
    for (const s of all) g.overworld!.discovered.add(s.id);
    expect(nearestUnfound(g, me)).toBeUndefined();
    g.overworld!.discovered.clear();
    const far = all.find((s) => Math.hypot(s.x - me.x, s.z - me.z) > SURVEY.reach)!;
    for (const s of all) if (s.id !== far.id) g.overworld!.discovered.add(s.id);
    expect(nearestUnfound(g, me)).toBeUndefined();
  });
});

describe('the columns over the signs (round 26)', () => {
  it('show across a field, brighten as they near and give way to the sign within thirty metres', () => {
    const { see, near } = SURVEY.beacon;
    expect(beaconAlpha(see + 10)).toBe(0);
    expect(beaconAlpha(near - 1)).toBe(0);
    expect(beaconAlpha(near + near / 2)).toBeGreaterThan(0);
    expect(beaconAlpha(see * 0.6)).toBe(1);
    expect(beaconAlpha(see * 0.9)).toBeLessThan(1);
  });
});
