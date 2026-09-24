import { describe, expect, it } from 'vitest';
import { ANOMALY, ANOMALY_HUES, buildPalette, gradeTint, rgbToHsv } from '../src/render/palette';

const anomalies = Object.values(ANOMALY);
const isAnomalyShade = (c: readonly number[]): boolean =>
  anomalies.some((a) => Math.abs(rgbToHsv([c[0], c[1], c[2]])[0] - rgbToHsv(a)[0]) < 0.02);

describe('palette', () => {
  const palette = buildPalette();

  it('has at most 64 colours', () => {
    expect(palette.length).toBeLessThanOrEqual(64);
  });

  it('contains the three anomaly colours exactly', () => {
    for (const a of anomalies) expect(palette).toContainEqual(a);
  });

  it('keeps everything except anomaly shades desaturated', () => {
    for (const c of palette) {
      if (rgbToHsv(c)[1] > 0.55) expect(isAnomalyShade(c)).toBe(true);
    }
  });

  it('grades shadows cold grey-green and lights warm bone, both at low saturation, and its ramp follows', () => {
    const [cold, warm] = [gradeTint(0), gradeTint(1)];
    expect(cold[1]).toBeGreaterThan(cold[2]); // green over blue over red
    expect(cold[2]).toBeGreaterThan(cold[0]);
    expect(warm[0]).toBeGreaterThan(warm[1]); // red over green over blue
    expect(warm[1]).toBeGreaterThan(warm[2]);
    for (const c of [cold, warm]) expect(rgbToHsv(c)[1]).toBeLessThan(0.3);
    const [dark, light] = [palette[4], palette[20]]; // the ramp runs from index 0 (black) to 23
    expect(dark[1]).toBeGreaterThan(dark[0]);
    expect(light[0]).toBeGreaterThan(light[2]);
  });

  it('knows the anomaly hues', () => {
    expect(ANOMALY_HUES[0] * 360).toBeCloseTo(328, 0);
    expect(ANOMALY_HUES[1] * 360).toBeCloseTo(275, 0);
    expect(ANOMALY_HUES[2] * 360).toBeCloseTo(153, 0);
  });
});
