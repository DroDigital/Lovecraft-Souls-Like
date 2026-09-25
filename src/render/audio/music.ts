/**
 * The title screen's music: "Subterranean Pulse", looped, at the volume setting. Browsers allow
 * sound only after a click or key press, so it starts on the first one if it cannot start at once;
 * starting the game fades it out.
 */

export interface Music {
  setVolume(v: number): void;
  /** Fades out over `seconds`, then stops. */
  fadeOut(seconds: number): void;
}

export const MENU_MUSIC = 'music/subterranean-pulse.mp3'; // served from public/, beside the page

export function playMenuMusic(volume: number): Music {
  const audio = new Audio(MENU_MUSIC);
  audio.loop = true;
  audio.volume = volume;
  let level = volume;
  let fading = false;
  const tryPlay = (): void => {
    if (fading) return;
    audio.play().then(
      () => {
        removeEventListener('pointerdown', tryPlay, true);
        removeEventListener('keydown', tryPlay, true);
      },
      () => undefined, // blocked until a gesture: the listeners retry
    );
  };
  addEventListener('pointerdown', tryPlay, true);
  addEventListener('keydown', tryPlay, true);
  tryPlay();
  return {
    setVolume(v) {
      level = v;
      if (!fading) audio.volume = v;
    },
    fadeOut(seconds) {
      fading = true;
      const start = performance.now();
      const from = audio.volume;
      const step = (): void => {
        const t = (performance.now() - start) / (seconds * 1000);
        if (t >= 1) {
          audio.pause();
          return;
        }
        audio.volume = Math.max(0, from * (1 - t) * (level > 0 ? 1 : 0));
        requestAnimationFrame(step);
      };
      step();
    },
  };
}
