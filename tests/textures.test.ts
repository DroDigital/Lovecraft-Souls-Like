import { describe, expect, it } from 'vitest';
import { rgbToHsv } from '../src/render/palette';
import { generateTexture, TEXTURE_KINDS, TEXTURE_SIZE } from '../src/render/textures';

const S = TEXTURE_SIZE;
const lumaAt = (px: Uint8Array, x: number, y: number): number => {
  const i = (((y + S) % S) * S + ((x + S) % S)) * 4;
  return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
};

/** Mean luma step between horizontal and vertical neighbours, across the wrap seam or inside. */
function meanStep(px: Uint8Array, seam: boolean): number {
  let sum = 0;
  for (let k = 0; k < S; k++) {
    if (seam) {
      sum += Math.abs(lumaAt(px, S - 1, k) - lumaAt(px, 0, k)) + Math.abs(lumaAt(px, k, S - 1) - lumaAt(px, k, 0));
    } else {
      for (let j = 0; j < S - 1; j++) {
        sum += (Math.abs(lumaAt(px, j, k) - lumaAt(px, j + 1, k)) + Math.abs(lumaAt(px, k, j) - lumaAt(px, k, j + 1))) / (S - 1);
      }
    }
  }
  return sum / (2 * S);
}

describe.each(TEXTURE_KINDS)('%s texture', (kind) => {
  const px = generateTexture(kind, 1);

  it('is 64×64 opaque RGBA and deterministic', () => {
    expect(px.length).toBe(S * S * 4);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
    expect(generateTexture(kind, 1)).toEqual(px);
    expect(generateTexture(kind, 2)).not.toEqual(px);
  });

  it('has visible detail', () => {
    const lumas = Array.from({ length: S * S }, (_, i) => lumaAt(px, i % S, Math.floor(i / S)));
    const mean = lumas.reduce((a, b) => a + b, 0) / lumas.length;
    const sd = Math.sqrt(lumas.reduce((a, b) => a + (b - mean) ** 2, 0) / lumas.length);
    expect(sd).toBeGreaterThan(0.02);
  });

  it('tiles without a visible seam', () => {
    expect(meanStep(px, true)).toBeLessThan(meanStep(px, false) * 3 + 0.02);
  });

  it('stays desaturated, so only anomalies carry colour', () => {
    for (let i = 0; i < px.length; i += 4) {
      expect(rgbToHsv([px[i] / 255, px[i + 1] / 255, px[i + 2] / 255])[1]).toBeLessThan(0.6);
    }
  });
});
