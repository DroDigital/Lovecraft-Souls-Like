import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { SKYLINES } from '../src/data/skylines';
import { RENDER, SKY } from '../src/data/tuning';
import { createPostPass } from '../src/render/postPass';
import { createRealmLook } from '../src/render/realmLook';
import { createSky } from '../src/render/sky';
import { createSkyline, falseShown } from '../src/render/skyline';
import { profile } from '../src/render/skylineShapes';
import { createRng } from '../src/core/rng';
import { regionRect } from '../src/world/worldMap';

const realmLook = () => createRealmLook(createPostPass(new THREE.Texture()));

/** The skyline's meshes, and a camera at (x, z) that has looked from there once. */
function lookFrom(region: string, x: number, z: number): THREE.Mesh[] {
  const scene = new THREE.Scene();
  const skyline = createSkyline(scene, realmLook());
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(x, 20, z);
  camera.updateMatrixWorld();
  skyline.update(camera, 0, region, false);
  return scene.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
}

describe('the far silhouettes (round 19: render/skyline.ts)', () => {
  it('are drawn with the opaque, after the sky and before the world, so the world always stands in front of them', () => {
    const sky = createSky(realmLook()).mesh;
    const meshes = lookFrom('dreamlands', 0, 4000);
    expect(meshes.length).toBe(Object.values(SKYLINES).flat().length + 1); // and the false one a failing mind sees (round 26)
    for (const m of meshes) {
      const mat = m.material as THREE.ShaderMaterial;
      expect(mat.transparent).toBe(false); // a transparent is drawn after the whole world: it was painted over it
      expect(mat.blending).toBe(THREE.CustomBlending); // it still fades in, over the sky
      expect(m.renderOrder).toBeGreaterThan(sky.renderOrder);
      expect(m.renderOrder).toBeLessThan(0);
      expect(mat.depthWrite).toBe(false);
    }
  });

  it('fill the sky they would from where the investigator stands, but never more than SKY.farAngle', () => {
    const r = regionRect(REGIONS.find((x) => x.id === 'dreamlands')!);
    const [kadath] = SKYLINES.dreamlands;
    const at = { x: r.x0 + kadath.at[0], z: r.z0 + kadath.at[1] };
    const shown = (d: number): number => {
      const m = lookFrom('dreamlands', at.x, at.z - d).find((x) => x.visible)!;
      const dist = Math.hypot(m.position.x - at.x, m.position.z - (at.z - d));
      return Math.atan(m.scale.y / dist) * (180 / Math.PI);
    };
    const R = RENDER.far * 0.7;
    const far = kadath.height / Math.tan((SKY.farAngle * Math.PI) / 180) + 200;
    expect(shown(far)).toBeCloseTo(Math.atan(kadath.height / far) * (180 / Math.PI), 1); // far off: its true size
    expect(shown(R * 2)).toBeCloseTo(SKY.farAngle, 1); // near: held at the most
    expect(shown(at.z - r.z1)).toBeCloseTo(SKY.farAngle, 1); // from the realm's north edge, where it rose 50°
  });

  it('a false one rises on the horizon only for a failing mind, slowly, and goes at once (round 26)', () => {
    expect(falseShown(0.3, 8)).toBe(0); // a steady mind sees none
    expect(falseShown(0.9, -1)).toBe(0);
    expect(falseShown(0.9, 3)).toBeCloseTo(0.5);
    expect(falseShown(0.9, 8)).toBe(1);
    expect(falseShown(0.9, 15)).toBe(0);
    expect(falseShown(0.7, 8)).toBeLessThan(falseShown(0.9, 8));
  });
});

describe("the silhouettes' outlines and windows (round 32: the towns, hills and towers never showed)", () => {
  const all = Object.values(SKYLINES).flat();
  const kinds = [...new Set(all.map((s) => s.kind))];

  it.each(kinds)('%s stands within its box, and is more than a flat line', (kind) => {
    const f = profile(kind, createRng(7));
    const ys = Array.from({ length: 240 }, (_, i) => f(-0.5 + i / 239));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1.3);
    }
    expect(Math.max(...ys)).toBeGreaterThan(0.3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.2);
  });

  it('a town is a close run of roofs with a few steeples standing over them', () => {
    const f = profile('town', createRng(21));
    const ys = Array.from({ length: 400 }, (_, i) => f(-0.45 + (0.9 * i) / 399));
    const roofs = ys.filter((y) => y > 0.1 && y < 0.5).length;
    expect(roofs / ys.length).toBeGreaterThan(0.5); // mostly roofs...
    expect(Math.max(...ys)).toBeGreaterThan(0.5); // ...and a steeple over them
  });

  it("every realm of the waking world sees its neighbours' towns on the horizon, with some windows lit", () => {
    for (const id of ['hub', 'arkham', 'dunwich', 'innsmouth', 'providence', 'vermont']) {
      expect(SKYLINES[id]?.some((s) => s.kind === 'town' && (s.lit ?? 0) > 0), id).toBe(true);
    }
    for (const s of all) if (s.lit !== undefined) expect(s.lit > 0 && s.lit <= 0.5, `${s.kind} ${s.seed}`).toBe(true);
  });

  it('puts every silhouette beyond the reach of the streamed chunks from somewhere in its realm, so there is always something to walk toward', () => {
    for (const [id, list] of Object.entries(SKYLINES)) {
      const r = regionRect(REGIONS.find((x) => x.id === id)!);
      const [cx, cz] = [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
      for (const s of list) expect(Math.hypot(r.x0 + s.at[0] - cx, r.z0 + s.at[1] - cz), `${id} ${s.kind}`).toBeGreaterThan(RENDER.far * 0.7 * 1.5);
    }
  });
});
