# CLAUDE.md

Lovecraftian open-world soulslike in retro 3D. **Spec: `docs/SPEC.md`.** At session start read it and this
file, then do only the phase named in the message. Log judgment calls in `docs/DECISIONS.md`.

## Commands
- `npm run dev`: Vite dev server. Phase 0 look test: keys 1–9 toggle effects, H hides the panel, drag/wheel/O orbit.
- `npm run check`: typecheck + Vitest. Must pass before every commit.
- `npm run build`: typecheck + production build into `dist/`.

## Folder map
- `src/core`: fixed 60 Hz loop with interpolation, rng, noise (later ecs, events, input).
- `src/render`: pipeline, post pass, world material, `shaders/`, palette, procedural textures, `fx.ts` (pure FX model).
- `src/data`: `tuning.ts` holds every number (later roster, entities by tier, archetypes, attacks, regions).
- `src/world`: heightfield, Phase 0 test scene.
- `src/ui`: debug panel, debug orbit camera.
- `tests/`: Vitest, runs in Node.
- `docs/`: SPEC.md, DECISIONS.md.

## Rules (spec §0, condensed)
- Do only the requested phase; never scaffold later ones. Plan in ≤15 lines, then execute without asking.
- Ambiguity: pick the simplest option that fits the spec, log one line in `docs/DECISIONS.md`, keep going.
- No file dumps or large diffs in chat. End each phase with a ≤10-line summary and a git commit.
- Surgical edits. Files under 300 lines with one responsibility each.
- Verify with `npm run check` and read only the failing output. Never open `node_modules/` or `dist/`.
- No asset files: textures, sprites, meshes and audio are generated in code.
- Creatures are data, not classes (15–30 lines each); boss phase scripts are data too.
- Deps: `three` (+ `@types/three`), `typescript`, `vite`, `vitest`. Ask before adding anything else.
- Simulation code (combat, stamina, sanity, AI, registry, streaming math) must not import Three.js.
- Out of scope: multiplayer, skeletal animation, imported models/textures, mobile.

## Render conventions
- Colours are display sRGB end to end (`ColorManagement` off); every material is a `ShaderMaterial`.
- World materials share one uniform set (`worldUniforms`). FX flow: `FxState → computeFx() → update*Uniforms()`.
- Sanity FX are `[calm, mad]` ramps in `tuning.ts`, blended by stress = min(1 − sanity/100, fx cap).
