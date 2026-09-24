import { describe, expect, it } from 'vitest';
import { ENTITIES } from '../src/data/registry';
import { CREATURE_PALETTES } from '../src/data/schema';
import { buildAssembly } from '../src/render/assemblies';
import { ANOMALY, CREATURE_COLORS, rgbToHsv, type Rgb } from '../src/render/palette';
import { GLOW, LIT } from '../src/render/sprites/raster';
import { buildAtlas, CELL, cellOrigin, drawSprite, SPRITE_STATES, spriteKey, spriteRecipes } from '../src/render/sprites/atlas';

const atlas = buildAtlas();
const recipes = spriteRecipes();

/** RGBA pixels of one atlas cell. */
function cellPixels(cell: number): Uint8Array {
  const [cx, cy] = cellOrigin(cell);
  const out = new Uint8Array(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) out.set(atlas.data.subarray(((cy + y) * atlas.width + cx) * 4, ((cy + y) * atlas.width + cx + CELL) * 4), y * CELL * 4);
  return out;
}

const opaque = (px: Uint8Array): number => px.filter((_, i) => i % 4 === 3 && px[i] > 0).length;

describe('sprite atlas', () => {
  it('holds every sprite entity and every sprite variant', () => {
    for (const d of ENTITIES.filter((e) => e.sprite)) expect(atlas.frames.has(spriteKey(d.id)), d.id).toBe(true);
    expect([...atlas.frames.keys()].sort()).toEqual(recipes.map((r) => r.key).sort());
    expect(atlas.width).toBeLessThanOrEqual(4096);
    expect(atlas.height).toBeLessThanOrEqual(4096);
  });

  it.each(recipes.map((r) => [r.key, r] as const))('%s: 2–4 visible frames per state, and it animates', (key) => {
    const frames = atlas.frames.get(key)!;
    for (const s of SPRITE_STATES) {
      expect(frames[s].length, s).toBeGreaterThanOrEqual(2);
      expect(frames[s].length, s).toBeLessThanOrEqual(4);
      for (const cell of frames[s]) expect(opaque(cellPixels(cell)), `${s} frame`).toBeGreaterThan(40);
    }
    const [a, b] = frames.attack.map(cellPixels);
    expect(a).not.toEqual(b);
  });

  it('is deterministic', () => {
    const r = recipes[0].recipe;
    expect(drawSprite(r, 'attack', 1).px).toEqual(drawSprite(r, 'attack', 1).px);
  });

  it('only glow markings carry anomaly colour; everything else stays muted', () => {
    const hues = Object.values(ANOMALY).map((x) => rgbToHsv(x)[0]);
    const bad: string[] = [];
    for (let i = 0; i < atlas.data.length && bad.length < 5; i += 4) {
      const a = atlas.data[i + 3];
      if (a === 0) continue;
      const [h, s] = rgbToHsv([atlas.data[i] / 255, atlas.data[i + 1] / 255, atlas.data[i + 2] / 255] as Rgb);
      const ok = a === GLOW ? hues.some((x) => Math.abs(x - h) < 0.02) : a === LIT && s < 0.6;
      if (!ok) bad.push(`pixel ${i / 4}: alpha ${a}, hue ${h.toFixed(3)}, saturation ${s.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });

  it('keeps creature palettes desaturated', () => {
    for (const p of CREATURE_PALETTES) for (const c of Object.values(CREATURE_COLORS[p])) expect(rgbToHsv(c)[1], p).toBeLessThan(0.55);
  });
});

describe('colossus assemblies', () => {
  it.each(ENTITIES.filter((d) => d.assembly).map((d) => [d.id, d.assembly!] as const))('%s builds and animates', (_, recipe) => {
    const asm = buildAssembly(recipe, 1);
    let meshes = 0;
    asm.root.traverse((o) => void ('isMesh' in o && meshes++));
    expect(meshes).toBeGreaterThan(1);
    expect(() => asm.animate(1.5, 0.5, 0.2)).not.toThrow();
  });
});
