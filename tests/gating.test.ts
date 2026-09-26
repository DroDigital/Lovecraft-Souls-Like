import { describe, expect, it } from 'vitest';
import { SEALS } from '../src/data/tuning';
import { gatePlace, passGate, teleport } from '../src/systems/checkpoints';
import type { Game } from '../src/systems/components';
import { spawnCreature } from '../src/systems/creatures';
import { createWorldGame } from '../src/systems/game';
import { mainLead } from '../src/systems/lead';
import { startQuest, stageOf } from '../src/systems/quests';
import { bossAwake, SEAL_REGIONS, sealsBroken } from '../src/systems/sealCount';
import { sealedHere } from '../src/systems/seals';
import { worldLayout } from '../src/world/placements';
import { goTo, record, run } from './worldHelpers';

const pos = (g: Game) => g.ecs.c.transform.get(g.player.id)!.pos;

/** Breaks `n` seals by laying low the first boss of that many seal regions (Arkham's, the Witch House's, first). */
function breakSeals(g: Game, n: number): void {
  const regions = [...SEAL_REGIONS].sort((a, b) => Number(b.id === 'arkham') - Number(a.id === 'arkham')).slice(0, n);
  for (const r of regions) {
    g.overworld!.slain.add(`boss:${r.bosses[0]}`);
    g.events.emit('Vanquished', { entity: g.player.id, name: r.bosses[0] });
  }
}

describe('playtest round 12: the way on is earned', () => {
  it('no gate opens while a boss fight holds the investigator, and it says why', () => {
    const g = createWorldGame();
    const gate = worldLayout().gates[0];
    goTo(g, gate.arrive.x, gate.arrive.z);
    const boss = spawnCreature(g, 'keziah_mason', { x: gate.arrive.x + 8, z: gate.arrive.z, yaw: 0 })!;
    g.ecs.c.fight.get(boss)!.engaged = true;
    const notices = record(g, 'Notice');
    expect(passGate(g, gate.id)).toBe(false);
    expect(notices.map((n) => n.text)).toEqual(['THE GATE WILL NOT OPEN WHILE A HORROR HOLDS YOU']);
    expect(pos(g)).toMatchObject({ x: gate.arrive.x, z: gate.arrive.z });
    g.ecs.c.fight.get(boss)!.engaged = false;
    expect(passGate(g, gate.id)).toBe(true);
    expect(pos(g).x).toBeCloseTo(gatePlace(gate.to)!.arrive.x);
  });

  it("the stair into dream opens as Keziah Mason falls, and the way down begins by itself", () => {
    const g = createWorldGame();
    startQuest(g, 'sleepers');
    g.overworld!.quests.set('sleepers', 1);
    startQuest(g, 'witch_house');
    run(g, 31);
    expect(stageOf(g, 'descent')).toBe(-1);
    g.overworld!.slain.add('boss:keziah_mason');
    run(g, 31);
    expect(stageOf(g, 'descent')).toBe(0);
    expect(mainLead(g)?.text).toContain('Kuranes');
  });

  it("Kadath's door stands sealed until four of the waking world's horrors fall, and says how many have", () => {
    const g = createWorldGame();
    const [id, door] = [...g.ecs.c.piece].find(([, p]) => p.def.minSeals !== undefined)!;
    expect(door.def.minSeals).toBe(SEALS.kadath);
    expect(g.ecs.c.layer.get(id)!.shown).toBe(false);
    expect(door.seal.some((c) => !g.world.off.has(c))).toBe(true); // the slab stands in the doorway
    teleport(g, { x: door.def.x, z: door.def.z - 3, yaw: 0 });
    breakSeals(g, 1);
    expect(sealedHere(g)).toBe(`THE DOOR IS SEALED · 1 OF ${SEALS.kadath} GREAT HORRORS HAVE FALLEN`);
    breakSeals(g, SEALS.kadath);
    expect(sealsBroken(g)).toBe(SEALS.kadath);
    expect(g.ecs.c.layer.get(id)!.shown).toBe(true);
    expect(door.seal.every((c) => g.world.off.has(c))).toBe(true); // the way is open
    expect(sealedHere(g)).toBeNull();
  });

  it("beyond the Gate the horrors wake in order: 'Umr at-Tawil, then Yog-Sothoth, then Azathoth", () => {
    const g = createWorldGame();
    const ow = g.overworld!;
    const yog = worldLayout().spawns.find((s) => s.id === 'boss:yog_sothoth')!;
    goTo(g, yog.arena!.x, yog.arena!.z);
    run(g, 31);
    expect(ow.alive.has('boss:yog_sothoth')).toBe(false); // its arena waits empty
    expect(sealedHere(g)).toBe("SOMETHING VAST SLEEPS HERE · 'UMR AT-TAWIL STILL KEEPS THE WAY");
    expect(bossAwake(g, 'azathoth')).toBe(false);
    ow.slain.add('boss:umr_at_tawil');
    run(g, 31);
    expect(ow.alive.has('boss:yog_sothoth')).toBe(true);
    expect(bossAwake(g, 'azathoth')).toBe(false);
    ow.slain.add('boss:yog_sothoth');
    expect(bossAwake(g, 'azathoth')).toBe(true);
  });

  it('the journal counts the seals and points to the nearest horror still holding one', () => {
    const g = createWorldGame();
    for (const q of ['sleepers', 'witch_house', 'descent']) g.overworld!.quests.set(q, 1);
    startQuest(g, 'kadath');
    breakSeals(g, 1);
    const lead = mainLead(g)!;
    expect(lead.text).toContain(`(1 of ${SEALS.kadath} have fallen.)`);
    expect(lead.at).not.toBeNull();
    const held = worldLayout().spawns.filter((s) => s.unique && s.id.startsWith('boss:') && SEAL_REGIONS.some((r) => r.id !== 'arkham' && r.bosses.some((b) => `boss:${b}` === s.id)));
    expect(held.some((s) => (s.arena?.x ?? s.at.x) === lead.at!.x)).toBe(true);
  });
});
