import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/regions';
import { SKYLINES } from '../src/data/skylines';
import { RENDER, SKY } from '../src/data/tuning';
import { createSky } from '../src/render/sky';
import { createSkyline, falseShown } from '../src/render/skyline';
import { regionRect } from '../src/world/worldMap';

/** The skyline's meshes, and a camera at (x, z) that has looked from there once. */
function lookFrom(region: string, x: number, z: number): THREE.Mesh[] {
  const scene = new THREE.Scene();
  const skyline = createSkyline(scene);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(x, 20, z);
  camera.updateMatrixWorld();
  skyline.update(camera, 0, region, false);
  return scene.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh);
}

describe('the far silhouettes (round 19: render/skyline.ts)', () => {
  it('are drawn with the opaque, after the sky and before the world, so the world always stands in front of them', () => {
    const sky = createSky().mesh;
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
