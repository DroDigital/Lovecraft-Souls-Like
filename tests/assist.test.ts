import { describe, expect, it } from 'vitest';
import { clampSetting, defaultSettings } from '../src/ui/settings';
import { strike, type Blow } from '../src/systems/combat';
import { scriptedGame } from './helpers';

const blow: Blow = { damage: 40, poise: 0, guard: 0, hitstop: 0, parryable: false, interrupts: false };

/** What a blow of 40 does to `to` from `from`, at the foes' weight `foe` (the player's setting) in journey `cycle`. */
function dealt(foe: number, cycle: number, who: 'foe' | 'player'): number {
  const { g, player, deepOne } = scriptedGame();
  g.assist.foeBlows = foe;
  g.player.cycle = cycle;
  let damage = 0;
  g.events.on('Hit', (e) => void (damage = e.damage));
  who === 'foe' ? strike(g, deepOne, player, blow) : strike(g, player, deepOne, blow);
  return damage;
}

describe('the foe damage setting (round 38)', () => {
  it('weighs every enemy blow, and nobody else’s', () => {
    expect(dealt(1, 0, 'foe')).toBe(40);
    expect(dealt(0.5, 0, 'foe')).toBe(20);
    expect(dealt(1.5, 0, 'foe')).toBe(60);
    expect(dealt(0.5, 0, 'player')).toBe(40); // the investigator's blows are their own
    expect(dealt(1.5, 0, 'player')).toBe(40);
  });

  it('is laid over the journey’s own weight', () => {
    const plain = dealt(1, 2, 'foe');
    expect(plain).toBeGreaterThan(40); // a second journey strikes harder
    expect(dealt(0.5, 2, 'foe')).toBe(Math.round(plain / 2));
  });

  it('starts at one, is kept within its range, and a bad value is the default', () => {
    expect(defaultSettings().foeBlows).toBe(1);
    expect(clampSetting('foeBlows', 9)).toBe(1.5);
    expect(clampSetting('foeBlows', 0)).toBe(0.5);
    expect(clampSetting('foeBlows', 'hard')).toBe(1);
  });
});
