/**
 * The full map (playtest round 1): M, the pad's Select, or Map in the pause menu opens it, and the
 * world stands still while it is open (main.ts). It shows the realm the investigator stands in,
 * fitted to the screen — every ground seen, the places marked there, region names, the Elder Signs
 * lit — with how much of the realm is charted. The wheel or + and − (pad triggers) zoom; dragging,
 * the arrows or WASD (left stick) pan; C (pad A) finds the investigator. M or Esc (pad B) closes it.
 */

import type { Game } from '../systems/components';
import { exploredShare } from '../systems/exploration';
import { realmOf, realmRect } from '../world/mapData';
import { regionAt } from '../world/worldMap';
import { BONE } from './hudKit';
import { workArt } from './mapArt';
import type { MapPainter, MapView } from './mapPainter';
import { createScreen, el, menuOpen, onPadSelect, type Page } from './menuKit';

const ZOOM = [1, 10] as const;
const PAN = 0.6; // screen widths a second, held
const ART_MS = 6; // milliseconds a frame for drawing the map's art while the map is open

export interface MapScreen {
  readonly open: boolean;
  show(): void;
}

const LEGEND: readonly [string, string][] = [
  ['★', 'Elder Sign (dim until lit)'],
  ['◯', 'Gate'],
  ['∩', 'Dungeon'],
  ['◉', 'Boss (struck through once slain)'],
  ['◆', 'Your Echoes'],
  ['♙', 'Someone met in the dream'],
];

export function createMapScreen(g: Game, painter: MapPainter, resume: () => void): MapScreen {
  const screen = createScreen(7, '#050506', 'inset:0');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:grab';
  const ctx = canvas.getContext('2d')!;
  let view: MapView = { cx: 0, cz: 0, scale: 1, w: 1, h: 1 };
  let fit = 1;
  let zoom = 1;
  let title: HTMLDivElement | null = null;
  const held = new Set<string>();

  const realm = () => {
    const p = g.ecs.c.transform.get(g.player.id)!.pos;
    return realmOf(g.overworld?.region ?? regionAt(p.x, p.z)?.id ?? '');
  };
  const centreOnPlayer = (): void => {
    const p = g.ecs.c.transform.get(g.player.id)!.pos;
    [view.cx, view.cz] = [p.x, p.z];
  };
  const zoomBy = (k: number): void => {
    zoom = Math.min(ZOOM[1], Math.max(ZOOM[0], zoom * k));
    view.scale = fit * zoom;
  };

  let last = 0;
  const frame = (now: number): void => {
    if (!screen.open) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const step = (PAN * view.w * dt) / view.scale;
    if (held.has('ArrowLeft') || held.has('KeyA')) view.cx -= step;
    if (held.has('ArrowRight') || held.has('KeyD')) view.cx += step;
    if (held.has('ArrowUp') || held.has('KeyW')) view.cz += step;
    if (held.has('ArrowDown') || held.has('KeyS')) view.cz -= step;
    workArt(ART_MS);
    painter.paint(ctx, view, realm(), true);
    requestAnimationFrame(frame);
  };

  const close = (): void => {
    screen.close();
    held.clear();
    resume();
  };
  const page: Page = {
    back: close,
    backKeys: ['KeyM'],
    build(panel) {
      panel.append(canvas);
      title = el(panel, 'div', '', `position:absolute;left:0;right:0;top:14px;text-align:center;letter-spacing:6px;font-size:14px;color:${BONE};text-shadow:0 0 4px #000`);
      const legend = el(panel, 'div', '', 'position:absolute;left:16px;bottom:16px;font-size:11px;line-height:1.6;background:#050506cc;padding:6px 10px;border:1px solid #d9d0b822');
      for (const [glyph, text] of LEGEND) el(legend, 'div', `${glyph}  ${text}`);
      el(panel, 'div', 'wheel / + −  zoom     drag / WASD  pan     C  centre     M  close', 'position:absolute;right:16px;bottom:16px;font-size:10px;letter-spacing:1px;opacity:.6');
    },
    keys(e) {
      if (e.type !== 'keydown') return;
      if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomBy(1.25);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomBy(0.8);
      if (e.code === 'KeyC') centreOnPlayer();
      if (/^(Arrow|Key[WASD])/.test(e.code)) held.add(e.code);
    },
    pad(p) {
      const [x, y] = [p.axes[0] ?? 0, p.axes[1] ?? 0];
      const step = (0.02 * view.w) / view.scale;
      if (Math.hypot(x, y) > 0.2) [view.cx, view.cz] = [view.cx + x * step, view.cz - y * step];
      if (p.buttons[7]?.pressed) zoomBy(1.03);
      if (p.buttons[6]?.pressed) zoomBy(0.97);
      if (p.buttons[0]?.pressed) centreOnPlayer();
    },
  };
  addEventListener('keyup', (e) => held.delete(e.code));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 0.87);
  });
  let drag: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => void (drag = { x: e.clientX, y: e.clientY }));
  addEventListener('pointerup', () => void (drag = null));
  addEventListener('pointermove', (e) => {
    if (!drag || !screen.open) return;
    const k = canvas.width / canvas.clientWidth / view.scale;
    view.cx -= (e.clientX - drag.x) * k;
    view.cz += (e.clientY - drag.y) * k;
    drag = { x: e.clientX, y: e.clientY };
  });

  const show = (): void => {
    if (!g.overworld || menuOpen()) return;
    const rs = realm();
    if (!rs.length) return;
    [canvas.width, canvas.height] = [innerWidth, innerHeight];
    const r = realmRect(rs);
    fit = Math.min(canvas.width / ((r.x1 - r.x0) * 1.1), canvas.height / ((r.z1 - r.z0) * 1.15));
    zoom = 1;
    view = { cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2, scale: fit, w: canvas.width, h: canvas.height };
    screen.show(page);
    const charted = rs.reduce((s, x) => s + exploredShare(g.overworld!.explored, x) * (x.area[2] * x.area[3]), 0) / rs.reduce((s, x) => s + x.area[2] * x.area[3], 0);
    const here = rs.find((x) => x.id === g.overworld!.region)?.name ?? '';
    if (title) title.textContent = `${here.toUpperCase()}   ·   ${Math.round(charted * 100)}% CHARTED`;
    last = 0;
    requestAnimationFrame(frame);
  };
  addEventListener('keydown', (e) => e.code === 'KeyM' && !e.repeat && show());
  onPadSelect(show);
  return {
    get open() {
      return screen.open;
    },
    show,
  };
}
