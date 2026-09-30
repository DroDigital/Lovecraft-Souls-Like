/**
 * Tunable numbers for the world's own life (re-exported by tuning.ts; split from playTuning.ts in
 * playtest round 24): how creatures sense and hunt, the small lives, and lightning.
 */

/** How creatures sense and hunt (playtest round 8, systems/perception.ts, brain.ts, tactics.ts). Metres and seconds. */
export const AI = {
  sure: 12, // what a creature sees in its sight cone this close it knows at once...
  notice: 1.1, // ...beyond, a glimpse takes this long to be sure of (longer the farther, at the edge of its sight about twice)
  side: 6, // beside or behind it, it glimpses only what is this close, slowly
  forget: 6, // an unconfirmed stir fades over this long
  noise: { walk: 5, sprint: 14, roll: 10, blow: 12, shot: 34 }, // how far the investigator's sounds carry...
  muffle: 0.5, // ...a wall between halving them
  call: 16, // a creature that takes up the hunt rouses its kind this far off (those within half come at once)
  track: 1.6, // hunting, it keeps its quarry in sight this far beyond its sight's reach (× its `aggro`)
  lose: 1.5, // out of sight and hearing this long, a hunter goes to look where it last knew its quarry...
  search: 7, // ...and looks about there this long before it goes home
  stalk: 0.55, // share of its pace a stirred creature closes in at
  lookEvery: [3, 7] as const, // an idle creature that keeps its post looks about every so often
  amble: 0.35, // share of its pace a foe on its rounds walks at (round 18: roam.ts; how far, its archetype's `roam`)...
  linger: [3, 9] as const, // ...and seconds it lingers, looking about, before it moves on
  tokens: 2, // hunters closing in to strike the investigator at once; the rest keep off, circling, waiting their turn
  wait: 4.5, // how far the waiting ones keep (at least this far beyond their reach)
  space: 1.1, // hunters keep this far apart (beyond their bodies)
  punish: 0.5, // a hunter strikes into an opening (a swallow, a blow's recovery, a stagger) once this share of its cooldown has passed
  fallBack: 0.6, // seconds a skirmisher falls back after its blow
  stuck: 0.5, // pushing this long without getting anywhere...
  detour: 0.7, // ...it steps aside this long to get round what blocks it
};

/** The world's small lives (playtest round 18: data/fauna.ts gives each its size, pace and nerve; render/critterLife.ts their ways). */
export const FAUNA = {
  near: 1, // chunks about the investigator's own whose critters live (a 3 × 3 block)
  draw: 70, // metres: drawn this near the lens
  flight: 6, // seconds a startled bird is on the wing before the dark has it...
  goneFor: [18, 45] as const, // ...and seconds before a startled critter may come back...
  backBeyond: 24, // ...then only while the investigator is this far from its haunt
  fade: 1, // seconds it takes to show again
  shot: 32, // metres: a shot sends off every bird and beast this near it...
  blow: 10, // ...a blow struck, those this near
  cryGap: 0.5, // seconds: startled together, only one cries
  fog: 0.4, // share of the world's fog they take: a bird against the night sky is a dark shape, not a pale fleck like a star
  pass: 16, // seconds a flock or a great winged thing takes to cross the sky (data/fauna.ts SKY_VISITORS)...
  passBy: [10, 24] as const, // ...passing this far from the investigator at its nearest, low enough to cross the horizon's haze
};

/** Lightning where storms roll (round 18: render/lightning.ts): now and then the sky flashes, and the thunder follows. */
export const LIGHTNING = {
  every: { dunwich: [35, 100], innsmouth: [50, 140], rlyeh: [20, 60], mountains: [70, 170] } as Readonly<Record<string, readonly [number, number]>>,
  flash: 0.45, // seconds of flicker
  light: 1.8, // how much it lights the world (added to the moon; the ambient takes half)...
  sky: 7, // ...brightens the sky's haze...
  mist: 0.3, // ...and the mist
  delay: [0.6, 3.2] as const, // seconds before the thunder: the farther the strike, the later and quieter
};

/** The night's turn and the weather (round 26; systems/clock.ts, systems/weather.ts): the night is one long night that turns, and the weather rolls over it. */
export const CLOCK = {
  night: 1080, // seconds for the night to turn (the gloaming, the deep of the night, the hour before a dawn that does not come) and begin again
  start: 0.03, // where in it a new journey opens: the gloaming, the windows lit and the lamplighter out
};

export const WEATHER = {
  calm: [150, 420] as const, // seconds of clear skies between spells
  spell: [110, 300] as const, // seconds a spell of rain or gale lasts
  ease: 12, // seconds for a spell to come on or pass
  // The kinds each region knows, by weight (the rest of the time it is clear): rain, a gale, the motes of the dream.
  regions: {
    arkham: { rain: 3, gale: 1 },
    dunwich: { rain: 2, gale: 2 },
    innsmouth: { rain: 3, gale: 2 },
    providence: { rain: 3 },
    vermont: { rain: 2, gale: 2 },
    mountains: { gale: 4 },
    pnakotus: { gale: 3 },
    rlyeh: { rain: 3, gale: 1 },
    dreamlands: { motes: 3 },
    yuggoth: { motes: 2 },
  } as Readonly<Record<string, Readonly<Partial<Record<'rain' | 'gale' | 'motes', number>>>>>,
  quiet: 0.35, // how much of the investigator's noise is lost in it (a rain hushes footsteps; a gale takes them): at its fullest
  rain: 420, // streaks of rain about the lens at its fullest
};

/** The sights that cross the dream (round 26; data/wanderers.ts, systems/wanderers.ts). */
export const WANDER = {
  every: 600, // frames between looks for a moment to send one
  chance: 0.22, // of a look that finds the ground clear
  from: [70, 105] as const, // metres from the investigator a file comes out of the dark at...
  pass: [18, 38] as const, // ...and passes them at, at the nearest
  apart: 2.1, // metres between one and the next in a file
  leave: 150, // metres the investigator may be off before it is gone
  stay: 300, // seconds it lasts at the most
};
