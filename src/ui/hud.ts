/**
 * The HUD, a DOM overlay: health, stamina and sanity bars (ticks mark the band floors, and the bar
 * takes an anomaly colour once the mind fractures), the band and the Laudanum left, carried
 * Echoes and insight, the lock-on reticle with the target's name and health, short notices
 * (combat, bands, first sights, insight, Elder Signs), titles for regions entered, places reached and
 * bosses vanquished, the interact prompt near an Elder Sign or gate (or for a boss fight's
 * action), the death banner, and the boss fights' half (bossHud.ts).
 */

import { Vector3, type Camera } from 'three';
import { SANITY } from '../data/tuning';
import type { Band, Game, HitOutcome } from '../systems/components';
import { interactable } from '../systems/checkpoints';
import { aimPoint } from '../systems/lockOn';
import { bandIndex } from '../systems/sanity';
import { fightAction } from '../systems/fightActions';
import { createBossHud } from './bossHud';
import { bar, BONE, el, RUST, SEA } from './hudKit';

const BAND_COLOURS: Record<Band, string> = { lucid: BONE, uneasy: BONE, fractured: '#6a0dad', unmoored: '#d80073' };
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

export function createHud(g: Game, canvas: HTMLCanvasElement): Hud {
  const root = el(`position:fixed;inset:0;pointer-events:none;font:12px/1.4 monospace;color:${BONE};z-index:1`);
  const vitals = el('position:absolute;left:16px;bottom:16px;width:240px', '', root);
  const hp = bar(vitals, RUST);
  const stamina = bar(vitals, SEA);
  const sanity = bar(vitals, BONE);
  for (const floor of SANITY.bands) el(`position:absolute;left:${floor}%;top:-3px;bottom:-3px;width:1px;background:${BONE}99`, '', sanity.parentElement!);
  const mind = el('display:flex;justify-content:space-between;letter-spacing:2px;font-size:11px', '', vitals);
  const band = el('', '', mind);
  const laudanum = el('opacity:.7', '', mind);
  const counters = el('position:absolute;right:16px;bottom:16px;font-size:14px;letter-spacing:2px;text-align:right', '', root);
  const insight = el('', '', counters);
  const echoes = el('', '', counters);
  const target = el('position:absolute;left:50%;bottom:44px;width:280px;margin-left:-140px;text-align:center', '', root);
  const targetName = el('letter-spacing:2px', '', target);
  const targetHp = bar(target, RUST);
  const reticle = el(`position:absolute;width:8px;height:8px;margin:-5px 0 0 -5px;border:1px solid ${BONE};transform:rotate(45deg)`, '', root);
  const notice = el('position:absolute;left:0;right:0;top:64%;text-align:center;font-size:16px;letter-spacing:4px', '', root);
  const title = el('position:absolute;left:0;right:0;top:22%;text-align:center;font-size:24px;letter-spacing:8px', '', root);
  const prompt = el('position:absolute;left:0;right:0;bottom:88px;text-align:center;letter-spacing:2px;opacity:.85', '', root);
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
  const bosses = createBossHud(g, root, say);
  let titleUntil = 0;
  const show = (text: string): void => {
    title.textContent = text;
    titleUntil = performance.now() + TITLE_MS;
  };
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
  g.events.on('SanityBandChanged', (e) => say(`${bandIndex(e.to) > bandIndex(e.from) ? '▼' : '▲'} ${e.to.toUpperCase()}`));
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
  g.events.on('RestRefused', () => say('SOMETHING HUNTS YOU · NO REST'));

  const v = new Vector3();
  return {
    update(camera) {
      const c = g.ecs.c;
      const h = c.health.get(me)!;
      const s = c.stamina.get(me)!;
      hp.style.width = `${(100 * h.hp) / h.max}%`;
      stamina.style.width = `${(100 * s.value) / s.max}%`;
      const colour = BAND_COLOURS[g.mind.band];
      sanity.style.width = `${(100 * g.mind.sanity) / SANITY.max}%`;
      sanity.style.background = colour;
      band.textContent = `${g.mind.band.toUpperCase()} ${Math.ceil(g.mind.sanity)}`;
      laudanum.textContent = `LAUDANUM ×${g.player.laudanum}`;
      insight.textContent = `INSIGHT ${g.mind.insight}`;
      echoes.textContent = `ECHOES ${g.player.echoes}`;
      const now = performance.now();
      notice.style.opacity = String(Math.min(1, Math.max(0, (noticeUntil - now) / 300)));
      title.style.opacity = String(Math.min(1, Math.max(0, (titleUntil - now) / 600)));
      const act = fightAction(g);
      const near = interactable(g);
      prompt.textContent = act ? `E · ${act.label}` : near ? `E · ${near.kind === 'sign' ? 'rest at' : 'pass through'} ${near.name}` : '';
      bosses.update();

      const t = g.lock.target;
      const aim = t === null ? null : aimPoint(g, t);
      target.style.display = aim ? 'block' : 'none';
      reticle.style.display = 'none';
      if (t === null || !aim) return;
      const th = c.health.get(t)!;
      targetName.textContent = c.combatant.get(t)?.name ?? '';
      targetHp.style.width = `${(100 * th.hp) / th.max}%`;
      v.set(aim.x, aim.y, aim.z).project(camera);
      if (v.z >= 1) return;
      const r = canvas.getBoundingClientRect();
      reticle.style.left = `${r.left + ((v.x + 1) / 2) * r.width}px`;
      reticle.style.top = `${r.top + ((1 - v.y) / 2) * r.height}px`;
      reticle.style.display = 'block';
    },
  };
}
