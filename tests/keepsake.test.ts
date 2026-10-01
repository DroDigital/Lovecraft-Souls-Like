import { describe, expect, it } from 'vitest';
import { scaleFor } from '../src/ui/keepsake';

describe('what is kept (round 26)', () => {
  it('a low-res picture is kept about 1600 wide, whole-number times, and a wide one as it is', () => {
    expect(scaleFor(400)).toBe(4);
    expect(scaleFor(1600)).toBe(1);
    expect(scaleFor(3000)).toBe(1);
    expect(scaleFor(0)).toBeGreaterThan(0);
  });
});
