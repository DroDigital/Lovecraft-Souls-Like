import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { LIGHTS } from '../src/data/tuning';
import { housePieces } from '../src/render/houseMesh';
import { propJob } from '../src/render/propMeshes';
import { LAMP_SLOTS } from '../src/render/shaders/world';
import { dungeonJob } from '../src/render/siteMeshes';
import { createWorldLights, type LightSpot } from '../src/render/worldLights';
import { worldUniforms } from '../src/render/worldMaterial';
import { worldLayout } from '../src/world/placements';
import type { Prop } from '../src/world/props';

const eye = new THREE.Vector3();
const lamps = worldUniforms.uLamps.value;
const lit = (): number => lamps.filter((l) => l.w > 0).length;
const glow = (i: number): number => worldUniforms.uLampColors.value[i].length();
const halos = (l: ReturnType<typeof createWorldLights>): number => (l.halos.geometry as THREE.InstancedBufferGeometry).instanceCount;
const row = (n: number, kind: LightSpot['kind'], step = 2): LightSpot[] => Array.from({ length: n }, (_, i) => ({ x: step * (i + 1), y: 0, z: 0, kind }));
const centre = (g: THREE.BufferGeometry): THREE.Vector3 => (g.computeBoundingBox(), g.boundingBox!.getCenter(new THREE.Vector3()));
const finish = (job: Generator<void, void>): void => {
  while (!job.next().done);
};

describe("the world's lights (render/worldLights.ts)", () => {
  it('the nearest spots light the world, the last of them fading out as the next comes into line', () => {
    const lights = createWorldLights();
    lights.add(1, row(20, 'window'));
    lights.update(eye, 0, null);
    expect(lamps.map((l) => l.x)).toEqual(row(LAMP_SLOTS, 'window').map((s) => s.x)); // nearest first
    const k = LIGHTS.kinds.window;
    expect(lamps[0].w).toBe(k.range);
    expect(glow(0)).toBeCloseTo(new THREE.Vector3(...k.color).length() * k.strength); // whole up close...
    expect(glow(LAMP_SLOTS - 1)).toBeGreaterThan(0);
    expect(glow(LAMP_SLOTS - 1)).toBeLessThan(glow(0) * 0.25); // ...the last nearly out, as the thirteenth would stand at nothing
    for (let i = 1; i < LAMP_SLOTS; i++) expect(glow(i)).toBeLessThanOrEqual(glow(i - 1) + 1e-9);
  });

  it('lights beyond reach stay dark but still glow; a chunk’s lights go with it; the lantern wears a halo', () => {
    const lights = createWorldLights();
    lights.add(1, [{ x: 5, y: 0, z: 0, kind: 'lamp' }, { x: 0, y: 0, z: LIGHTS.reach + 1, kind: 'lamp' }]);
    lights.add(2, row(3, 'fire', 10));
    lights.add(3, []);
    lights.update(eye, 0, null);
    expect(lit()).toBe(4);
    expect(halos(lights)).toBe(5);
    lights.update(eye, 0, new THREE.Vector3(0, 1, 0));
    expect(halos(lights)).toBe(6);
    lights.remove(2);
    lights.update(eye, 0, null);
    expect(lit()).toBe(1);
    expect(halos(lights)).toBe(2);
    lights.add(4, [{ x: 0, y: 0, z: LIGHTS.haloReach + 1, kind: 'fire' }]);
    lights.update(eye, 0, null);
    expect(halos(lights)).toBe(2); // too far to see
  });

  it('flames waver; windows and lamps burn steady', () => {
    const lights = createWorldLights();
    lights.add(1, [{ x: 2, y: 0, z: 0, kind: 'window' }, { x: 0, y: 0, z: 3, kind: 'fire' }, { x: 0, y: 0, z: -4, kind: 'lamp' }]);
    const seen = [0, 1, 2].map(() => [] as number[]);
    for (let t = 0; t < 3; t += 0.1) {
      lights.update(eye, t, null);
      seen.forEach((s, i) => s.push(glow(i)));
    }
    const spread = (s: number[]): number => Math.max(...s) / Math.min(...s);
    const flicker = (kind: LightSpot['kind']): number => (1 + LIGHTS.kinds[kind].flicker) / (1 - LIGHTS.kinds[kind].flicker);
    expect(spread(seen[0])).toBe(1);
    expect(spread(seen[1])).toBeGreaterThan(1.1);
    expect(spread(seen[1])).toBeLessThanOrEqual(flicker('fire'));
    expect(spread(seen[2])).toBeLessThanOrEqual(flicker('lamp'));
  });
});

describe('what reports a light', () => {
  it('a street lamp shines from its glass, a fire pit above its embers, a lit window half a metre out in front of it', () => {
    const house = (seed: number): Prop => ({ kind: 'house', x: 20, y: 0.5, z: 18, w: 4, d: 3.5, h: 6, yaw: 1.1, seed });
    const home = house([...Array(50).keys()].find((s) => housePieces(house(s), [1, 1, 1]).filter((p) => p.light).length >= 2)!);
    const lamp: Prop = { kind: 'lamp', x: 10, y: 2, z: -5, w: 0.1, d: 0, h: 3.2, yaw: 0.7, seed: 1 };
    const pit: Prop = { kind: 'firepit', x: -4, y: 1, z: 3, w: 0.8, d: 0, h: 0.5, yaw: 0.3, seed: 2 };
    let spots: LightSpot[] = [];
    finish(propJob([lamp, pit, home], REGIONS[0], (_, l) => (spots = l)));
    const where = (s: LightSpot): number[] => [s.x, s.y, s.z].map((v) => Math.round(v * 1000) / 1000);
    expect(spots[0].kind).toBe('lamp');
    expect(where(spots[0])).toEqual([10, 5.3, -5]); // the glass, 0.25 m above the post's 3.2 on ground sunk 0.15
    expect(spots[1].kind).toBe('fire');
    expect(where(spots[1])).toEqual([-4, 1.45, 3]);
    const windows = spots.slice(2);
    const glass = housePieces(home, [1, 1, 1])
      .filter((p) => p.light === 'window')
      .map((p) => centre(p.geo.rotateY(home.yaw).translate(home.x, home.y - 0.15, home.z)));
    expect(windows.length).toBe(glass.length);
    windows.forEach((s, i) => {
      const g = glass[i];
      expect(s.kind).toBe('window');
      expect(Math.hypot(s.x - g.x, s.y - g.y, s.z - g.z)).toBeCloseTo(0.52, 4); // turned with the house, as its glass was
      expect(Math.hypot(s.x - home.x, s.z - home.z)).toBeGreaterThan(Math.hypot(g.x - home.x, g.z - home.z)); // outside, not in the wall
    });
  });

  it("a legacy dungeon's every sconce flame is a torch", () => {
    let total = 0;
    for (const d of worldLayout().dungeons) {
      let [meshes, spots] = [[] as THREE.Mesh[], [] as LightSpot[]];
      finish(dungeonJob(d, (m, l) => ([meshes, spots] = [m, l])));
      const flames = meshes.find((m) => (m.material as THREE.ShaderMaterial).uniforms.uEmissive.value === 1);
      expect(spots.length, d.layout.def.id).toBe((flames?.geometry.getAttribute('position').count ?? 0) / 24); // a flame is a box
      expect(spots.every((s) => s.kind === 'torch'), d.layout.def.id).toBe(true);
      total += spots.length;
    }
    expect(total).toBeGreaterThan(10);
  });
});
