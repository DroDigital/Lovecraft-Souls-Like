import { describe, expect, it } from 'vitest';
import { WANDERINGS, wanderingsIn } from '../src/data/wanderers';
import { getEntity } from '../src/data/registry';
import { REGIONS } from '../src/data/regions';
import { SAMPLE_SETS } from '../src/data/samples';
import { WANDER } from '../src/data/tuning';
import { createWorldGame, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/core/input';
import { bandOf, pathFor, wanderSystem } from '../src/systems/wanderers';
import { place } from './helpers';
import { record } from './worldHelpers';

describe('the sights that cross the dream (round 26)', () => {
  it('are of creatures and sounds that exist, in regions that exist', () => {
    for (const w of WANDERINGS) {
      for (const r of w.regions) expect(REGIONS.some((x) => x.id === r), `${w.id} in ${r}`).toBe(true);
      for (const who of w.who) expect(getEntity(who.id), `${w.id}: ${who.id}`).toBeDefined();
      if (w.sound) expect(SAMPLE_SETS[w.sound], `${w.id} sounds ${w.sound}`).toBeDefined();
    }
    expect(wanderingsIn('hub')).toEqual([]);
    expect(wanderingsIn('arkham').length).toBeGreaterThan(0);
  });

  it('come out of the dark far off, pass the investigator at some tens of metres, and go on', () => {
    const g = createWorldGame();
    place(g, g.player.id, -300, 250, 0); // Arkham's heath
    const me = g.ecs.c.transform.get(g.player.id)!.pos;
    let path = null;
    for (let i = 0; i < 40 && !path; i++) path = pathFor(g, me, 'arkham');
    expect(path).not.toBeNull();
    const { start, end } = path!;
    expect(Math.hypot(start.x - me.x, start.z - me.z)).toBeGreaterThanOrEqual(WANDER.from[0] - 1e-6);
    expect(Math.hypot(start.x - me.x, start.z - me.z)).toBeLessThanOrEqual(WANDER.from[1] + 1e-6);
    // the nearest the line comes to the investigator
    const [dx, dz] = [end.x - start.x, end.z - start.z];
    const t = Math.max(0, Math.min(1, ((me.x - start.x) * dx + (me.z - start.z) * dz) / (dx * dx + dz * dz)));
    const near = Math.hypot(start.x + dx * t - me.x, start.z + dz * t - me.z);
    expect(near).toBeGreaterThanOrEqual(WANDER.pass[0] - 1);
    expect(near).toBeLessThanOrEqual(WANDER.pass[1] + 1);
  });

  it('a file is sent, walks, is let go of by one that notices the investigator, and is gone when they are far', () => {
    const g = createWorldGame();
    g.overworld!.region = 'arkham';
    place(g, g.player.id, -300, 250, 0);
    const heard = record(g, 'Wandered');
    g.frame = WANDER.every * 100 - 1;
    for (let i = 0; i < 60 * 600 && !bandOf(g); i++) {
      g.frame = WANDER.every * (Math.floor(g.frame / WANDER.every) + 1) - 1;
      stepGame(g, emptyInput());
      if (g.overworld!.region !== 'arkham') g.overworld!.region = 'arkham';
    }
    const band = bandOf(g);
    expect(band).toBeDefined();
    expect(heard.length).toBe(1);
    expect(heard[0].words).toBeDefined(); // said the first time
    expect(band!.members.length).toBeGreaterThan(0);
    const lead = band!.members[0];
    const before = { ...g.ecs.c.transform.get(lead.e)!.pos };
    for (let i = 0; i < 60 * 10; i++) stepGame(g, emptyInput());
    const now = g.ecs.c.transform.get(lead.e);
    if (now && bandOf(g)?.members.some((m) => m.e === lead.e)) expect(Math.hypot(now.pos.x - before.x, now.pos.z - before.z)).toBeGreaterThan(1); // it walks
    place(g, g.player.id, 4000, 4000, 0); // the investigator goes far away
    g.overworld!.region = 'arkham';
    for (let i = 0; i < 5; i++) wanderSystem(g);
    expect(bandOf(g)).toBeUndefined();
  });
});
