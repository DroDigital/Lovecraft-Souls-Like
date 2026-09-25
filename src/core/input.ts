/**
 * Input (spec §1): keyboard/mouse and the Gamepad API folded into one InputFrame per 60 Hz step.
 * Presses and releases between two steps are latched, so a quick tap is never lost.
 * Mouse: LMB light, Shift+LMB heavy, RMB block, Shift+RMB parry, MMB lock-on, move to look
 * (click to capture) or flick to switch targets. Keys: WASD move, Space dodge (hold: sprint),
 * F revolver, Q lock-on, R West's Reagent (heal), T Laudanum, E interact (rest at an Elder Sign, pass a gate), arrows look
 * (←/→ switch targets). Pad: standard mapping, Souls layout.
 */

import { INPUT, SIM } from '../data/tuning';

export const BUTTONS = ['light', 'heavy', 'dodge', 'block', 'parry', 'shoot', 'lock', 'item', 'heal', 'interact'] as const;
export type Button = (typeof BUTTONS)[number];
export type Buttons = Record<Button, boolean>;

export interface InputFrame {
  moveX: number; // -1..1, + = right
  moveY: number; // -1..1, + = forward
  lookX: number; // radians this step, + = turn right
  lookY: number; // radians this step, + = look down
  held: Buttons;
  pressed: Buttons; // went down since the last step
  released: Buttons; // went up since the last step
  switchTarget: -1 | 0 | 1; // lock-on: switch to the target on the left / right
}

export const noButtons = (): Buttons => ({
  light: false,
  heavy: false,
  dodge: false,
  block: false,
  parry: false,
  shoot: false,
  lock: false,
  item: false,
  heal: false,
  interact: false,
});

export function emptyInput(): InputFrame {
  return { moveX: 0, moveY: 0, lookX: 0, lookY: 0, held: noButtons(), pressed: noButtons(), released: noButtons(), switchTarget: 0 };
}

const KEYS: Readonly<Record<string, Button>> = { Space: 'dodge', KeyF: 'shoot', KeyQ: 'lock', KeyR: 'heal', KeyT: 'item', KeyE: 'interact' };
/** Standard-mapping pad: RB light, RT heavy, LB block, LT parry, B dodge, X revolver, Y Reagent, d-pad down Laudanum, R3 lock-on, A interact. */
const PAD: Readonly<Record<Button, number>> = { light: 5, heavy: 7, block: 4, parry: 6, dodge: 1, shoot: 2, lock: 11, heal: 3, item: 13, interact: 0 };

interface PadState {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  buttons: Buttons;
}

function readPad(): PadState | null {
  const pad = [...(navigator.getGamepads?.() ?? [])].find((p): p is Gamepad => !!p && p.connected);
  if (!pad) return null;
  const axis = (i: number): number => {
    const v = pad.axes[i] ?? 0;
    return Math.abs(v) < INPUT.deadzone ? 0 : v;
  };
  const buttons = noButtons();
  for (const b of BUTTONS) {
    const btn = pad.buttons[PAD[b]];
    buttons[b] = !!btn && (btn.pressed || btn.value > 0.5);
  }
  return { lx: axis(0), ly: -axis(1), rx: axis(2), ry: axis(3), buttons };
}

export interface InputDevice {
  poll(): InputFrame;
  sensitivity: number; // look speed multiplier (the settings menu)
}

export function createInput(canvas: HTMLCanvasElement): InputDevice {
  const keys = new Set<string>();
  const held = noButtons(); // keyboard + mouse
  const down = noButtons(); // latched since the last poll
  const up = noButtons();
  const mouseButtons = new Map<number, Button>();
  let prevPad = noButtons();
  let mouseX = 0;
  let mouseY = 0;
  let flick = 0;
  let flickCooldown = 0;
  let stickArmed = true;
  let keySwitch: -1 | 0 | 1 = 0;

  const press = (b: Button): void => {
    if (!held[b]) down[b] = true;
    held[b] = true;
  };
  const release = (b: Button): void => {
    if (held[b]) up[b] = true;
    held[b] = false;
  };
  const captured = (): boolean => document.pointerLockElement === canvas;
  const capture = (): void => {
    try {
      const r: unknown = canvas.requestPointerLock();
      if (r instanceof Promise) r.catch(() => undefined);
    } catch {
      // Pointer lock unavailable: mouse look stays off, arrows and pads still work.
    }
  };

  addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    const b = KEYS[e.code];
    if (b) press(b);
    if (e.code === 'ArrowLeft') keySwitch = -1;
    else if (e.code === 'ArrowRight') keySwitch = 1;
  });
  addEventListener('keyup', (e) => {
    keys.delete(e.code);
    const b = KEYS[e.code];
    if (b) release(b);
  });
  addEventListener('blur', () => {
    keys.clear();
    mouseButtons.clear();
    for (const b of BUTTONS) release(b);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (!captured()) capture();
    const b: Button | undefined =
      e.button === 0 ? (e.shiftKey ? 'heavy' : 'light') : e.button === 2 ? (e.shiftKey ? 'parry' : 'block') : e.button === 1 ? 'lock' : undefined;
    if (!b) return;
    e.preventDefault();
    mouseButtons.set(e.button, b);
    press(b);
  });
  addEventListener('mouseup', (e) => {
    const b = mouseButtons.get(e.button);
    if (!b) return;
    mouseButtons.delete(e.button);
    release(b);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => {
    if (!captured()) return;
    mouseX += e.movementX;
    mouseY += e.movementY;
  });

  const key = (code: string): number => (keys.has(code) ? 1 : 0);

  const device: InputDevice = {
    sensitivity: 1,
    poll() {
      const dt = 1 / SIM.hz;
      const pad = readPad();
      const f = emptyInput();

      let mx = key('KeyD') - key('KeyA');
      let my = key('KeyW') - key('KeyS');
      const len = Math.hypot(mx, my);
      if (len > 1) [mx, my] = [mx / len, my / len];
      if (pad && Math.hypot(pad.lx, pad.ly) > Math.hypot(mx, my)) [mx, my] = [pad.lx, pad.ly];
      f.moveX = mx;
      f.moveY = my;

      const kx = key('ArrowRight') - key('ArrowLeft');
      const ky = key('ArrowDown') - key('ArrowUp');
      const k = device.sensitivity;
      f.lookX = k * (mouseX * INPUT.mouseSensitivity + (kx * INPUT.keyLookSpeed + (pad?.rx ?? 0) * INPUT.stickLookSpeed) * dt);
      f.lookY = k * (mouseY * INPUT.mouseSensitivity + (ky * INPUT.keyLookSpeed + (pad?.ry ?? 0) * INPUT.stickLookSpeed) * dt);

      // Target switching: arrow presses, a mouse flick, or a right-stick flick.
      let sw = keySwitch;
      flick = flick * INPUT.flickDecay + mouseX;
      if (flickCooldown > 0) flickCooldown--;
      else if (Math.abs(flick) > INPUT.flickPixels) {
        sw ||= flick > 0 ? 1 : -1;
        flick = 0;
        flickCooldown = INPUT.flickCooldown;
      }
      const rx = pad?.rx ?? 0;
      if (stickArmed && Math.abs(rx) > INPUT.stickFlick) {
        sw ||= rx > 0 ? 1 : -1;
        stickArmed = false;
      } else if (Math.abs(rx) < INPUT.stickRearm) stickArmed = true;
      f.switchTarget = sw;
      keySwitch = 0;
      mouseX = 0;
      mouseY = 0;

      const padHeld = pad?.buttons ?? noButtons();
      for (const b of BUTTONS) {
        f.held[b] = held[b] || padHeld[b];
        f.pressed[b] = down[b] || (padHeld[b] && !prevPad[b]);
        f.released[b] = up[b] || (!padHeld[b] && prevPad[b]);
        down[b] = false;
        up[b] = false;
      }
      prevPad = padHeld;
      return f;
    },
  };
  return device;
}
