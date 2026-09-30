/**
 * Reach (playtest round 24): every creature can be struck by the sword-cane from as near as its body
 * lets the investigator stand. A colossus's hurt capsule was a sphere at its foot, a few metres
 * across at the height of a blade, while its body kept the investigator a colossus's width away:
 * Cthulhu, Ghatanothoa, Yog-Sothoth and Shub-Niggurath could not be touched at all, and the
 * Beyond's order (Yog-Sothoth before Azathoth) shut the Court's endings behind one of them.
 */
import { describe, expect, it } from 'vitest';
import { emptyInput } from '../src/core/input';
import { ENTITIES, type Variant } from '../src/data/registry';
import { PLAYER, SANITY } from '../src/data/tuning';
import { stepGame } from '../src/systems/game';
import { setLock } from '../src/systems/lockOn';
import { setSanity } from '../src/systems/sanity';
import { bossGame } from './bossHelpers';
import { place, press } from './helpers';

const CASES: [string, Variant | undefined][] = ENTITIES.filter((e) => e.tier !== 'ally').flatMap((e) => [
  [e.id, undefined] as [string, undefined],
  ...(e.eldritchVariant ? [[e.id, 'eldritch'] as [string, Variant]] : []),
  ...(e.bossVariant ? [[e.id, 'boss'] as [string, Variant]] : []),
]);

/** The blows that land on `id` in five seconds of light attacks, the investigator held where the bodies just touch. */
function landed(id: string, variant?: Variant): number {
  const { g, boss } = bossGame(id, variant, 30);
  const c = g.ecs.c;
  const body = c.body.get(boss)!;
  const at = { ...c.transform.get(boss)!.pos };
  body.fixed = true; // it is not shoved about
  c.brain.delete(boss); // and does nothing
  const me = c.health.get(g.player.id)!;
  me.hp = me.max = 1e7;
  setSanity(g, SANITY.bands[2] - 10); // low enough for the ones only a failing mind sees
  g.mind.fought = Infinity;
  let hits = 0;
  g.events.on('Hit', (e) => void (e.attacker === g.player.id && e.target === boss && hits++));
  for (let frame = 0; frame < 60 * 5; frame++) {
    place(g, g.player.id, at.x, at.z + body.radius + PLAYER.radius + 0.05, Math.PI); // as near as the bodies let it stand
    c.stamina.get(g.player.id)!.value = PLAYER.stamina;
    g.camera.yaw = g.camera.prevYaw = 0;
    if (frame === 2) setLock(g, boss);
    stepGame(g, frame % 40 === 5 ? press('light') : emptyInput());
  }
  return hits;
}

describe('the sword-cane reaches every creature (playtest round 24)', () => {
  it('has creatures to strike', () => expect(CASES.length).toBeGreaterThan(50));

  it.each(CASES)('%s (%s) takes a blow from where it lets the investigator stand', (id, variant) => {
    expect(landed(id, variant)).toBeGreaterThan(0);
  });
});
