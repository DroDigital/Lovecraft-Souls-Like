/**
 * How soaked the ground is, 0 dry to 1 after hard rain (round 34): set each frame by the weather (render/weather.ts),
 * read by the world shader as its `uWet` (the one object is the uniform) and by the footsteps, which splash in it.
 */
export const wetness = { value: 0 };
