# Decisions

One line per judgment call, newest last.

- Phase 0: The spec arrived as RTF at `/SPEC.md`. It is converted to Markdown at `docs/SPEC.md` with the text unchanged.
- Phase 0: Added `@types/three` (dev, types only). `three` ships no TypeScript types and strict TS needs them.
- Phase 0: "Every effect responds to the slider": each effect has a `[calm, mad]` ramp. §2 defines warp, displacement and lens; pixel crush, snap grid, affine exaggeration, fog distance, isolation strength and dither spread got small ramps.
- Phase 0: The FX intensity cap clamps stress (`min(1 − sanity/100, cap)`) for every sanity effect. It is a debug slider until the Phase 6 settings menu.
- Phase 0: The post pass renders into a 400×225 canvas that CSS upscales nearest-neighbour (`image-rendering: pixelated`), letterboxed to 16:9.
- Phase 0: Colours are display sRGB end to end (`ColorManagement` off, custom `ShaderMaterial`s only), so palette hex values are exact on screen.
- Phase 0: The quantisation palette has 58 colours: a 24-step bone/sepia ramp, 8 sea-grey, 8 rust, and 6 shades per anomaly colour. The post shader picks the nearest colour.
- Phase 0: Chromatic split samples are colour-isolated per channel before recombining, so low sanity leaks colour fringes into the world.
- Phase 0: `anomalyProximity` = camera distance to the test anomaly (1 at 4 m, 0 at 30 m). Phase 3's FX controller takes this over.
- Phase 0: Vertex displacement is zero within 7 m of the camera and full at 32 m, keeping combat range readable.
- Phase 0: Render and FX numbers also live in `src/data/tuning.ts`, so every tunable is in one place.
- Phase 0: Test-scene camera is a debug orbit (auto-orbit with breathing radius, drag/wheel, O). Phase 1's third-person camera replaces it.
