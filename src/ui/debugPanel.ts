/** Debug overlay: sanity and FX-cap sliders, effect toggles on keys 1–9, H hides it, plus the page's control hints. */

import { EFFECTS, type EffectId, type FxState } from '../render/fx';

const LABELS: Record<EffectId, string> = {
  pixelate: 'low-res + nearest upscale',
  snap: 'vertex snapping',
  affine: 'affine texture wobble',
  fog: 'fog',
  isolate: 'colour isolation',
  quantize: 'palette + Bayer dither',
  warp: 'sanity warp (ripple, split)',
  displace: 'vertex displacement',
  lens: 'FOV breathing + skew',
};

export interface DebugPanel {
  setStats(text: string): void;
}

function div(style: string, text = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = style;
  el.textContent = text;
  return el;
}

function slider(name: string, max: number, step: number, value: number, set: (v: number) => void): HTMLElement {
  const row = document.createElement('label');
  row.style.cssText = 'display:flex;gap:6px;align-items:center';
  const input = document.createElement('input');
  input.type = 'range';
  input.name = name;
  input.min = '0';
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const out = document.createElement('span');
  out.style.cssText = 'min-width:4ch;text-align:right';
  const sync = (): void => {
    set(Number(input.value));
    out.textContent = input.value;
  };
  input.addEventListener('input', sync);
  sync();
  row.append(name.padEnd(7, ' '), input, out);
  return row;
}

export function createDebugPanel(state: FxState, hints: readonly string[]): DebugPanel {
  const root = div(
    'position:fixed;top:8px;left:8px;padding:6px 10px;background:rgba(5,5,6,.75);color:#d9d0b8;' +
      'font:12px/1.5 monospace;user-select:none;z-index:1',
  );
  root.append(
    slider('sanity', 100, 1, state.sanity, (v) => (state.sanity = v)),
    slider('fx cap', 1, 0.05, state.cap, (v) => (state.cap = v)),
  );
  const toggle = (id: EffectId): void => {
    state.enabled[id] = !state.enabled[id];
    paint();
  };
  const rows = EFFECTS.map((id) => {
    const row = div('cursor:pointer');
    row.addEventListener('click', () => toggle(id));
    return row;
  });
  const paint = (): void =>
    EFFECTS.forEach((id, i) => {
      rows[i].textContent = `${i + 1} ${state.enabled[id] ? '■' : '□'} ${LABELS[id]}`;
      rows[i].style.opacity = state.enabled[id] ? '1' : '0.5';
    });
  paint();
  const stats = div('opacity:.7;white-space:pre-line');
  root.append(...rows, stats, ...['1–9 toggle · H hide', ...hints].map((h) => div('opacity:.5', h)));
  document.body.append(root);

  addEventListener('keydown', (e) => {
    const i = e.key.length === 1 ? '123456789'.indexOf(e.key) : -1;
    if (i >= 0 && i < EFFECTS.length) toggle(EFFECTS[i]);
    else if (e.key === 'h' || e.key === 'H') root.hidden = !root.hidden;
  });
  return { setStats: (text) => (stats.textContent = text) };
}
