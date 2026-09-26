/**
 * The desktop shell's bridge (desktop/preload.cjs), present only when the game runs in it: quitting
 * to the desktop and the window's fullscreen. On the web it is absent, and what needs it is not offered.
 */

export interface Desktop {
  quit(): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
}

export const desktop: Desktop | undefined = (globalThis as { desktop?: Desktop }).desktop;
