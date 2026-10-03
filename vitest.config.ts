/**
 * Two sets of tests (playtest round 24: `npm run check` took a minute and a half, most of it audits that
 * walk every dungeon and prop, or play every boss): the everyday set (`check`) and the audits (`audit`:
 * the random-play soak, the bots that fight every creature, the walks of every dungeon and prop, the
 * balance table). `check:all` runs both (what CI should).
 */
import { configDefaults, defineConfig } from 'vitest/config';

export const AUDITS = [
  'tests/soak.test.ts',
  'tests/bossBot.test.ts',
  'tests/foeBot.test.ts',
  'tests/bossStand.test.ts',
  'tests/dungeonView.test.ts',
  'tests/objectView.test.ts',
  'tests/roam.test.ts',
  'tests/balance.test.ts',
];

// Round 38: several tests build a whole world (npcLife, worldDeath, worldLights, nightWeather, outerGods, wanderers, overheard) and
// took longer than the default five seconds whenever the machine was busy (CI, or a browser open beside it): they failed by the clock, not the code.
const TIMEOUT = 30_000;

export default defineConfig(({ mode }) => ({
  test: { testTimeout: TIMEOUT, ...(mode === 'audit' ? { include: AUDITS } : mode === 'all' ? {} : { exclude: [...configDefaults.exclude, ...AUDITS] }) },
}));
