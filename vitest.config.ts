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

export default defineConfig(({ mode }) => ({
  test: mode === 'audit' ? { include: AUDITS } : mode === 'all' ? {} : { exclude: [...configDefaults.exclude, ...AUDITS] },
}));
