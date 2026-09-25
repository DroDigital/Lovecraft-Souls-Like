/**
 * The mind's part of the HUD (playtest round 2): the sanity bar, ticked at the band floors and
 * coloured by band, says plainly when sanity is lost. The lost part lingers in Eldritch Magenta and
 * drains after a moment (as a wound does on health's bar), and a sudden loss (SanityLost) jolts the
 * bar and lights its frame. Once the mind has Fractured, the Laudanum count becomes the call to drink
 * it, and the band's notice says so too (or to rest, when none is left). No new screen effect: the
 * sanity FX say enough already.
 */

import { MIND_HUD, SANITY } from '../data/tuning';
import type { Band, Game } from '../systems/components';
import { atOrBelow, bandIndex } from '../systems/sanity';
import { bar, BONE, el, setStyle, setText } from './hudKit';

const MAGENTA = '#d80073';
const BAND_COLOURS: Record<Band, string> = { lucid: BONE, uneasy: BONE, fractured: '#6a0dad', unmoored: MAGENTA };

export interface MindHud {
  update(now: number): void;
}

/** Whether the investigator should be told to drink: the mind has Fractured, a dose is left, and none is being drunk. */
export const callsForLaudanum = (g: Game): boolean =>
  atOrBelow(g.mind, 'fractured') && g.player.laudanum > 0 && g.ecs.c.actor.get(g.player.id)?.move !== 'drink';

/** Builds the sanity bar and the band line into `vitals`; `say` shows a short notice. */
export function createMindHud(g: Game, vitals: HTMLElement, say: (text: string) => void): MindHud {
  const fill = bar(vitals, BONE);
  const frame = fill.parentElement!;
  const chip = el(`position:absolute;left:0;top:0;height:100%;width:100%;background:${MAGENTA}cc`, '', frame);
  frame.insertBefore(chip, fill);
  fill.style.position = 'relative';
  for (const floor of SANITY.bands) el(`position:absolute;left:${floor}%;top:-3px;bottom:-3px;width:1px;background:${BONE}99`, '', frame);
  const line = el('display:flex;justify-content:space-between;letter-spacing:2px;font-size:11px', '', vitals);
  const band = el('', '', line);
  const laudanum = el('opacity:.7', '', line);
  let chipPct = 100;
  let chipHold = 0;
  let joltAt = -Infinity;
  let jolted = false; // the frame shows a jolt that has not been cleared yet

  g.events.on('SanityLost', () => (joltAt = performance.now()));
  g.events.on('SanityBandChanged', (e) => {
    const worse = bandIndex(e.to) > bandIndex(e.from);
    const call = !worse || bandIndex(e.to) < bandIndex('fractured') ? '' : g.player.laudanum > 0 ? '  ·  T  LAUDANUM' : '  ·  REST AT AN ELDER SIGN';
    say(`${worse ? '▼' : '▲'} ${e.to.toUpperCase()}${call}`);
  });

  return {
    update(now) {
      const m = g.mind;
      const pct = (100 * m.sanity) / SANITY.max;
      if (pct >= chipPct) chipPct = pct;
      else if (chipHold === 0) chipHold = now + MIND_HUD.chipDelay * 1000;
      else if (now > chipHold) chipPct = Math.max(pct, chipPct - MIND_HUD.chipRate / 60);
      if (chipPct <= pct) chipHold = 0;
      setStyle(fill, 'width', `${pct.toFixed(1)}%`);
      setStyle(fill, 'background', BAND_COLOURS[m.band]);
      setStyle(chip, 'width', `${chipPct.toFixed(1)}%`);
      setStyle(chip, 'background', m.band === 'unmoored' ? `${BONE}cc` : `${MAGENTA}cc`);
      const jolt = Math.max(0, 1 - (now - joltAt) / (MIND_HUD.joltSeconds * 1000));
      if (jolt > 0 || jolted) {
        frame.style.transform = jolt > 0 ? `translateX(${Math.round(Math.sin(now / 11) * 3 * jolt)}px)` : '';
        frame.style.borderColor = jolt > 0 ? MAGENTA : `${BONE}55`;
        frame.style.boxShadow = jolt > 0 ? `0 0 ${Math.round(8 * jolt)}px ${MAGENTA}` : '';
        jolted = jolt > 0;
      }
      setText(band, `${m.band.toUpperCase()} ${Math.ceil(m.sanity)}`);
      const call = callsForLaudanum(g);
      setText(laudanum, `${call ? 'T · ' : ''}LAUDANUM ×${g.player.laudanum}`);
      setStyle(laudanum, 'color', call ? '#ff5aa8' : BONE);
      setStyle(laudanum, 'opacity', call ? (0.7 + 0.3 * Math.sin(now / 260)).toFixed(2) : '0.7');
    },
  };
}
