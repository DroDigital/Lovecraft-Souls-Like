import { describe, expect, it } from 'vitest';
import { START_SIGN } from '../src/data/sites';
import { LAUDANUM, SANITY, WORLD } from '../src/data/tuning';
import { dream, gatePlace, interactable, passGate, rest, signPlace, travel } from '../src/systems/checkpoints';
import { isAbsent } from '../src/systems/components';
import { createWorldGame, stepGame } from '../src/systems/game';
import { changeInsight } from '../src/systems/insight';
import { setSanity } from '../src/systems/sanity';
import { resolveCapsule } from '../src/world/colliders';
import { roomPoint } from '../src/world/dungeonKit';
import { worldLayout } from '../src/world/placements';
import { regionAt } from '../src/world/worldMap';
import { press } from './helpers';
import { goTo, record, run } from './worldHelpers';

const pos = (g: ReturnType<typeof createWorldGame>) => g.ecs.c.transform.get(g.player.id)!.pos;

describe('Elder Signs', () => {
  it('a new investigator wakes at the Miskatonic Quad; other signs are found by coming near', () => {
    const g = createWorldGame();
    const start = signPlace(START_SIGN)!;
    expect(pos(g)).toMatchObject({ x: start.rest.x, z: start.rest.z });
    expect([...g.overworld!.discovered]).toEqual([START_SIGN]);
    const found = record(g, 'Discovered');
    const dreamSign = signPlace('hub_dream')!;
    goTo(g, dreamSign.x + WORLD.discover + 1, dreamSign.z);
    run(g, 2);
    expect(found).toEqual([]);
    goTo(g, dreamSign.x + WORLD.discover - 1, dreamSign.z);
    run(g, 2);
    expect(found).toEqual([{ sign: 'hub_dream', name: dreamSign.name }]);
  });

  it('resting heals, restores sanity and Laudanum, and makes the sign the respawn point', () => {
    const g = createWorldGame();
    const s = signPlace('arkham_streets')!;
    goTo(g, s.rest.x, s.rest.z);
    g.ecs.c.health.get(g.player.id)!.hp = 10;
    g.player.laudanum = 0;
    setSanity(g, 30);
    const rested = record(g, 'Rested');
    expect(rest(g, 'arkham_streets')).toBe(true);
    expect(g.ecs.c.health.get(g.player.id)!.hp).toBe(g.ecs.c.health.get(g.player.id)!.max);
    expect(g.player.laudanum).toBe(LAUDANUM.doses);
    expect(g.mind.sanity).toBe(SANITY.max);
    expect(g.player.checkpoint).toEqual(s.rest);
    expect(g.overworld!.sign).toBe('arkham_streets');
    expect(g.overworld!.discovered.has('arkham_streets')).toBe(true);
    expect(rested).toEqual([{ sign: 'arkham_streets', name: s.name }]);
  });

  it('no resting while a foe hunts the investigator close by', () => {
    const g = createWorldGame();
    const foe = [...g.overworld!.alive.values()].find((e) => !isAbsent(g, e))!; // not the Being from Beyond
    const p = pos(g);
    g.ecs.c.transform.get(foe)!.pos = { x: p.x + 4, y: p.y, z: p.z };
    Object.assign(g.ecs.c.brain.get(foe)!, { state: 'engage', target: g.player.id });
    const refused = record(g, 'RestRefused');
    expect(rest(g, START_SIGN)).toBe(false);
    expect(refused).toHaveLength(1);
  });

  it('fast travel goes only to signs found, and the destination becomes the respawn point', () => {
    const g = createWorldGame();
    const regions = record(g, 'RegionEntered');
    expect(travel(g, 'rlyeh_door')).toBe(false);
    g.overworld!.discovered.add('rlyeh_door');
    expect(travel(g, 'rlyeh_door')).toBe(true);
    const s = signPlace('rlyeh_door')!;
    expect(pos(g)).toMatchObject({ x: s.rest.x, z: s.rest.z });
    expect(g.player.checkpoint).toEqual(s.rest);
    run(g, 1);
    expect(regions.map((r) => r.region)).toEqual(['rlyeh']);
  });

  it("the Sleeper's Sign descends into the Dreamlands: seventy steps down, the Cavern of Flame", () => {
    const g = createWorldGame();
    rest(g, START_SIGN);
    expect(dream(g)).toBe(false);
    const sleeper = signPlace('hub_dream')!;
    goTo(g, sleeper.rest.x, sleeper.rest.z);
    rest(g, 'hub_dream');
    expect(dream(g)).toBe(true);
    const threshold = worldLayout().dream!;
    expect(pos(g)).toMatchObject({ x: threshold.x, z: threshold.z });
    expect(regionAt(pos(g).x, pos(g).z)?.id).toBe('dreamlands');
    const slumber = worldLayout().dungeons.find((d) => d.layout.def.id === 'slumber')!.layout;
    const cavern = slumber.rooms.find((r) => r.def.id === 'cavern')!;
    const found = record(g, 'Discovered');
    goTo(g, cavern.x, cavern.z - 4);
    run(g, 1);
    expect(found.map((f) => f.sign)).toEqual(['dream_cavern']);
    expect(pos(g).y).toBeCloseTo(slumber.base - 8);
  });

  it('gates lead to their twins, both ways', () => {
    const g = createWorldGame();
    expect(passGate(g, 'hub_antarctic')).toBe(true);
    const far = gatePlace('mountains_gate')!;
    expect(pos(g)).toMatchObject({ x: far.arrive.x, z: far.arrive.z });
    run(g, 1);
    expect(g.overworld!.region).toBe('mountains');
    passGate(g, 'mountains_gate');
    expect(pos(g)).toMatchObject({ x: gatePlace('hub_antarctic')!.arrive.x, z: gatePlace('hub_antarctic')!.arrive.z });
  });

  it('E rests at a sign within reach, or passes a gate within reach', () => {
    const g = createWorldGame();
    const sign = signPlace(START_SIGN)!;
    expect(interactable(g)).toBeNull(); // the investigator wakes a few steps out, clear of the slab
    goTo(g, (sign.x + sign.rest.x) / 2, (sign.z + sign.rest.z) / 2);
    expect(interactable(g)).toMatchObject({ kind: 'sign', id: START_SIGN });
    const rested = record(g, 'Rested');
    stepGame(g, press('interact'));
    expect(rested).toHaveLength(1);
    const gate = gatePlace('hub_australia')!;
    goTo(g, gate.arrive.x, gate.arrive.z);
    expect(interactable(g)).toMatchObject({ kind: 'gate', id: 'hub_australia' });
    const moved = record(g, 'Travelled');
    stepGame(g, press('interact'));
    expect(moved).toEqual([{ via: 'gate', to: 'pnakotus_gate', name: gatePlace('pnakotus_gate')!.name }]);
    goTo(g, gate.arrive.x + WORLD.reach + 5, gate.arrive.z + 30);
    expect(interactable(g)).toBeNull();
  });
});

describe('hidden bridges', () => {
  it("an unseen edge stops feet over the gap until insight shows the bridge's deck", () => {
    const g = createWorldGame();
    const akeley = worldLayout().dungeons.find((d) => d.layout.def.id === 'akeley')!.layout;
    const span = akeley.rooms.find((r) => r.def.id === 'span')!;
    const onDeck = roomPoint(span, 0, -3.5); // a metre past the ledge
    const probe = (): number => {
      const p = { x: onDeck.x, y: span.level, z: onDeck.z };
      resolveCapsule(g.world, p, 0.4, 1.8);
      return Math.hypot(p.x - onDeck.x, p.z - onDeck.z);
    };
    expect(probe()).toBeGreaterThan(0.5);
    changeInsight(g, 2, 'debug', 'test');
    expect(probe()).toBe(0);
  });
});
