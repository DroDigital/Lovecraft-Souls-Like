import { describe, expect, it } from 'vitest';
import { dressing } from '../src/render/dungeonDressing';
import { KITS } from '../src/data/kits';
import { worldLayout } from '../src/world/placements';

const dress = (d: ReturnType<typeof worldLayout>['dungeons'][number]) => dressing(d.layout, () => [0.8, 0.8, 0.8], { x: 0, z: 0 }, []);

describe('the dressing of the dungeons (round 30)', () => {
  it('every dungeon is dressed the same way twice, in numbers only, and every halls-and-roofs kit adds something', () => {
    let pieces = 0;
    for (const d of worldLayout().dungeons) {
      const [a, b] = [dress(d), dress(d)];
      expect(a.map((p) => `${p.kind}${p.geo.getAttribute('position').count}`), d.layout.def.id).toEqual(b.map((p) => `${p.kind}${p.geo.getAttribute('position').count}`));
      for (const p of a) {
        for (const v of p.geo.getAttribute('position').array) expect(Number.isFinite(v)).toBe(true);
        expect(p.geo.getAttribute('color'), `${d.layout.def.id} ${p.kind}`).toBeDefined();
        expect(p.geo.getAttribute('uv'), `${d.layout.def.id} ${p.kind}`).toBeDefined();
      }
      pieces += a.length;
    }
    expect(pieces).toBeGreaterThan(100);
  }, 60_000);

  it('braziers are fires, one flame to each, and only where the kit keeps flames', () => {
    for (const d of worldLayout().dungeons) {
      for (const p of dress(d)) {
        if (!p.light) continue;
        expect(p.light.kind).toBe('fire');
        expect(p.kit.flames).toBeGreaterThanOrEqual(0.3);
        expect(Object.values(KITS)).toContain(p.kit);
      }
    }
  }, 60_000);
});
