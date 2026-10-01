/**
 * The look of the game's moments (playtest round 20): what a slain foe's Echoes do on their way to the
 * investigator (render/echoFx.ts, echoPath.ts), and the weight a blow has where it lands
 * (render/impactFx.ts). Lengths in metres, times in seconds.
 */

/** A foe's bounty comes away from its body as wisps, hangs a moment, then is drawn into the investigator. */
export const ECHO_FX = {
  wisps: [3, 12] as const, // fewest and most it is parted into: the fewest for a scrap, one more for each 1.6 doublings of Echoes
  doubling: 1.6,
  rise: [0.55, 1] as const, // seconds a wisp unspools upward out of the body...
  hold: [0.1, 0.5] as const, // ...and hangs there, bobbing, before it is drawn
  lift: [1.1, 2.2] as const, // metres a second it leaves the body at, slowing as it rises
  sway: 0.4, // metres a second it circles about where it left, while it rises
  speed: [2.5, 13] as const, // metres a second it is drawn at: at first, and at the most
  quicken: 9, // metres a second, each second
  turn: 5.5, // how sharply it follows its aim: the share of the way to it made good each second
  spiral: 3.2, // metres a second it turns from a straight line, easing as it nears
  arrive: 0.5, // metres from the chest that takes it in
  give: 4.5, // seconds drawn before it is taken in wherever it is
  far: 60, // metres: left this far behind (a long journey) it is taken in at once
  chest: 1.25, // metres above the feet: where the investigator takes it in
  trail: 0.8, // motes it drops a frame (at 60 a second)
  gap: 0.05, // seconds between the sounds of one gathering
};

/** The weight of the investigator's blows as they land (playtest round 20: render/audio/impact.ts and render/impactFx.ts). */
export const IMPACT = {
  weight: { base: 0.5, damage: 0.35, full: 50, heavy: 0.2, stagger: 0.1, riposte: 0.25, kill: 0.3, most: 1.4 }, // a blow's weight: where it starts, what its damage adds (up to `full` of it), what each kind of blow adds; never past `most`
  big: 0.9, // metres of body radius from which a foe is big: a kill of one booms
  sparks: [6, 18] as const, // fewest and most sparks a blow throws, by its weight
  chunks: [2, 7] as const, // and the ichor it flings
  kick: { push: 0.14, shake: 0.025, seconds: 0.22 }, // the camera's: metres it is pushed toward the blow at a weight of 1, how much it is shaken, and how long it takes to settle
  finisher: 3, // frames more hitstop for a blow that kills or lands as a riposte
};

/** Flasks of lamp oil (round 29): the glass in flight, its trail, the burst where it lands and the fire it leaves. Render only. */
export const FLASK = {
  trail: { embers: 34, smoke: 16 }, // particles a second behind a flask in flight
  burst: { fire: 40, ring: 24, shards: 16, smoke: 9, flash: 0.35 }, // particles at a landing; seconds of its flash
  fire: { tongues: 10, embers: 1.6, smoke: 0.5, glow: 2.2, fade: 0.25 }, // a burning pool: tongues, embers and smoke a second per m²; its halo (× its radius); the last share of its life it dies down in
  colour: { flame: [1, 0.55, 0.16], core: [1, 0.86, 0.45], glass: [0.5, 0.62, 0.5], smoke: [0.26, 0.24, 0.22] } as const,
  capacity: 8, // flasks drawn at once
};

/** The lantern's shadows (round 34, render/lanternShadow.ts): where the moon casts none (under a roof, in a dungeon, a moon below the horizon), one depth map is drawn from the investigator's chest in the way the camera looks, of the solid things about them. Lengths in metres. */
export const LANTERN_SHADOW = {
  size: 1024, // texels a side
  fov: 150, // degrees the map looks through: outside it a surface is lit (and the shadows fade out toward its edge)
  notch: (10 * Math.PI) / 180, // radians the map's aim steps by, and...
  hold: (17 * Math.PI) / 180, // ...how far the look must go from the aim held before it steps (round 35: so the shadows' edges do not crawl)
  near: 0.35,
  reach: 2, // how far past the lantern's own range the map looks
  height: 1.25, // above the investigator's feet that the map is drawn from: their chest, which is never inside a wall
  strength: 0.88, // the share of the lantern's light a shadow takes away (the rest leaks round: a wall is not black)
  bias: 0.06, // metres a surface is held from its own shadow, and 1 cm more for each metre from the lantern (a texel grows so)
  offset: 0.04, // metres a point is pushed off its surface along the normal before it is looked up
};

/** The lamps' shadows (round 35, render/lampShadows.ts): the nearest few torches, braziers and street lamps each cast. */
export const LAMP_SHADOWS = {
  count: 3, // lamps at a time
  size: 512, // texels a side
  fov: 150, // degrees, drawn from the flame toward the investigator
  near: 0.3,
  reach: 2, // metres past the lamp's own range the map looks
  strength: 0.85, // the share of that lamp's light a shadow takes
  bias: 0.08, // metres a surface is held from its own shadow
  offset: 0.05, // metres a point is pushed off its surface before it is looked up
  fade: 0.35, // seconds a lamp's shadow takes to come in
};

/** The moon's shadows (round 34, render/moonShadow.ts): one depth map drawn from the moon over the investigator. Lengths in metres. */
export const SHADOW = {
  size: 1024, // texels a side: with `range`, a texel is 7 cm
  range: 34, // half the width of ground the map covers about the investigator (the shadows fade out toward its edge)
  depth: 160, // how far the map looks along the moon's rays, about the investigator
  strength: 0.9, // the share of the moon's light a shadow takes away (the rest is the sky's, and what the land gives back)
  bias: 0.07, // metres a surface is held from its own shadow, more where it turns from the moon
  offset: 0.12, // metres a point is pushed off its surface along the normal before it is looked up
};
