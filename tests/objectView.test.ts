import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { PROP_KINDS } from '../src/data/regions';
import type { HouseStyle } from '../src/data/regionFeatures';
import { housePieces } from '../src/render/houseMesh';
import { propPieces } from '../src/render/propShapes';
import { propAt } from '../src/world/props';
import { auditObject } from './objectAudit';

/**
 * What the eye meets of a prop or a house seen from all about (round 21), by the same rays as the
 * dungeons': no back of a face first (a hole: the underside of a roof's eaves was open sky, a rock's
 * seam was torn along its length), and no face of another look within 12 cm before or behind
 * another's. What stands off a wall (a house's frames, glass and door) is drawn nearer than it is
 * (the materials 'trim' and 'pane'), so it is set apart. The smallest props (headstones, fire pits,
 * bushes, rails) hold details finer than that, and the roofs of stone houses a hollow lid, and stand
 * outside this.
 */
const SMALL: ReadonlySet<string> = new Set(['grave', 'firepit', 'bush', 'fence', 'altar']);
const STYLES: readonly HouseStyle[] = ['clapboard', 'brick', 'hovel'];
const RELIEF: ReadonlySet<string> = new Set(['trim', 'pane']);

describe('what the eye meets of a prop or a house (round 21)', () => {
  it('houses, rocks, trees, pillars and the realms landmarks show no hole and no fight', () => {
    const found: string[] = [];
    let objects = 0;
    for (const kind of PROP_KINDS.filter((k) => !SMALL.has(k))) {
      for (const style of kind === 'house' ? STYLES : [undefined]) {
        for (let seed = 1; seed <= 3; seed++) {
          const p = propAt(kind, 0, 0, 0, createRng(seed * 977 + kind.length * 31), 0, undefined, style);
          const pieces = kind === 'house' ? housePieces(p, [0.6, 0.6, 0.58]) : propPieces(p, [0.6, 0.6, 0.58]);
          const parts = pieces.map((q, i) => ({ tag: `${kind}${style ? `/${style}` : ''}/${q.mat}${i}`, tex: RELIEF.has(q.mat) ? `${q.mat}+` : q.mat, geo: q.geo }));
          objects++;
          for (const f of auditObject(parts)) if (!(kind === 'tree' && f.key.startsWith('leaf:tree'))) found.push(`${kind}${style ? `/${style}` : ''} seed ${seed}: ${f.kind} ${f.key}`); // a tree's leaves are round clumps that cross one another: their surfaces meet along a line, they do not lie one over another
        }
      }
    }
    expect(objects).toBeGreaterThan(40);
    expect(found).toEqual([]);
  }, 120000);
});
