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
- Phase 1: The training dummy and the Deep One are placeholder primitive figures with a simple chase/attack brain (`placeholders.ts`, `brain.ts`). Phase 2's registry, sprites and archetypes replace them. The player is a tweened-primitive investigator.
- Phase 1: Moves are data (`moves.ts`): 60 Hz frame windows for hits, i-frames, parry, cancel and interrupt. Each combatant owns a moveset, and poses are derived from those fields.
- Phase 1: Controls follow Elden Ring on PC: LMB light, Shift+LMB heavy, RMB block, Shift+RMB parry, Space dodge, F revolver, Q lock-on, ←/→ or a mouse flick to switch. The pad uses the Souls layout.
- Phase 1: Dodge button, Dark Souls style: released within 14 frames it rolls toward the stick (or backsteps with no direction), held longer it sprints. The dodge fires on release.
- Phase 1: Parry is its own action (8-frame window, frontal melee only). The revolver interrupts inside an attack's `interrupt` wind-up. Both leave the foe `parried`, and the next hit is a ×2.5 riposte.
- Phase 1: "Hitting zero causes a guard break" applies to blocked hits that empty stamina. Spending on an action only needs stamina above zero (Dark Souls rule). Enemies have no stamina.
- Phase 1: Lock-on score = distance + 12 m/rad × |horizontal angle from the camera forward|. A held lock breaks beyond 27 m (2 m hysteresis) or after 0.5 s out of sight.
- Phase 1: Hitstop freezes only the attacker and the victim (per entity), 2–4 frames from move data. The event bus dispatches synchronously.
- Phase 1: Only one Echo drop exists; dying again before touching it loses it (Souls rule). Drops glow Void Green: Echoes are eldritch, and colour means wrong.
- Phase 1: The training dummy is immortal (hp floors at 1 and refills after 3 s without damage). The Deep One's kill pays 150 Echoes.
- Phase 1: The camera boom hangs 0.45 m over the right shoulder and tilts down on close lock targets, so the target isn't hidden behind the player.
- Phase 1: The Elder Sign is only the respawn point for now; resting, discovery and fast travel are Phase 4.
- Phase 1: The arena is the default page; the Phase 0 look test moved to `?look`, and `?debug` exposes `window.game` for scripted checks.
