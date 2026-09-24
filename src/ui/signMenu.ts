/**
 * The Elder Sign's menu (spec §3D), opened by resting at one: spend insight on Vigour, Endurance
 * and Resolve; travel to any Elder Sign found, grouped by region; and at the hub's Sleeper's Sign,
 * descend the Seventy Steps into the Dreamlands. Mouse-driven until Phase 6's menus (E or Esc
 * leaves); the investigator takes no input while it is open.
 */

import { getRegion } from '../data/regions';
import { UPGRADES, type UpgradeId } from '../data/tuning';
import { dream, signPlace, travel } from '../systems/checkpoints';
import type { Game } from '../systems/components';
import { buyUpgrade, upgradeName } from '../systems/insight';
import { worldLayout, type SignPlace } from '../world/placements';

const BONE = '#d9d0b8';
const BUTTON = `display:block;width:100%;margin:3px 0;padding:5px 10px;text-align:left;font:12px monospace;letter-spacing:1px;color:${BONE};background:#141416;border:1px solid ${BONE}44;cursor:pointer`;

export interface SignMenu {
  readonly open: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text: string, parent: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.style.cssText = style;
  e.textContent = text;
  parent.append(e);
  return e;
}

export function createSignMenu(g: Game): SignMenu {
  const root = el('div', `position:fixed;inset:0;display:none;z-index:3;background:#050506cc;font:12px/1.4 monospace;color:${BONE}`, '', document.body);
  const panel = el('div', 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:360px;max-height:86vh;overflow:auto;padding:18px;background:#0b0b0d;border:1px solid #d9d0b833', '', root);
  let open = false;

  const close = (): void => {
    open = false;
    root.style.display = 'none';
  };
  const button = (text: string, enabled: boolean, run: () => void): void => {
    const b = el('button', BUTTON, text, panel);
    b.disabled = !enabled;
    if (!enabled) b.style.opacity = '0.4';
    b.addEventListener('click', run);
  };
  const heading = (text: string): void => void el('div', 'margin:14px 0 4px;letter-spacing:3px;opacity:.75', text, panel);

  function render(): void {
    const ow = g.overworld!;
    const here = signPlace(ow.sign);
    panel.replaceChildren();
    el('div', 'font-size:18px;letter-spacing:4px', (here?.name ?? 'Elder Sign').toUpperCase(), panel);
    el('div', 'opacity:.6;margin-top:2px', 'Rested. Wounds close, the mind steadies, and the slain rise again.', panel);
    heading(`INSIGHT ${g.mind.insight}`);
    for (const id of Object.keys(UPGRADES) as UpgradeId[]) {
      const u = UPGRADES[id];
      const level = g.mind.upgrades[id];
      button(`${upgradeName(id)}  ${level}/${u.max}  ·  ${u.cost} insight`, level < u.max && g.mind.insight >= u.cost, () => {
        buyUpgrade(g, id);
        render();
      });
    }
    const regions = new Map<string, SignPlace[]>();
    for (const s of worldLayout().signs) if (ow.discovered.has(s.id) && s.id !== ow.sign) regions.set(s.region, [...(regions.get(s.region) ?? []), s]);
    heading(regions.size ? 'TRAVEL' : 'TRAVEL · no other Elder Sign found yet');
    for (const [region, signs] of regions) {
      el('div', 'margin:6px 0 0;opacity:.55', getRegion(region)?.name ?? region, panel);
      for (const s of signs) button(s.name, true, () => void (travel(g, s.id), close()));
    }
    if (here?.dream) {
      heading('THE SLEEPER’S SIGN');
      button('Descend the Seventy Steps of Light Slumber', true, () => void (dream(g), close()));
    }
    heading('');
    button('Leave  (E)', true, close);
  }

  g.events.on('Rested', () => {
    open = true;
    document.exitPointerLock?.();
    render();
    root.style.display = 'block';
  });
  // Capture phase: E and Esc close the menu without reaching the game (E would rest again at once).
  addEventListener(
    'keydown',
    (e) => {
      if (!open || (e.code !== 'KeyE' && e.code !== 'Escape')) return;
      e.stopImmediatePropagation();
      close();
    },
    true,
  );
  return {
    get open() {
      return open;
    },
  };
}
