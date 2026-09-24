/**
 * Boss numbers (spec §3E), re-exported by tuning.ts, which is at its 300-line limit: fights,
 * the attack library's effects, the reality hooks and the signature mechanics. Times in 60 Hz
 * frames and distances in metres unless a comment says otherwise.
 */

export const BOSS = {
  arena: 20, // arena radius where the site gives none
  minions: 3, // summons alive at once per summoner
  summonRing: [2.5, 4.5] as const, // a summon rises this far from its summoner
  teleport: [3.5, 8] as const, // a teleport lands this far from its target
  gazeRate: 0.025, // gaze buildup per frame of a gaze in sight: half a gaze's worth...
  gazeDecay: 0.0015, // ...and it ebbs this much a frame with none on the investigator: three gazes close together fill it
  gazeSanity: 12, // a full gaze: this much sanity, and a stagger
  darkFrames: 420, // a darkness attack keeps the arena dark this long
  boltLife: 240, // frames before a bolt gutters out, whatever its range
  gravity: 12, // m/s² on lobbed bolts
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
