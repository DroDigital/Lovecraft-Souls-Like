/**
 * Talking and reading (playtest round 1): what someone says, a line at a time in a box at the
 * bottom of the screen, and the text of a tome or note as it is picked up, on a page of its own.
 * The world goes on while someone talks, the investigator standing to listen, and a blow landing on
 * them ends the talk (playtest round 7); it stands still while a page is read (main.ts). E, Enter or
 * Space (pad A) goes on; Esc (pad B) closes. A merchant's last line goes on to their wares (shopMenu.ts).
 */

import { wordMoments } from '../core/pace';
import { DOCUMENTS } from '../data/documents';
import { spokenFor } from '../data/speechLines';
import type { Game } from '../systems/components';
import { BONE } from './hudKit';
import { button, createScreen, el, frame as panelFrame, type Page } from './menuKit';
import { keyLayout } from '../core/bindings';
import { glyph } from './glyphs';

export interface Dialogue {
  readonly open: boolean;
  readonly talking: boolean; // someone speaking: the world goes on
  readonly reading: boolean; // a page read: the world stands still
}

/** The words of a line. */
const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);
/** A style string as an object (for `Object.assign` onto an element's style). */
const parse = (css: string): Record<string, string> => Object.fromEntries(css.split(';').filter(Boolean).map((d) => d.split(':') as [string, string]).map(([k, v]) => [k.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), v]));

const advances = (code: string): boolean => code === keyLayout.interact; // Enter and Space press the focused button already

/** The shadow that lets words stand on the world with no box behind them. */
const SHADOW = 'text-shadow:0 0 9px #000,0 0 3px #000,0 1px 2px #000';
/** A word not yet said, and the same said: it comes out of the dark as ink into a page (a faint blur, a breath of space between its letters, a sink of two pixels), and no more. */
const UNSAID = 'display:inline-block;opacity:0;filter:blur(3px);transform:translateY(2px);letter-spacing:.07em;transition:opacity .55s ease-out,filter .7s ease-out,transform .7s ease-out,letter-spacing .8s ease-out';
const SAID = 'opacity:1;filter:blur(0);transform:none;letter-spacing:normal';
const LATE = 600; // ms a line waits for its recording to begin before it is said by the clock instead (no recording, or one still loading)

export function createDialogue(g: Game): Dialogue {
  const talk = createScreen(8, 'transparent', 'left:50%;bottom:17%;transform:translateX(-50%);width:min(680px,92vw);padding:14px 18px', true, true); // no box: the words stand on the world (round 30)
  const read = createScreen(8, '#050506cc', `left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92vw);max-height:84vh;overflow:auto;${panelFrame()}`);

  /** Closes the talk, and whoever is speaking is cut off (the voices). */
  const leave = (): void => {
    stopSaying();
    talk.close();
    g.events.emit('Silenced', {});
  };

  /** The line being said: its words as drawn, how many are said, and what will say the rest. */
  let spans: HTMLSpanElement[] = [];
  let said = 0;
  let timer = 0;
  let frame = 0;
  let current = '';
  const stopSaying = (): void => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    [said, spans, current] = [0, [], ''];
  };
  /** Says the line's words at `moments` (seconds from now). */
  const begin = (moments: readonly number[]): void => {
    const t0 = performance.now();
    cancelAnimationFrame(frame);
    const tick = (): void => {
      const t = (performance.now() - t0) / 1000;
      while (said < spans.length && (moments[said] ?? 0) <= t) Object.assign(spans[said++].style, parse(SAID));
      if (said < spans.length) frame = requestAnimationFrame(tick);
    };
    tick();
  };

  g.events.on('Speaking', ({ text, curve, rate }) => {
    if (!talk.open || text !== current) return;
    clearTimeout(timer);
    begin(wordMoments(spans.map((s) => s.textContent ?? ''), curve, rate)); // by where the voice sounds in the recording: as it is said
  });

  g.events.on('Talked', ({ npc, name, title, lines, shop }) => {
    let i = 0;
    const line = (): void => {
      stopSaying();
      current = lines[i];
    };
    const say = (): void => {
      g.events.emit('Said', { speaker: `npc:${npc}`, text: lines[i] });
      const text = lines[i];
      timer = window.setTimeout(() => text === current && begin(wordMoments(words(text), null, 1, spokenFor(`npc:${npc}`, text))), LATE); // no voice came: said by the clock
    };
    const page: Page = {
      back: leave,
      keys: (e) => void (advances(e.code) && !e.repeat && next()),
      build(p) {
        el(p, 'div', name.toUpperCase(), `letter-spacing:3px;color:${BONE};${SHADOW}`);
        el(p, 'div', title, `opacity:.55;font-size:11px;margin-bottom:8px;${SHADOW}`);
        const para = el(p, 'div', '', `font-size:16px;line-height:1.55;min-height:3.1em;${SHADOW}`);
        const shown = said;
        spans = words(lines[i]).map((w, k) => {
          if (k) para.append(' ');
          const s = el(para, 'span', w, `${UNSAID};${k < shown ? SAID : ''}`);
          if (k < shown) s.style.transition = 'none'; // a page drawn again keeps what was said, still
          return s;
        });
        const last = i >= lines.length - 1;
        const row = el(p, 'div', '', 'display:flex;justify-content:space-between;align-items:center;margin-top:6px');
        el(row, 'div', `${i + 1} / ${lines.length}`, `opacity:.35;font-size:10px;${SHADOW}`);
        button(row, `${glyph('interact')} · ${last ? (shop ? 'Trade' : 'Leave') : 'Go on'}`, next).className = 'quiet';
      },
    };
    const next = (): void => {
      if (++i < lines.length) {
        line();
        talk.show(page);
        return say();
      }
      leave();
      if (shop) g.events.emit('Trade', { shop, name }); // a merchant's wares follow (round 12)
    };
    line();
    talk.show(page);
    say();
  });

  g.events.on('Hit', (e) => {
    if (e.target === g.player.id && e.damage > 0 && talk.open) leave(); // no one talks on through a blow
  });

  g.events.on('Read', ({ name }) => {
    const doc = DOCUMENTS[name];
    if (!doc) return;
    read.show(documentPage(name, () => read.close(), `${glyph('interact')} · Put it away`));
  });

  return {
    get open() {
      return talk.open || read.open;
    },
    get talking() {
      return talk.open;
    },
    get reading() {
      return read.open;
    },
  };
}

/** A tome's or note's text on a page; `back` closes it. */
export function documentPage(name: string, back: () => void, label = 'Back'): Page {
  const doc = DOCUMENTS[name];
  return {
    back,
    keys: (e) => void (advances(e.code) && !e.repeat && back()),
    build(p) {
      el(p, 'div', name.toUpperCase(), `letter-spacing:3px;color:${BONE};margin-bottom:4px`);
      el(p, 'div', doc?.kind === 'tome' ? 'a tome' : 'a note', 'opacity:.45;font-size:11px;margin-bottom:14px');
      for (const para of doc?.text ?? []) el(p, 'p', para, 'font-size:15px;line-height:1.6;margin:0 0 10px');
      button(p, label, back);
    },
  };
}
