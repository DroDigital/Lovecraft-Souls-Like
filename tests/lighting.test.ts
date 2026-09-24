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
    expect(u.uLightColor.value.length()).toBe(0); // no light falls evenly on the floor
    expect(u.uAmbient.value.toArray()).toEqual([...LIGHT.nightAmbient]);
    expect(u.uLanternColor.value.toArray()).toEqual(LANTERN.color.map((c) => c * LANTERN.intensity));
  });

  it("hangs the lantern at the player's hip, just ahead of them", () => {
    const g = createGame();
    const tr = g.ecs.c.transform.get(g.player.id)!;
    placeLantern(g, 1);
    const p = u.uLanternPos.value;
    expect(p.y).toBeCloseTo(tr.pos.y + LANTERN.height);
    expect(p.x - tr.pos.x).toBeCloseTo(Math.sin(tr.yaw) * LANTERN.forward);
    expect(p.z - tr.pos.z).toBeCloseTo(Math.cos(tr.yaw) * LANTERN.forward);
  });
});

describe('characters', () => {
  const flags = (ms: ShaderMaterial[]): number[] => ms.map((m) => m.uniforms.uCharacter.value as number);

  it('figures and colossi get the rim light; Echo drops do not', () => {
    for (const model of ['player', 'deepOne', 'dummy']) expect(new Set(flags(buildFigure(model).materials)), model).toEqual(new Set([1]));
    expect(new Set(flags(buildFigure('echo').materials))).toEqual(new Set([0]));
    const colossus = ENTITIES.find((d) => d.assembly)!;
    expect(new Set(flags(buildAssembly(colossus.assembly!, 1).materials))).toEqual(new Set([1]));
  });
});
