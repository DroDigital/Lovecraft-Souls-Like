import type { ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { ENTITIES } from '../src/data/registry';
import { LANTERN, LIGHT } from '../src/data/tuning';
import { buildAssembly } from '../src/render/assemblies';
import { buildFigure } from '../src/render/figures';
import { lightArena, placeLantern } from '../src/render/lantern';
import { worldUniforms } from '../src/render/worldMaterial';
import { createGame } from '../src/systems/game';

const u = worldUniforms;

describe('arena lighting', () => {
  it('keeps the moonlight until the arena switches to night and the lantern', () => {
    expect(u.uMarkCharacters.value).toBe(0); // alpha stays opaque unless a pipeline's post pass reads the marks
    expect(u.uLanternColor.value.length()).toBe(0);
    expect(u.uLightColor.value.length()).toBeGreaterThan(0);
    lightArena();
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
