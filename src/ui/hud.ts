/**
 * The HUD, a DOM overlay: health and stamina bars, the mind's sanity bar with its band and Laudanum
 * (mindHud.ts), carried Echoes and insight, the lock-on reticle with the target's name and health, short notices
 * (combat, bands, first sights, insight, Elder Signs), titles for regions entered, places reached and
 * bosses vanquished, the interact prompt near an Elder Sign or gate (or for a boss fight's
 * action), the death banner, the boss fights' half (bossHud.ts) and the minimap (minimap.ts).
 */

import { Vector3, type Camera } from 'three';
import { HURT } from '../data/tuning';
import type { Game, HitOutcome } from '../systems/components';
import { interactable } from '../systems/checkpoints';
import { aimPoint } from '../systems/lockOn';
import { fightAction } from '../systems/fightActions';
import { createBossHud } from './bossHud';
import { createFoeBars } from './foeBars';
import { bar, BONE, el, percent, RUST, SEA, setStyle, setText } from './hudKit';
import type { MapPainter } from './mapPainter';
import { menuOpen } from './menuKit';
import { createHints } from './hints';
import { createMindHud } from './mindHud';
import { createMinimap } from './minimap';

const NOTICE_MS = 1100;
const TITLE_MS = 2600;

/** Notices for outcomes involving the player: [when the player dealt it, when the player took it]. */
const NOTICES: Partial<Record<HitOutcome, readonly [dealt: string, taken: string]>> = {
  parried: ['', 'PARRY'],
  riposte: ['RIPOSTE', ''],
  interrupted: ['INTERRUPTED', ''],
  guardBreak: ['GUARD BROKEN', 'GUARD BROKEN'],
};

const signed = (n: number, what: string): string => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${what}`;

export interface Hud {
  update(camera: Camera): void;
}

export function createHud(g: Game, canvas: HTMLCanvasElement, painter: MapPainter): Hud {
  const root = el(`position:fixed;inset:0;pointer-events:none;font:12px/1.4 monospace;color:${BONE};z-index:1`);
  const minimap = createMinimap(g, root, painter);
  const hints = createHints(g, root);
  const vitals = el('position:absolute;left:16px;bottom:16px;width:240px', '', root);
  const hp = bar(vitals, RUST);
  const chip = el(`position:absolute;left:0;top:0;height:100%;width:100%;background:${BONE}aa`, '', hp.parentElement!);
  hp.parentElement!.insertBefore(chip, hp);
  hp.style.position = 'relative';
  let chipPct = 100;
  let chipHold = 0;
  const stamina = bar(vitals, SEA);
  const mind = createMindHud(g, vitals, (text: string) => say(text));
  const reagent = el(`opacity:.85;margin-top:2px;letter-spacing:2px;font-size:11px`, '', vitals);
  const counters = el('position:absolute;right:16px;bottom:16px;font-size:14px;letter-spacing:2px;text-align:right', '', root);
  const insight = el('', '', counters);
  const echoes = el('', '', counters);
  const reticle = el(`position:absolute;width:8px;height:8px;margin:-5px 0 0 -5px;border:1px solid ${BONE};transform:rotate(45deg)`, '', root);
  const notice = el('position:absolute;left:0;right:0;top:64%;text-align:center;font-size:16px;letter-spacing:4px', '', root);
  const title = el('position:absolute;left:0;right:0;top:22%;text-align:center;font-size:24px;letter-spacing:8px', '', root);
  const prompt = el('position:absolute;left:0;right:0;bottom:64px;text-align:center;letter-spacing:2px;opacity:.85', '', root);
  const banner = el(`position:absolute;left:0;right:0;top:38%;text-align:center;font-size:44px;letter-spacing:14px;color:${RUST}`, 'UNMADE', root);
  el('font-size:12px;letter-spacing:2px;color:#d9d0b8aa', 'your Echoes lie where you fell', banner);
  banner.style.display = 'none';
  document.body.append(root);

  let noticeUntil = 0;
  const say = (text: string): void => {
    if (!text) return;
    notice.textContent = text;
    noticeUntil = performance.now() + NOTICE_MS;
  };
  let titleUntil = 0;
  const show = (text: string): void => {
    title.textContent = text;
    titleUntil = performance.now() + TITLE_MS;
  };
  const bosses = createBossHud(g, root, say, show);
  const foes = createFoeBars(g, root);
  const me = g.player.id;
  g.events.on('Hit', (e) => {
    const n = NOTICES[e.outcome];
    if (n && e.attacker === me) say(n[0]);
    else if (n && e.target === me) say(n[1]);
  });
  g.events.on('Echoes', (e) => {
    if (e.change === 'recovered') say(`ECHOES RECOVERED  +${e.amount}`);
    else if (e.change === 'earned') say(`+${e.amount} ECHOES`);
  });
  g.events.on('Died', (e) => {
    if (e.entity === me) banner.style.display = 'block';
  });
  g.events.on('Respawned', () => (banner.style.display = 'none'));
  g.events.on('FirstSight', (e) => {
    if (e.sanity || e.insight) say([e.name.toUpperCase(), e.sanity && signed(-e.sanity, 'SANITY'), e.insight && signed(e.insight, 'INSIGHT')].filter(Boolean).join('  '));
  });
  g.events.on('InsightChanged', (e) => {
    if (e.cause === 'tome' || e.cause === 'upgrade') say(`${e.source.toUpperCase()}  ${signed(e.change, 'INSIGHT')}`);
  });
  g.events.on('RegionEntered', (e) => show(e.name.toUpperCase()));
  g.events.on('Travelled', (e) => show(e.name.toUpperCase()));
  g.events.on('Vanquished', (e) => show(`${e.name.toUpperCase()} VANQUISHED`));
  g.events.on('Discovered', (e) => say(`ELDER SIGN FOUND · ${e.name.toUpperCase()}`));
  g.events.on('QuestChanged', (e) => say(e.done ? `DONE · ${e.title.toUpperCase()}` : e.stage === 0 ? `JOURNAL · ${e.title.toUpperCase()}` : `${e.title.toUpperCase()} · UPDATED`));
  g.events.on('RestRefused', () => say('SOMETHING HUNTS YOU · NO REST'));

  const v = new Vector3();
  return {
    update(camera) {
      minimap.update();
      if (!menuOpen()) hints.update();
      const busy = menuOpen() ? 'hidden' : 'visible'; // a dialogue or menu has the screen
      setStyle(prompt, 'visibility', busy);
      setStyle(notice, 'visibility', busy);
      const c = g.ecs.c;
      const h = c.health.get(me)!;
      const s = c.stamina.get(me)!;
      setStyle(hp, 'width', percent(h.hp, h.max));
      const now0 = performance.now();
      const pct = (100 * h.hp) / h.max;
      if (pct >= chipPct) chipPct = pct;
      else if (chipHold === 0) chipHold = now0 + HURT.chipDelay * 1000;
      else if (now0 > chipHold) chipPct = Math.max(pct, chipPct - HURT.chipRate / 60);
      if (chipPct <= pct) chipHold = 0;
      setStyle(chip, 'width', `${chipPct.toFixed(1)}%`);
      setStyle(stamina, 'width', percent(s.value, s.max));
      mind.update(now0);
      setText(reagent, `REAGENT ×${g.player.reagent}`);
      setText(insight, `INSIGHT ${g.mind.insight}`);
      setText(echoes, `ECHOES ${g.player.echoes}`);
      const now = performance.now();
      setStyle(notice, 'opacity', String(Math.min(1, Math.max(0, (noticeUntil - now) / 300)).toFixed(2)));
      setStyle(title, 'opacity', String(Math.min(1, Math.max(0, (titleUntil - now) / 600)).toFixed(2)));
      const act = fightAction(g);
      const near = interactable(g);
      const verb = near?.kind === 'npc' ? 'talk to' : near?.kind === 'sign' ? 'rest at' : 'pass through';
      setText(prompt, act ? `E · ${act.label}` : near ? `E · ${verb} ${near.name}` : '');
      bosses.update();
      foes.update(camera, canvas);

      const t = g.lock.target;
      const aim = t === null ? null : aimPoint(g, t);
      if (t === null || !aim) return setStyle(reticle, 'display', 'none');
      v.set(aim.x, aim.y, aim.z).project(camera);
      if (v.z >= 1) return setStyle(reticle, 'display', 'none');
      const r = canvas.getBoundingClientRect();
      setStyle(reticle, 'left', `${Math.round(r.left + ((v.x + 1) / 2) * r.width)}px`);
      setStyle(reticle, 'top', `${Math.round(r.top + ((1 - v.y) / 2) * r.height)}px`);
      setStyle(reticle, 'display', 'block');
    },
  };
}
