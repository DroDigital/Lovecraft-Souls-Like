import * as THREE from 'three';
import type { ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { ENTITIES } from '../src/data/registry';
import { LANTERN, LIGHT } from '../src/data/tuning';
import { buildAssembly } from '../src/render/assemblies';
import { buildFigure } from '../src/render/figures';
import { lightNight, placeLantern } from '../src/render/lantern';
import { worldUniforms } from '../src/render/worldMaterial';
import { createGame } from '../src/systems/game';

const u = worldUniforms;

describe('arena lighting', () => {
  it('keeps the moonlight until a game switches to night and the lantern', () => {
    expect(u.uMarkCharacters.value).toBe(0); // alpha stays opaque unless a pipeline's post pass reads the marks
    expect(u.uLanternColor.value.length()).toBe(0);
    expect(u.uLightColor.value.length()).toBeGreaterThan(0);
    lightNight();
    expect(u.uLightColor.value.toArray()).toEqual([...LIGHT.nightMoon]);
    expect(u.uLightDir.value.y).toBeLessThan(0.45); // a low moon finds walls more than the floor
    expect(u.uAmbient.value.toArray()).toEqual([...LIGHT.nightAmbient]);
    expect(u.uLanternColor.value.toArray()).toEqual(LANTERN.color.map((c) => c * LANTERN.intensity));
  });

  it("hangs the lantern at the player's left hip, a little ahead", () => {
    const g = createGame();
    const tr = g.ecs.c.transform.get(g.player.id)!;
    placeLantern(g, 1);
    const p = u.uLanternPos.value;
    const [fx, fz, lx, lz] = [Math.sin(tr.yaw), Math.cos(tr.yaw), Math.cos(tr.yaw), -Math.sin(tr.yaw)]; // forward, left
    expect(p.y).toBeCloseTo(tr.pos.y + LANTERN.height);
    expect((p.x - tr.pos.x) * fx + (p.z - tr.pos.z) * fz).toBeCloseTo(LANTERN.forward);
    expect((p.x - tr.pos.x) * lx + (p.z - tr.pos.z) * lz).toBeCloseTo(LANTERN.side);
  });
});

describe('characters', () => {
  const flags = (ms: ShaderMaterial[]): number[] => ms.map((m) => m.uniforms.uCharacter.value as number);

  it('marks the player and creatures as different kinds of character, and Echo drops as none', () => {
    expect(new Set(flags(buildFigure('player').materials))).toEqual(new Set([2]));
    for (const model of ['deepOne', 'dummy']) expect(new Set(flags(buildFigure(model).materials)), model).toEqual(new Set([1]));
    expect(new Set(flags(buildFigure('echo').materials))).toEqual(new Set([0]));
    const colossus = ENTITIES.find((d) => d.assembly)!;
    expect(new Set(flags(buildAssembly(colossus.assembly!, 1).materials))).toEqual(new Set([1]));
  });
});

describe("the investigator's lantern", () => {
  const lum = (c: ArrayLike<number>): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const colours = (m: THREE.Mesh): number[][] => {
    const c = m.geometry.getAttribute('color');
    return Array.from({ length: c.count }, (_, i) => [c.getX(i), c.getY(i), c.getZ(i)]);
  };
  const texels = (m: THREE.Mesh): number[] => {
    const d = ((m.material as ShaderMaterial).uniforms.uMap.value as THREE.DataTexture).image.data as Uint8Array;
    return Array.from({ length: d.length / 4 }, (_, i) => lum(d.subarray(i * 4, i * 4 + 3)) / 255);
  };
  const [least, most] = [(v: number[]) => v.reduce((a, b) => Math.min(a, b)), (v: number[]) => v.reduce((a, b) => Math.max(a, b))];

  it('outshines their face, however brightly the night lights it (playtest round 5)', () => {
    const f = buildFigure('player');
    const flame = f.torso.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && (o.material as ShaderMaterial).uniforms.uEmissive.value === 1);
    expect(flame).toHaveLength(1); // at the belt, where its halo hangs
    f.root.updateMatrixWorld(true);
    const box = flame[0].geometry.boundingBox ?? (flame[0].geometry.computeBoundingBox(), flame[0].geometry.boundingBox!);
    expect(f.flame!.getWorldPosition(new THREE.Vector3()).distanceTo(box.getCenter(new THREE.Vector3()).applyMatrix4(flame[0].matrixWorld))).toBeLessThan(1e-6);
    const face = f.head.children.find((o): o is THREE.Mesh => o instanceof THREE.Mesh)!;
    expect(most(colours(face).map(lum))).toBeGreaterThan(0.5); // a pale face...
    expect(u.uSelfMax.value).toBe(LANTERN.selfMax); // ...lit to at most this in its brightest channel (shaders/world.ts), times its texture...
    const brightestFace = LANTERN.selfMax * most(texels(face));
    const dimmestFlame = least(colours(flame[0]).map(lum)) * (0.4 * least(texels(flame[0])) + 0.6); // ...while the flame shines through its own
    expect(brightestFace).toBeLessThan(dimmestFlame * 0.95);
    expect(u.uLanternSelf.value).toBeLessThan(1); // and the investigator takes less of the lantern than other characters do
  });
});
