/**
 * The ending card (spec §5, Phase 5): when one of the three endings is chosen, its title and closing
 * words fill the screen. The investigator may walk on in the world after it, or begin anew.
 */

import { ENDINGS, type EndingId } from '../data/endings';
import type { Game } from '../systems/components';
import { BONE, el } from './hudKit';

const BUTTON = `display:inline-block;margin:28px 10px 0;padding:6px 16px;font:12px monospace;letter-spacing:2px;color:${BONE};background:#141416;border:1px solid ${BONE}55;cursor:pointer`;

export interface EndingCard {
  readonly open: boolean;
}

export function createEndingCard(g: Game): EndingCard {
  const root = el(`position:fixed;inset:0;display:none;z-index:4;background:#050506;color:${BONE};font:14px/1.8 monospace;text-align:center`, '', document.body);
  const page = el('position:absolute;left:50%;top:34%;width:min(640px,90vw);transform:translate(-50%,-30%)', '', root);
  const title = el('font-size:26px;letter-spacing:10px;margin-bottom:26px', '', page);
  const lines = el('opacity:.85', '', page);
  const buttons = el('', '', page);
  let open = false;
  const button = (text: string, run: () => void): void => {
    const b = document.createElement('button');
    b.style.cssText = BUTTON;
    b.textContent = text;
    b.addEventListener('click', run);
    buttons.append(b);
  };
  button('Walk on', () => void ((open = false), (root.style.display = 'none')));
  button('Begin anew', () => void (location.href = '?fresh'));
  g.events.on('Ending', ({ id }) => {
    const e = ENDINGS[id as EndingId];
    if (!e) return;
    title.textContent = e.title;
    lines.replaceChildren(...e.lines.map((line) => el('margin:6px 0', line)));
    open = true;
    root.style.display = 'block';
    document.exitPointerLock?.();
  });
  return {
    get open() {
      return open;
    },
  };
}
