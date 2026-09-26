/**
 * The desktop shell's bridge (desktop/preload.cjs), present only when the game runs in it: quitting
 * to the desktop, the window's fullscreen, and (round 12) saves kept as files. On the web it is absent,
 * and what needs it is not offered.
 */

export interface Desktop {
  quit(): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
  store?: { get(key: string): string | null; set(key: string, value: string): boolean; remove(key: string): boolean }; // files (round 12)
  achieve?(id: string): Promise<boolean>; // an achievement earned, for Steam's (round 12)
}

export const desktop: Desktop | undefined = (globalThis as { desktop?: Desktop }).desktop;
