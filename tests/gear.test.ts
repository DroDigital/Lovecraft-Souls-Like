/**
 * What the named wear (round 34): a recipe's `gear` is drawn over its upright, hunched or robed body, each piece changing the
 * picture, the same each time, and only on the bodies that carry it. The story's people have theirs.
 */
import { describe, expect, it } from 'vitest';
import { ENTITIES, variantOf } from '../src/data/registry';
import { GEAR, type Gear, type SpriteRecipe } from '../src/data/schema';
import { drawSprite } from '../src/render/sprites/atlas';

const BODIES = ['humanoid', 'robed', 'hunched'] as const;
const WORN_ON_THE_HIPS: readonly Gear[] = ['coat', 'tatters', 'chain']; // drawn over the hips: only the upright body has them in view
const recipe = (silhouette: (typeof BODIES)[number], gear?: readonly Gear[]): SpriteRecipe => ({ silhouette, palette: 'pallid', scale: 2, eyes: 2, seed: 5, ...(gear && { gear }) });
const differs = (a: Uint8Array, b: Uint8Array): number => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0);

describe('gear', () => {
  it.each(BODIES)('every piece changes what the %s body looks like, in each pose it is drawn in', (body) => {
    for (const g of GEAR) {
      if (body !== 'humanoid' && WORN_ON_THE_HIPS.includes(g)) continue;
      for (const [state, frame] of [['idle', 0], ['move', 1], ['attack', 1], ['hurt', 0]] as const) {
        const [bare, dressed] = [drawSprite(recipe(body), state, frame), drawSprite(recipe(body, [g]), state, frame)];
        expect(differs(bare.px, dressed.px), `${g} on ${body}, ${state}`).toBeGreaterThan(6);
      }
    }
  });

  it('is drawn the same each time', () => {
    const r = recipe('humanoid', ['tall', 'coat', 'chain', 'tatters']);
    expect(drawSprite(r, 'move', 1).px).toEqual(drawSprite(r, 'move', 1).px);
  });

  it('is on no body that cannot carry it (a variant that turns into something else leaves it behind), and only names pieces that exist', () => {
    for (const d of ENTITIES) {
      if (d.sprite?.gear) expect(BODIES, d.id).toContain(d.sprite.silhouette);
      for (const r of [d.sprite, variantOf(d, 'eldritch')?.sprite, variantOf(d, 'boss')?.sprite]) for (const g of r?.gear ?? []) expect(GEAR, `${d.id}: ${g}`).toContain(g);
    }
  });

  it('the story gives its people what they carry', () => {
    const worn = (id: string): readonly Gear[] => ENTITIES.find((e) => e.id === id)?.sprite?.gear ?? [];
    expect(worn('keziah_mason')).toContain('witch');
    expect(worn('nyarlathotep')).toEqual(expect.arrayContaining(['tall', 'coat', 'chain'])); // a tall man in a good coat, with a key on his watch chain
    expect(worn('dr_munoz')).toContain('pipes');
    expect(worn('terrible_old_man')).toEqual(expect.arrayContaining(['cane', 'beard']));
    expect(worn('hypnos')).toContain('halo');
    expect(worn('high_priest')).toContain('mask');
    const looks = new Set(['dr_munoz', 'hypnos', 'terrible_old_man', 'the_outsider', 'lilith'].map((id) => worn(id).join('+')));
    expect(looks.size).toBe(5); // five once-alike pale figures, five different ones
  });
});
