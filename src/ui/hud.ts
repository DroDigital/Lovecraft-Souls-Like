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
import { canLevel, LEVEL_IDS } from '../systems/levels';
import { createBossHud } from './bossHud';
import { createFoeBars } from './foeBars';
import { fill, glyph } from './glyphs';
import { EPITAPHS } from '../data/epitaphs';
import { REGIONS } from '../data/regions';
import { creatureOf } from '../systems/creatures';
import { createBanner } from './banner';
import { DYING_MS } from './journeys';
import { bar, BONE, el, percent, RUST, SEA, SERIF, setStyle, setText } from './hudKit';
import type { MapPainter } from './mapPainter';
import { menuOpen } from './menuKit';
import { createHints } from './hints';
import { createMindHud } from './mindHud';
import { createMinimap } from './minimap';
import { PICTURE_LAYER, uiScale } from './uiScale';

const NOTICE_MS = 1100;
const NOTICE_HOLD_MS = 700; // a notice stands at least this long before the next takes its place (round 19: two at once, the first was lost)

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

/** `held`: Echoes earned but still on their way to the investigator (render/echoFx.ts): the count rises as they land. */
export function createHud(g: Game, canvas: HTMLCanvasElement, painter: MapPainter, held: () => number = () => 0): Hud {
  const root = el(`${PICTURE_LAYER};pointer-events:none;font:13px/1.4 ${SERIF};font-variant-numeric:lining-nums tabular-nums;color:${BONE};z-index:1`); // drawn at the UI scale, in the period face (round 14)
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
  const prompt = el('position:absolute;left:0;right:0;bottom:64px;text-align:center;letter-spacing:2px;opacity:.85', '', root);
  document.body.append(root);

  let noticeUntil = 0;
  const waiting: string[] = []; // notices held back while one stands
  let noticeAt = -Infinity;
  const put = (text: string): void => {
    notice.textContent = fill(text, true); // a notice may name a button: {pause}
    noticeAt = performance.now();
    noticeUntil = noticeAt + NOTICE_MS;
  };
  const say = (text: string): void => {
    if (!text || waiting.includes(text)) return;
    if (performance.now() - noticeAt < NOTICE_HOLD_MS) void (waiting.length < 3 && waiting.push(text));
    else put(text);
  };
  const great = createBanner(); // a death, a horror's fall, a place: the great words (banner.ts)
  const show = (text: string): void => great.show(text, 'place');
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
    if (e.entity !== me) return;
    great.show('UNMADE', 'death', 'YOUR ECHOES LIE WHERE YOU FELL');
    setTimeout(() => great.hide(), DYING_MS); // it fades as the veil falls (journeys.ts)
  });
  g.events.on('Respawned', () => great.hide());
  g.events.on('FirstSight', (e) => {
    if (e.sanity || e.insight) say([e.name.toUpperCase(), e.sanity && signed(-e.sanity, 'SANITY'), e.insight && signed(e.insight, 'INSIGHT')].filter(Boolean).join('  '));
  });
  g.events.on('InsightChanged', (e) => {
    if (e.cause === 'tome' || e.cause === 'upgrade') say(`${e.source.toUpperCase()}  ${signed(e.change, 'INSIGHT')}`);
  });
  g.events.on('RegionEntered', (e) => show(e.name.toUpperCase()));
  g.events.on('Travelled', (e) => show(e.name.toUpperCase()));
  g.events.on('Vanquished', (e) => great.show('HORROR VANQUISHED', 'victory', e.name.toUpperCase(), EPITAPHS[creatureOf(g, e.entity)?.id ?? '']));
  g.events.on('Discovered', (e) => say(`ELDER SIGN FOUND · ${e.name.toUpperCase()}`));
  g.events.on('PlaceFound', (e) => great.show(e.name.toUpperCase(), 'place', `${e.found} OF ${e.of} PLACES · ${(REGIONS.find((r) => r.id === e.region)?.name ?? '').toUpperCase()}`)); // round 18
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
      setText(reagent, `REAGENT ×${g.player.reagent}${g.player.oil > 0 ? `   OIL ×${g.player.oil}` : ''}`); // flasks once any are carried (round 12)
      setText(insight, `INSIGHT ${g.mind.insight}`);
      const ready = LEVEL_IDS.some((id) => canLevel(g, id)); // a level within reach: rest at an Elder Sign
      setText(echoes, `ECHOES ${Math.max(0, g.player.echoes - held())}${ready ? '  ▲' : ''}`);
      const now = performance.now();
      if (waiting.length && now - noticeAt >= NOTICE_HOLD_MS) put(waiting.shift()!);
      setStyle(notice, 'opacity', String(Math.min(1, Math.max(0, (noticeUntil - now) / 300)).toFixed(2)));
      const act = fightAction(g);
      const near = interactable(g);
      const verb = near?.kind === 'npc' ? 'talk to' : near?.kind === 'sign' ? 'rest at' : 'pass through';
      const e = glyph('interact');
      setText(prompt, act ? `${e} · ${act.label}` : near ? `${e} · ${verb} ${near.name}` : '');
      bosses.update();
      foes.update(camera, canvas);

      const t = g.lock.target;
      const aim = t === null ? null : aimPoint(g, t);
      if (t === null || !aim) return setStyle(reticle, 'display', 'none');
      v.set(aim.x, aim.y, aim.z).project(camera);
      if (v.z >= 1) return setStyle(reticle, 'display', 'none');
      const [r, k] = [canvas.getBoundingClientRect(), uiScale()]; // screen pixels, in the scaled layer's (the picture's box)
      setStyle(reticle, 'left', `${Math.round((((v.x + 1) / 2) * r.width) / k)}px`);
      setStyle(reticle, 'top', `${Math.round((((1 - v.y) / 2) * r.height) / k)}px`);
      setStyle(reticle, 'display', 'block');
    },
  };
}
