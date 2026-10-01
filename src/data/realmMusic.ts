/**
 * The realms' background music (round 28): one track for each realm of the dream, from the "Backgrounds
 * by realm" folder (made with Suno from the prompts of `seventy-steps-suno-prompts.md`), served from
 * `public/music/realms/` as MP3. Each plays on a loop that has no seam (render/audio/realmLoop.ts) and
 * gives way to the next, by a crossfade, as the investigator crosses into another realm. A track's
 * level and its loop points are found when it is loaded (render/audio/loudness.ts), so a new take
 * dropped in needs no editing. The numbers here are the whole of its tuning. Data only.
 */

export const REALM_TRACKS = {
  silent_hours: { title: 'Silent Hours', realm: 'Miskatonic University' },
  heathwind: { title: 'Heathwind', realm: 'Arkham & the Blasted Heath' },
  dusk_on_the_hills: { title: 'Dusk on The Hills', realm: 'Dunwich & the Round Hills' },
  salty_fog: { title: 'SaltyFog', realm: 'Innsmouth & Devil Reef' },
  candlelit_dissonance: { title: 'Candlelit Dissonance', realm: 'Providence & Kingsport' },
  watchful_wind: { title: 'Watchful Wind', realm: 'Vermont Hills' },
  glacial_desolation: { title: 'Glacial Desolation', realm: 'Mountains of Madness' },
  cold_stone_hall: { title: 'Cold Stone Hall', realm: 'Pnakotus' },
  subterranean_drips: { title: 'Subterranean Drips', realm: "K'n-yan & N'kai" },
  descente_hypnotique: { title: 'Descente Hypnotique', realm: 'The Seventy Steps of Light Slumber' },
  cavernous_tail: { title: 'Cavernous Tail', realm: 'Cavern of Flame, the 700 Steps of Deeper Slumber' },
  wavering_pads: { title: 'Wavering Pads', realm: 'Dreamlands' },
  submerged_city: { title: 'Submerged City', realm: "Mu & R'lyeh" },
  remote_arpeggio: { title: 'Remote Arpeggio', realm: 'Yuggoth' },
  vazio_cosmico: { title: 'Vazio Cósmico', realm: 'Beyond the Gate' },
} as const;
export type RealmTrackId = keyof typeof REALM_TRACKS;
export const REALM_TRACK_IDS = Object.keys(REALM_TRACKS) as RealmTrackId[];

/** Where a track's file is, beside the page (public/music/realms/<id with dashes>.mp3). */
export const realmFile = (id: RealmTrackId): string => `music/realms/${id.replace(/_/g, '-')}.mp3`;

const BY_REGION: Readonly<Record<string, RealmTrackId>> = {
  hub: 'silent_hours',
  arkham: 'heathwind',
  dunwich: 'dusk_on_the_hills',
  innsmouth: 'salty_fog',
  providence: 'candlelit_dissonance',
  vermont: 'watchful_wind',
  mountains: 'glacial_desolation',
  pnakotus: 'cold_stone_hall',
  kn_yan: 'subterranean_drips',
  dreamlands: 'wavering_pads',
  rlyeh: 'submerged_city',
  yuggoth: 'remote_arpeggio',
  beyond: 'vazio_cosmico',
};

/** The way into the Dreamlands (data/dungeons.ts `slumber`): its own two tracks, by where on the stairs the investigator is. */
const STAIRS: Readonly<Record<string, RealmTrackId>> = {
  threshold: 'descente_hypnotique', light_1: 'descente_hypnotique', light_2: 'descente_hypnotique',
  cavern: 'cavernous_tail', deep_1: 'cavernous_tail', deep_2: 'cavernous_tail', deep_3: 'cavernous_tail', deep_4: 'cavernous_tail', deep_5: 'cavernous_tail', deep_6: 'cavernous_tail', deeper: 'cavernous_tail',
};

/** The track of the realm the investigator is in, or of the stairs if they are on them; none in the arena or at sea. */
export function realmTrackOf(region: string | null | undefined, dungeon?: string, room?: string): RealmTrackId | null {
  if (dungeon === 'slumber' && room && STAIRS[room]) return STAIRS[room];
  return (region && BY_REGION[region]) || null;
}

export const REALM_MUSIC = {
  /** Loudness: a track's body is brought to this RMS (dBFS), and no peak above the ceiling (linear). Measured at the speakers (round 28b): −27 came out about 2.5 dB under the ambience (averaged over 25 s) and was not noticed; −19 came out 5 dB over it, as loud as the title theme; −23 came out level with it; −21 (chosen) comes out about 2 dB over it and 5 dB under the title theme, so it sits in the world and wears slowly. */
  target: -21,
  ceiling: 0.8,
  level: 1, // the music setting's bus, times this
  /** Loop points: the body is where a half second's level reaches this share of the track's median, so the seam falls between two steady stretches, not in a fade. */
  steady: 0.85,
  window: 0.5, // seconds per level reading
  overlap: 10, // seconds a pass gives way to the next (equal power); shorter when the body is
  least: 24, // seconds of body below which the whole file is looped by a shorter crossfade
  change: 6, // seconds one realm's track takes to give way to the next
  fight: 2.5, // seconds it takes to give way to a boss's score, and to come back
  hushTo: 0.1, // the share left of it while the ground has gone quiet before a horror (the bed keeps 6%)
  /** A level that breathes: it leans away by up to `depth` and back every `period` seconds, so a loop of four minutes is not heard as one. */
  swell: { period: 97, depth: 0.14 },
  retry: 45, // seconds before a file that failed to load is asked for again
  keep: 2, // decoded tracks held in memory (the one sounding and the one coming)
};
