import { describe, expect, it } from 'vitest';
import { NPCS } from '../src/data/npcs';
import { START_SIGN } from '../src/data/sites';
import { wrapAngle, yawOf } from '../src/core/geom';
import { emptyInput } from '../src/core/input';
import { CAMERA, LAUDANUM, SANITY, WORLD } from '../src/data/tuning';
import { dream, gatePlace, interactable, passGate, rest, signPlace, travel } from '../src/systems/checkpoints';
import { isAbsent } from '../src/systems/components';
import { npcEntity, npcPlace, talk } from '../src/systems/npcs';
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
    expect(dream(g)).toBe(false); // not while Keziah Mason troubles the sleepers (round 12)
    g.overworld!.slain.add('boss:keziah_mason');
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

  it('those coming through a gate stand clear of it: beyond the camera boom and out of reach', () => {
    for (const gate of worldLayout().gates) {
      const d = Math.hypot(gate.arrive.x - gate.x, gate.arrive.z - gate.z);
      expect(d, gate.id).toBeGreaterThan(Math.max(WORLD.reach, CAMERA.distance) + 1);
    }
  });

  it('E rests at a sign within reach, or passes a gate within reach', () => {
    const g = createWorldGame();
    const sign = signPlace(START_SIGN)!;
    expect(interactable(g)).toMatchObject({ kind: 'sign', id: START_SIGN }); // they wake within reach: E rests at once (round 12)
    goTo(g, (sign.x + sign.rest.x) / 2, (sign.z + sign.rest.z) / 2);
    expect(interactable(g)).toMatchObject({ kind: 'sign', id: START_SIGN });
    const rested = record(g, 'Rested');
    stepGame(g, press('interact'));
    expect(rested).toHaveLength(1);
    const gate = gatePlace('hub_australia')!;
    goTo(g, gate.arrive.x, gate.arrive.z);
    expect(interactable(g)).toBeNull(); // arriving, the gate is out of reach: a stray E does not send them back
    const back = (WORLD.reach - 0.7) / WORLD.gateArrive; // a step or two back toward the gate: within reach (round 32: the arrival is further out, so no longer half way)
    goTo(g, gate.x + (gate.arrive.x - gate.x) * back, gate.z + (gate.arrive.z - gate.z) * back);
    expect(interactable(g)).toMatchObject({ kind: 'gate', id: 'hub_australia' });
    const moved = record(g, 'Travelled');
    stepGame(g, press('interact'));
    expect(moved).toEqual([{ via: 'gate', to: 'pnakotus_gate', name: gatePlace('pnakotus_gate')!.name }]);
    goTo(g, gate.arrive.x + WORLD.reach + 5, gate.arrive.z + 30);
    expect(interactable(g)).toBeNull();
  });
});

describe('E takes what the investigator faces (playtest round 12)', () => {
  it('between a person and the sign they stand by, facing one or the other chooses', () => {
    const g = createWorldGame();
    const person = NPCS.map((n) => ({ n, at: npcPlace(n)!, sign: signPlace(n.sign)! })).find(({ at, sign }) => Math.hypot(at.x - sign.x, at.z - sign.z) < WORLD.reach + WORLD.signReach - 1)!;
    expect(person).toBeDefined();
    const { at, sign } = person;
    const d = Math.hypot(at.x - sign.x, at.z - sign.z);
    const k = Math.min(WORLD.reach - 0.3, d / 2) / d; // a point within reach of both, on the line between them
    const [x, z] = [at.x + (sign.x - at.x) * k, at.z + (sign.z - at.z) * k];
    goTo(g, x, z, yawOf(at.x - x, at.z - z));
    expect(interactable(g)).toMatchObject({ kind: 'npc', id: person.n.id });
    goTo(g, x, z, yawOf(sign.x - x, sign.z - z));
    expect(interactable(g)).toMatchObject({ kind: 'sign', id: sign.id });
  });

  it('talking turns them to the speaker and the camera frames them, until they move', () => {
    const g = createWorldGame();
    const n = NPCS[0];
    const at = npcPlace(n)!;
    goTo(g, at.x + 2, at.z, 0); // beside them, looking away
    talk(g, n.id);
    expect(g.player.listening).not.toBeNull();
    run(g, 90);
    const tr = g.ecs.c.transform.get(g.player.id)!;
    const want = yawOf(at.x - tr.pos.x, at.z - tr.pos.z);
    expect(Math.abs(wrapAngle(tr.yaw - want))).toBeLessThan(0.05);
    expect(Math.abs(wrapAngle(g.camera.yaw - want - CAMERA.talkTurn))).toBeLessThan(0.1); // turned a little, the speaker clear of their back
    const them = g.ecs.c.transform.get(npcEntity(g, n.id)!)!;
    expect(Math.abs(wrapAngle(them.yaw - yawOf(tr.pos.x - at.x, tr.pos.z - at.z)))).toBeLessThan(0.05); // and they to them
    stepGame(g, { ...emptyInput(), moveY: 1 });
    expect(g.player.listening).toBeNull();
    run(g, 120);
    const now = g.ecs.c.transform.get(g.player.id)!.pos;
    expect(Math.abs(wrapAngle(them.yaw - yawOf(now.x - them.pos.x, now.z - them.pos.z)))).toBeLessThan(0.3); // and still to whoever stands by them (round 26: the people have rounds of their own once the investigator has gone: npcLife.test.ts)
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
