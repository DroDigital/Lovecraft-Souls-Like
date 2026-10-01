/**
 * Achievements as they are earned (playtest round 12; systems/achievements.ts): once a second the
 * dream is looked over, and what it has newly earned is kept with the records, said on the HUD and
 * passed to the desktop shell (which will hand it to Steam once the shell speaks to it). The pause
 * menu's page lists them all.
 */

import { ACHIEVEMENT_IDS, ACHIEVEMENTS } from '../data/achievements';
import { newlyEarned } from '../systems/achievements';
import type { Game } from '../systems/components';
import { loadRecords, noteAchievements } from '../systems/records';
import type { SaveStore } from '../systems/save';
import { desktop } from './desktop';
import { glyph } from './glyphs';
import { button, el, heading, title, type Page } from './menuKit';

export function watchAchievements(g: Game, store: SaveStore | null): void {
  let records = loadRecords(store);
  setInterval(() => {
    const got = newlyEarned(g, new Set(records.achievements), records.endings.length);
    if (!got.length) return;
    records = noteAchievements(store, got);
    for (const id of got) {
      g.events.emit('Notice', { text: `✦ ${ACHIEVEMENTS[id].name.toUpperCase()}` });
      void desktop?.achieve?.(id);
    }
  }, 1000);
}

/** Every achievement, the earned ones marked. */
export function achievementsPage(store: SaveStore | null, back: () => void): Page {
  return {
    back,
    build(p) {
      const held = new Set(loadRecords(store).achievements);
      title(p, 'ACHIEVEMENTS');
      el(p, 'div', `${ACHIEVEMENT_IDS.filter((id) => held.has(id)).length} of ${ACHIEVEMENT_IDS.length}`, 'opacity:.55;margin:2px 0 10px');
      for (const id of ACHIEVEMENT_IDS) {
        const a = ACHIEVEMENTS[id];
        const got = held.has(id);
        el(p, 'div', `${got ? '✦' : '·'}  ${a.name}`, `opacity:${got ? 1 : 0.45};margin-top:6px`);
        el(p, 'div', a.note, `opacity:${got ? 0.6 : 0.35};font-size:12px;margin:0 0 2px 16px`);
      }
      heading(p, '');
      button(p, `Back  (${glyph('back')})`, back);
    },
  };
}
