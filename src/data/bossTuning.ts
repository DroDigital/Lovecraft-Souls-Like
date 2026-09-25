/**
 * Boss numbers (spec §3E), re-exported by tuning.ts, which is at its 300-line limit: fights,
 * the attack library's effects, the reality hooks and the signature mechanics. Times in 60 Hz
 * frames and distances in metres unless a comment says otherwise.
 */

export const BOSS = {
  arena: 20, // arena radius where the site gives none
  margin: 8, // metres past its ring's edge a boss still holds the investigator...
  grace: 150, // ...and frames it waits for them to come back from beyond that before it gives up
  rim: 2.5, // metres inside the ring's edge a boss keeps to
  evadeRange: 3.5, // metres (past its body) inside which a quick foe may slip a blow...
  evadeEvery: 75, // ...and frames between its tries
  minions: 3, // summons alive at once per summoner
  summonRing: [2.5, 4.5] as const, // a summon rises this far from its summoner
  teleport: [3.5, 8] as const, // a teleport lands this far from its target
  gazeRate: 0.025, // gaze buildup per frame of a gaze in sight: half a gaze's worth...
  gazeDecay: 0.0015, // ...and it ebbs this much a frame with none on the investigator: three gazes close together fill it
  gazeSanity: 12, // a full gaze: this much sanity, and a stagger
  darkFrames: 420, // a darkness attack keeps the arena dark this long
  boltLife: 240, // frames before a bolt gutters out, whatever its range
  gravity: 12, // m/s² on lobbed bolts
  monoliths: 5, // standing stones an arena of monoliths raises...
  monolithShare: 0.5, // ...on a ring at this share of its radius...
  monolith: [1.8, 7] as const, // ...each this wide and tall: cover from a gaze
};

/** The reality hooks (spec §3E), live while an engaged boss's phase lists them. */
export const REALITY = {
  ease: 1 / 90, // darkness, flood and warp move toward their targets by this much a frame
  darkLantern: 0.45, // full darkness shrinks the lantern's reach by this fraction and puts out the moon
  floodSlow: 0.35, // full flood slows the investigator by this fraction
  floodDepth: 0.7, // metres the water rises
  warpDrift: 0.3, // rad/s the camera drifts at full warp
  warpHz: 0.13,
  reconnectEdge: 0.8, // metres inside the arena's edge where the room rewires...
  reconnectIn: 2.5, // ...and how far inside the opposite edge the investigator comes back
  decoys: 2, // alive at once per boss
  decoyEvery: [360, 540] as const,
  decoyLife: 900,
  skipEvery: [360, 540] as const, // a time skip...
  skipLead: 8, // ...lands with the boss this many frames from its blow
  swapFirst: 360, // the first body theft...
  swapEvery: [600, 840] as const, // ...and the gap between the next
  swapFrames: 180, // the body is not the investigator's own this long
  swapReach: 1.8, // the thief swings once the body stands this close to its foe
  lamps: 4, // light sources an arena of lamps holds
  lampRadius: 6, // what a lit lamp lights
  lampReach: 2.5, // the investigator relights a lamp this close
  inLight: 1.5, // damage a light-bound boss takes inside a lit lamp's reach...
  inDark: 0.1, // ...and outside every one
  lightBurn: 12, // hp/s it loses while it stands in the light
  petrifyRate: 1 / 240, // petrification per frame in a petrifying boss's sight: stone in four seconds...
  petrifyDecay: 1 / 300, // ...and it wears off this fast out of sight
  petrifyRange: 45,
  platforms: 5, // hidden platforms round the arena (and one at its heart)...
  platformRadius: 2.6,
  platformInsight: 1, // ...there for those with this much insight
  voidTick: 30, // off the platforms the void hurts every this many frames...
  voidDamage: 8, // ...this much...
  voidSanity: 1, // ...and takes this much sanity
};

/** The Colour Out of Space: it heals by draining the world's colour. */
export const COLOUR = {
  heal: 30, // hp/s while the world still has colour to give
  drain: 1 / 75, // the world's saturation lost per second of healing
};

/** The Dunwich Horror: unseen until the Powder of Ibn Ghazi, finished by the incantation. */
export const DUNWICH = {
  powder: 3, // doses Armitage's sprayer holds
  reveal: 900, // frames the powder shows it
  reach: 14, // metres: the powder carries this far
  chantRange: 40, // the incantation works within this distance
};

/** Cthulhu: it cannot be killed. The Alert rams it; it bursts, reforms, and R'lyeh sinks. */
export const CTHULHU = {
  shipShare: 0.8, // the Alert comes in at this share of the arena's radius
  helm: 5, // metres: the investigator takes the helm this close to it
  sail: 14, // m/s, straight at Cthulhu
  ram: 3, // metres beyond its body where the bows strike
  burst: 150, // frames from the ram until it reforms and R'lyeh sinks
};

/** Hastur: its name flickers as sanity falls in its realm, and the third time calls it. */
export const HASTUR = {
  region: 'yuggoth',
  names: 3,
  rise: 12, // metres ahead of the investigator where it rises
};

/** Shub-Niggurath: its spawning roots bear the Thousand Young until they are destroyed. */
export const SHUB = {
  roots: 4,
  share: 0.55, // on a ring at this share of the arena's radius
  hp: 700, // each root's
  every: 360, // frames between births at each root
  young: 6, // alive at once, the most the roots bear
  shielded: 0.2, // what it takes of each blow while any root stands
};

/** Yog-Sothoth: its iridescent spheres are gates, and the arena leaps between them. */
export const YOG = {
  spheres: 5,
  share: 0.7,
  touch: 1.8, // metres: a sphere this close takes the investigator through
  leap: [540, 780] as const, // frames between the arena's leaps
  height: 1.6, // metres the spheres float
};

/** Nyarlathotep: its avatars watch; its final form borrows the movesets of bosses slain. */
export const NYARLATHOTEP = {
  copies: 6, // attacks its final form borrows
  watch: 240, // frames an avatar stands watching after a region boss falls...
  watchAt: 9, // ...this far from the investigator
};

/** Azathoth: blind and invulnerable, it hears; the fight is outlasting the piping. */
export const AZATHOTH = {
  survive: 5400, // frames of piping to outlast (its health bar is the song, draining)
  hear: { shot: 45, sprint: 28, dodge: 20, attack: 16, walk: 7 }, // metres each noise carries
  windup: 45, // frames from the sound to the blast where it was heard
  rest: 60, // frames after a blast before it can hear again
  blast: { radius: 3.5, life: 70, tick: 20, damage: 40 },
};
