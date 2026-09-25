/**
 * The title screen's music: "Subterranean Pulse", looped, at the volume setting. It starts the
 * moment it may: at once where the browser allows sound on opening, else on the first click or key
 * press (the title asks for one before its menu shows). It is buffered while the title waits, and
 * begins where the track first swells rather than in its near-silent lead-in, so it is heard at
 * once. It plays on under the veil and through a new game's opening, and fades out as the world
 * first shows (main.ts).
 */

export interface Music {
  setVolume(v: number): void;
  /** Fades out over `seconds`, then stops. */
  fadeOut(seconds: number): void;
}

export const MENU_MUSIC = 'music/subterranean-pulse.mp3'; // served from public/, beside the page
/** Seconds into the track where it first swells (measured): its first three are a near-silent lead-in, and the first hit lands at 3.85. A loop plays it whole. */
export const MENU_MUSIC_FROM = 3.3;
const FADE_IN = 0.25; // seconds, so starting mid-phrase does not click

export function playMenuMusic(volume: number): Music {
  let level = volume;
  let fading = false;
  let begun = false; // sounding: play() has gone through
  const audio = new Audio(MENU_MUSIC);
  audio.preload = 'auto'; // buffered while the title waits, so the first key or click sounds at once
  audio.loop = true;
  audio.volume = 0; // until it sounds, then it rises to the setting
  audio.currentTime = MENU_MUSIC_FROM;
  audio.addEventListener('loadedmetadata', () => {
    if (!begun) audio.currentTime = MENU_MUSIC_FROM; // in case the start set before loading was not kept
  }, { once: true });
  const rise = (): void => {
    const start = performance.now();
    const step = (): void => {
      if (fading) return;
      const t = Math.min(1, (performance.now() - start) / (FADE_IN * 1000));
      audio.volume = level * t;
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  };
  const tryPlay = (): void => {
    if (fading || begun) return;
    audio.play().then(
      () => {
        if (begun) return;
        begun = true;
        rise();
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
      if (!fading && begun) audio.volume = v;
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
