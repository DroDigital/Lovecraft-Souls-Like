/**
 * Phase 1 HUD, a DOM overlay: health and stamina bars, carried Echoes, the lock-on reticle with the
 * target's name and health, short combat notices, and the death banner.
 */

import { Vector3, type Camera } from 'three';
import type { Game, HitOutcome } from '../systems/components';
import { aimPoint } from '../systems/lockOn';

const BONE = '#d9d0b8';
const RUST = '#74493a';
const SEA = '#5d6c70';
const NOTICE_MS = 1100;

/** Notices for outcomes involving the player: [when the player dealt it, when the player took it]. */
const NOTICES: Partial<Record<HitOutcome, readonly [dealt: string, taken: string]>> = {
  parried: ['', 'PARRY'],
  riposte: ['RIPOSTE', ''],
  interrupted: ['INTERRUPTED', ''],
  guardBreak: ['GUARD BROKEN', 'GUARD BROKEN'],
};

function el(style: string, text = '', parent?: HTMLElement): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = style;
  d.textContent = text;
  parent?.append(d);
  return d;
}

function bar(parent: HTMLElement, colour: string): HTMLDivElement {
  const frame = el(`height:6px;margin:4px 0;border:1px solid ${BONE}55;background:#0008`, '', parent);
  return el(`height:100%;width:100%;background:${colour}`, '', frame);
}

export interface Hud {
  update(camera: Camera): void;
}

export function createHud(g: Game, canvas: HTMLCanvasElement): Hud {
  const root = el(`position:fixed;inset:0;pointer-events:none;font:12px/1.4 monospace;color:${BONE};z-index:1`);
  const vitals = el('position:absolute;left:16px;bottom:16px;width:240px', '', root);
  const hp = bar(vitals, RUST);
  const stamina = bar(vitals, SEA);
  const echoes = el('position:absolute;right:16px;bottom:16px;font-size:14px;letter-spacing:2px', '', root);
  const target = el('position:absolute;left:50%;bottom:44px;width:280px;margin-left:-140px;text-align:center', '', root);
  const targetName = el('letter-spacing:2px', '', target);
  const targetHp = bar(target, RUST);
  const reticle = el(`position:absolute;width:8px;height:8px;margin:-5px 0 0 -5px;border:1px solid ${BONE};transform:rotate(45deg)`, '', root);
  const notice = el('position:absolute;left:0;right:0;top:64%;text-align:center;font-size:16px;letter-spacing:4px', '', root);
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

  const v = new Vector3();
  return {
    update(camera) {
      const c = g.ecs.c;
      const h = c.health.get(me)!;
      const s = c.stamina.get(me)!;
      hp.style.width = `${(100 * h.hp) / h.max}%`;
      stamina.style.width = `${(100 * s.value) / s.max}%`;
      echoes.textContent = `ECHOES ${g.player.echoes}`;
      notice.style.opacity = String(Math.min(1, Math.max(0, (noticeUntil - performance.now()) / 300)));

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
