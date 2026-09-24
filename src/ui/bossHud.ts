/**
 * The HUD's boss half (spec §3E): a bar for each boss fighting the investigator (its name, its
 * health, ticks where its later phases begin, and its signature's line), the gaze and petrification buildups above the
 * vitals while they grow, a flash when time skips or the room rewires, Hastur's name flickering
 * across the screen, a set piece's titles, and notices for what the hooks and signatures do (body
 * theft, a full gaze, stone, the powder, the lamps).
 */

import { engagedFights } from '../systems/bossFight';
import type { Game } from '../systems/components';
import { SIGNATURES } from '../systems/signatures';
import { bar, BONE, el, RUST } from './hudKit';

const BARS = 2; // at once: a pair of bosses fights together at most
const FLASH_MS = 160;
const NAME_MS = 700; // a name's flicker, per time it has come

export interface BossHud {
  update(): void;
}

export function createBossHud(g: Game, root: HTMLElement, say: (text: string) => void, show: (title: string) => void): BossHud {
  const box = el('position:absolute;left:50%;top:5%;width:52%;margin-left:-26%', '', root);
  const slots = Array.from({ length: BARS }, () => {
    const slot = el('margin-bottom:6px', '', box);
    const name = el('letter-spacing:3px;font-size:13px', '', slot);
    const fill = bar(slot, RUST);
    fill.parentElement!.style.height = '8px';
    const status = el('letter-spacing:2px;font-size:11px;opacity:.8', '', slot);
    return { slot, name, fill, status, ticks: [] as HTMLDivElement[] };
  });
  const gaze = el('position:absolute;left:16px;bottom:84px;width:240px;display:none;font-size:10px;letter-spacing:2px', 'GAZE', root);
  const gazeFill = bar(gaze, '#6a0dad');
  const stone = el('position:absolute;left:16px;bottom:112px;width:240px;display:none;font-size:10px;letter-spacing:2px', 'PETRIFICATION', root);
  const stoneFill = bar(stone, '#8a8f86');
  const flash = el('position:absolute;inset:0;background:#e8e0cc;opacity:0', '', root);
  const name = el(`position:absolute;left:0;right:0;top:36%;text-align:center;font-size:72px;letter-spacing:28px;color:${BONE};opacity:0`, '', root);
  let nameUntil = 0;
  let flashUntil = 0;
  const blink = (): void => void (flashUntil = performance.now() + FLASH_MS);

  g.events.on('BodyStolen', () => say('YOUR BODY IS NOT YOUR OWN'));
  g.events.on('TimeSkipped', blink);
  g.events.on('Rewired', blink);
  g.events.on('GazeBurst', (e) => say(`THE GAZE  −${e.sanity} SANITY`));
  g.events.on('Revealed', (e) => say(`THE POWDER OF IBN GHAZI · ${e.doses} LEFT`));
  g.events.on('LampChanged', (e) => say(e.lit ? 'THE LAMP BURNS AGAIN' : 'A LAMP GOES OUT'));
  g.events.on('Petrified', () => say('TURNED TO STONE'));
  g.events.on('Title', (e) => show(e.text));
  g.events.on('Notice', (e) => say(e.text));
  g.events.on('Named', (e) => {
    name.textContent = e.name;
    nameUntil = performance.now() + NAME_MS * e.count; // it stays longer each time it comes
  });

  return {
    update() {
      const fights = engagedFights(g).slice(0, BARS);
      slots.forEach((s, i) => {
        const fight = fights[i];
        s.slot.style.display = fight ? 'block' : 'none';
        if (!fight) return;
        const [e, f] = fight;
        const h = g.ecs.c.health.get(e)!;
        s.name.textContent = (g.ecs.c.combatant.get(e)?.name ?? f.id).toUpperCase();
        s.fill.style.width = `${(100 * h.hp) / h.max}%`;
        s.status.textContent = SIGNATURES[f.id]?.status?.(g, e, f) ?? '';
        const marks = f.script.phases.slice(1).map((p) => p.hpBelow);
        while (s.ticks.length < marks.length) s.ticks.push(el(`position:absolute;top:-2px;bottom:-2px;width:1px;background:${BONE}aa`, '', s.fill.parentElement!));
        s.ticks.forEach((t, k) => {
          t.style.display = k < marks.length ? 'block' : 'none';
          if (k < marks.length) t.style.left = `${marks[k] * 100}%`;
        });
      });
      gaze.style.display = g.reality.gaze > 0 ? 'block' : 'none';
      gazeFill.style.width = `${g.reality.gaze * 100}%`;
      stone.style.display = g.reality.petrify > 0 ? 'block' : 'none';
      stoneFill.style.width = `${g.reality.petrify * 100}%`;
      const now = performance.now();
      flash.style.opacity = String(Math.max(0, (flashUntil - now) / FLASH_MS) * 0.85);
      name.style.opacity = now < nameUntil && Math.random() < 0.6 ? String(0.35 + 0.6 * Math.random()) : '0'; // it flickers
    },
  };
}
