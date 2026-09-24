/**
 * Debug overlay: sanity and FX-cap sliders, effect toggles on keys 1–9, H hides it, plus the page's
 * control hints. In the arena the sanity slider drives (and follows) the game's sanity, and the
 * panel adds an insight slider and buttons that spend insight on upgrades.
 */

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
  /** Moves the sliders to their bindings' current values (unless one is being dragged). */
  refresh(): void;
}

/** A value a slider shows and sets. */
export interface Binding {
  get(): number;
  set(v: number): void;
}

export interface PanelOptions {
  sanity?: Binding; // default: the FxState's own sanity
  cap?: Binding; // default: the FxState's own cap
  insight?: Binding;
  actions?: readonly { label: string; run(): void }[];
}

interface Slider {
  row: HTMLElement;
  refresh(): void;
}

function div(style: string, text = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = style;
  el.textContent = text;
  return el;
}

function slider(name: string, max: number, step: number, bind: Binding): Slider {
  const row = document.createElement('label');
  row.style.cssText = 'display:flex;gap:6px;align-items:center';
  const input = document.createElement('input');
  input.type = 'range';
  input.name = name;
  input.min = '0';
  input.max = String(max);
  input.step = String(step);
  const out = document.createElement('span');
  out.style.cssText = 'min-width:4ch;text-align:right';
  const digits = String(step).split('.')[1]?.length ?? 0;
  let dragging = false;
  input.addEventListener('pointerdown', () => (dragging = true));
  addEventListener('pointerup', () => (dragging = false));
  input.addEventListener('input', () => {
    bind.set(Number(input.value));
    out.textContent = input.value;
  });
  const refresh = (): void => {
    const v = (Math.round(bind.get() / step) * step).toFixed(digits);
    if (dragging || v === input.value) return;
    input.value = v;
    out.textContent = v;
  };
  refresh();
  row.append(name.padEnd(7, ' '), input, out);
  return { row, refresh };
}

export function createDebugPanel(state: FxState, hints: readonly string[], opts: PanelOptions = {}): DebugPanel {
  const root = div(
    'position:fixed;top:8px;left:8px;padding:6px 10px;background:rgba(5,5,6,.75);color:#d9d0b8;' +
      'font:12px/1.5 monospace;user-select:none;z-index:1',
  );
  const sliders = [
    slider('sanity', 100, 1, opts.sanity ?? { get: () => state.sanity, set: (v) => (state.sanity = v) }),
    slider('fx cap', 1, 0.05, opts.cap ?? { get: () => state.cap, set: (v) => (state.cap = v) }),
    ...(opts.insight ? [slider('insight', 9, 1, opts.insight)] : []),
  ];
  root.append(...sliders.map((s) => s.row));
  for (const a of opts.actions ?? []) {
    const button = div('cursor:pointer;text-decoration:underline dotted', a.label);
    button.addEventListener('click', a.run);
    root.append(button);
  }
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
  return {
    setStats: (text) => (stats.textContent = text),
    refresh: () => sliders.forEach((s) => s.refresh()),
  };
}
