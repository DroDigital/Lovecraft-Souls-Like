import { describe, expect, it } from 'vitest';
import { worldLayout } from '../src/world/placements';
import { audit } from './rayAudit';

/**
 * What the eye meets in every dungeon (round 21; a recording showed flat near-black wedges across the
 * University Library's brick walls: the cellar's dark ceiling lay in the plane of the wall above it).
 * From spots in each room's open air, rays go out every way: none may meet the back of a face (a face
 * seen through) or leave a roofed room where a wall should be, and none may meet a face with another
 * of another look, facing the same way, within 12 cm behind it (the PS1's snapping moves a face's depth
 * by that much on a wall seen aslant, and whichever it puts nearer shows).
 */
describe('what the eye meets in a dungeon (round 21)', () => {
  it('no face is seen through, no wall has a hole, and no two faces of different looks fight', () => {
    const found = worldLayout().dungeons.flatMap((d) => audit(d, { azimuths: 24, elevations: [-30, -8, -3, 3, 8, 30], spots: 2 }));
    expect(found.map((f) => `${f.kind} ${f.dungeon}/${f.room}: ${f.key} ${f.at}`)).toEqual([]);
  }, 120000);
});
