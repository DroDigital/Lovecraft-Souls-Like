import { describe, expect, it } from 'vitest';
import { RUMORS } from '../src/data/rumors';
import { getEntity } from '../src/data/registry';
import { clearOf } from '../src/render/omenFx';
import { createWorldGame } from '../src/systems/game';
import { calmOf, reliefOf, rumorFor } from '../src/systems/omens';
import { worldLayout } from '../src/world/placements';
import { record } from './worldHelpers';

const bossesOf = (region: string): string[] => worldLayout().spawns.filter((s) => s.region === region && s.id.startsWith('boss:')).map((s) => s.id);
const lone = worldLayout().spawns.find((s) => s.id.startsWith('boss:') && bossesOf(s.region).length === 1)!;

describe('the dream answers a fall (round 26)', () => {
  it('a region is as calm as its horrors are gone, the whole dream as light as its great ones are', () => {
    const g = createWorldGame();
    expect(calmOf(g, lone.region)).toBe(0);
    expect(reliefOf(g)).toBe(0);
    g.overworld!.slain.add(lone.id);
    expect(calmOf(g, lone.region)).toBe(1);
    const great = worldLayout().spawns.filter((s) => s.id.startsWith('boss:') && ['great_old_one', 'outer_god'].includes(getEntity(s.entity)?.tier ?? ''));
    for (const s of great) g.overworld!.slain.add(s.id);
    expect(reliefOf(g)).toBe(1);
    expect(calmOf(g, null)).toBe(0);
  });

  it('the mist and the stars change by the calm and the relief, never past half', () => {
    expect(clearOf(0, 0)).toBe(0);
    expect(clearOf(1, 1)).toBe(0.5);
    expect(clearOf(1, 0)).toBeGreaterThan(clearOf(0, 1));
  });

  it('the last horror of a region to fall makes it breathe out, once', () => {
    const g = createWorldGame();
    const heard = record(g, 'Exhaled');
    const e = g.ecs.spawn();
    g.ecs.c.origin.set(e, lone.id);
    g.overworld!.slain.add(lone.id);
    g.events.emit('Vanquished', { entity: e, name: 'X' });
    g.events.emit('Vanquished', { entity: e, name: 'X' });
    expect(heard.map((h) => h.region)).toEqual([lone.region]);
  });

  it('each person tells of the latest fall they have not told of, once', () => {
    const g = createWorldGame();
    const told = Object.keys(RUMORS).slice(0, 2);
    for (const id of told) g.overworld!.slain.add(`boss:${id}`);
    expect(rumorFor(g, 'morgan')).toBe(RUMORS[told[1]]); // the latest first
    expect(rumorFor(g, 'morgan')).toBe(RUMORS[told[0]]);
    expect(rumorFor(g, 'morgan')).toBeUndefined();
    expect(rumorFor(g, 'curtis')).toBe(RUMORS[told[1]]); // another person has not yet
  });

  it('every rumour is of a boss that exists', () => {
    for (const id of Object.keys(RUMORS)) expect(getEntity(id)?.bossScript, id).toBeDefined();
  });
});
