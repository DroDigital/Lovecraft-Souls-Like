/**
 * What stands in the way of the lantern (round 34): the colliders the simulation holds are drawn into a depth map from the
 * investigator by their far faces; a point lies in a shadow when that map's nearest far face is nearer to the lantern than the
 * point is. The same is checked here with rays (a back-face ray hit is what the depth pass draws): the solids look outwards,
 * the surface a room shows is lit and what lies behind it is not, and the depth a shader reads back is the metres it was drawn at.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LANTERN_SHADOW } from '../src/data/fxTuning';
import { LANTERN } from '../src/data/tuning';
import { colliderShadowMesh, LANTERN_CASTER, solidOf } from '../src/render/colliderShadow';
import { SHADOW_GLSL } from '../src/render/shaders/shadow';
import { SPRITE_VERT } from '../src/render/shaders/sprite';
import { WORLD_FRAG } from '../src/render/shaders/world';
import { toBoxFrame, type Collider } from '../src/world/colliders';

const WALL: Collider = { kind: 'box', min: { x: 5, y: 0, z: -1 }, max: { x: 6, y: 3, z: 1 } };
const SLAB: Collider = { kind: 'obox', x: 5.5, z: 0, hx: 0.5, hz: 1, yaw: 0.6, y0: 0, y1: 3 };
const PILLAR: Collider = { kind: 'cylinder', x: 5.5, z: 0, radius: 0.5, y0: 0, y1: 3 };
const SOLIDS: readonly [string, Collider][] = [['a box', WALL], ['a turned box', SLAB], ['a round pillar', PILLAR]];
const LAMP = new THREE.Vector3(0, 1.25, 0);

/** The distance along the ray from the lantern to `to` at which the lantern's map would hold the first far face of `c` (null: the ray passes it by). */
function farFace(c: Collider, to: THREE.Vector3): number | null {
  const mesh = colliderShadowMesh([c])!;
  const seen = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
  const ray = new THREE.Raycaster(LAMP, to.clone().sub(LAMP).normalize());
  ray.layers.set(LANTERN_CASTER);
  seen.layers.set(LANTERN_CASTER);
  return ray.intersectObject(seen)[0]?.distance ?? null;
}
const lit = (c: Collider, to: THREE.Vector3): boolean => {
  const hit = farFace(c, to);
  return hit === null || hit >= to.distanceTo(LAMP) - LANTERN_SHADOW.bias;
};

describe('the lantern\'s solids', () => {
  it.each(SOLIDS)('are closed and look outwards, for %s', (_, c) => {
    const { corners, faces } = solidOf(c);
    const mid = [0, 1, 2].map((a) => corners.filter((_, i) => i % 3 === a).reduce((s, v) => s + v, 0) / (corners.length / 3));
    expect(faces.length % 3).toBe(0);
    for (let f = 0; f < faces.length; f += 3) {
      const [a, b, d] = [0, 1, 2].map((k) => new THREE.Vector3(corners[faces[f + k] * 3], corners[faces[f + k] * 3 + 1], corners[faces[f + k] * 3 + 2]));
      const normal = b.clone().sub(a).cross(d.clone().sub(a));
      const out = a.clone().add(b).add(d).divideScalar(3).sub(new THREE.Vector3(...mid));
      expect(normal.dot(out), `triangle ${f / 3}`).toBeGreaterThan(0);
    }
  });

  it('a turned box stands where the collision puts it', () => {
    const { corners } = solidOf(SLAB);
    for (let i = 0; i < corners.length; i += 3) {
      const at = toBoxFrame(SLAB as Extract<Collider, { kind: 'obox' }>, corners[i], corners[i + 2]);
      expect(Math.abs(at.x)).toBeCloseTo(0.5, 5);
      expect(Math.abs(at.z)).toBeCloseTo(1, 5);
    }
  });

  it.each(SOLIDS)('leave the surface a room shows lit and what lies behind it in the dark, for %s', (_, c) => {
    expect(lit(c, new THREE.Vector3(4.4, 1.25, 0)), 'the face toward the lantern').toBe(true);
    expect(lit(c, new THREE.Vector3(5.3, 1.25, 0)), 'a point against that face, inside the solid\'s near edge').toBe(true);
    expect(lit(c, new THREE.Vector3(8, 1.25, 0)), 'behind it').toBe(false);
    expect(lit(c, new THREE.Vector3(8, 0.2, 0)), 'behind it, low').toBe(false);
    expect(lit(c, new THREE.Vector3(8, 1.25, 4)), 'beside it').toBe(true);
    expect(lit(c, new THREE.Vector3(8, 6, 0)), 'over it').toBe(true);
  });

  it('are one mesh a chunk that only the lantern\'s camera sees, and none where nothing stands', () => {
    expect(colliderShadowMesh([])).toBeNull();
    const mesh = colliderShadowMesh([WALL, SLAB, PILLAR])!;
    const faces = (mesh.geometry.index?.count ?? 0) / 3;
    expect(faces).toBe(12 + 12 + 28);
    expect(mesh.layers.test(new THREE.Layers())).toBe(false); // the investigator's camera, on layer 0, does not see it
    const lens = new THREE.Layers();
    lens.set(LANTERN_CASTER);
    expect(mesh.layers.test(lens)).toBe(true);
    const index = mesh.geometry.index!.array;
    const vertices = mesh.geometry.getAttribute('position').count;
    expect(Math.max(...index)).toBeLessThan(vertices);
  });
});

describe('the lantern\'s map', () => {
  it('reads back, in metres, the depth a perspective camera drew', () => {
    const near = LANTERN_SHADOW.near;
    const far = LANTERN.range + LANTERN_SHADOW.reach;
    const lens = new THREE.PerspectiveCamera(LANTERN_SHADOW.fov, 1, near, far);
    lens.position.set(1, 2, 3);
    lens.lookAt(4, 2, 3);
    lens.updateMatrixWorld(true);
    for (const metres of [0.5, 2, 5.5, 11, 12.9]) {
      const p = new THREE.Vector3(1 + metres, 2, 3).applyMatrix4(lens.matrixWorldInverse).applyMatrix4(lens.projectionMatrix);
      const d = p.z * 0.5 + 0.5; // window depth, as the depth texture holds it
      expect((near * far) / (far - d * (far - near))).toBeCloseTo(metres, 3); // lanternDepth in shaders/shadow.ts
    }
    expect(SHADOW_GLSL).toContain('uLShadowNF.x * uLShadowNF.y / (uLShadowNF.y - d * (uLShadowNF.y - uLShadowNF.x))');
  });

  it('looks as far as the lantern shines, and no wider than a picture can be', () => {
    expect(LANTERN_SHADOW.reach).toBeGreaterThan(0);
    expect(LANTERN_SHADOW.fov).toBeLessThan(180);
    expect(LANTERN_SHADOW.height).toBeGreaterThan(LANTERN.height); // from the chest, not from the belt where the lantern hangs
    expect(LANTERN_SHADOW.strength).toBeLessThan(1); // a wall is not black: the rest of the light leaks round
  });

  it('takes the shadow out of the lantern\'s light alone, in the world and on the sprites', () => {
    expect(WORLD_FRAG).toMatch(/uLanternColor \* lanternFalloff\(ld\) \* mix\(facing, share, character\) \* mix\(1\.0, lanternLit\(vWorld, n\), uLShadow\.x \* \(1\.0 - self\)\)/);
    expect(WORLD_FRAG).not.toMatch(/lampLight\([^)]*\)[^;]*lanternLit/); // the lamps, fires and windows are not the lantern
    expect(SPRITE_VERT).toMatch(/uLanternColor \* lanternAt\(uLanternPos - wp\) \* lamp/);
  });
});
