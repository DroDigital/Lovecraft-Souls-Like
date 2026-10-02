/**
 * The shadows of the lamps (round 35: only the lantern and the moon threw any, so a torch lit a pillar's
 * far side as it lit its near): the three nearest torches, braziers and street lamps each have a depth
 * map of their own, drawn from the flame toward the investigator, of the same solids the lantern's is
 * (render/colliderShadow.ts), and take what stands behind one of them out of that lamp's share of the
 * light (shaders/shadow.ts, `lampLit`). A lamp keeps its map while it is among the nearest, and
 * a new one's shadow comes in over a third of a second, so none pops. Render only.
 */

import * as THREE from 'three';
import { LAMP_SHADOWS } from '../data/fxTuning';
import { FAR_SIDE } from './lanternShadow';
import { LANTERN_CASTER } from './colliderShadow';
import { worldUniforms } from './worldMaterial';

/** A lamp that may cast: the slot it has among the shader's lamps, where it burns, and a key that is the same from frame to frame. */
export interface Caster {
  slot: number;
  x: number;
  y: number;
  z: number;
  key: string;
}

export interface LampShadows {
  enabled: boolean;
  /** The lamps that may cast this frame, nearest first (worldLights.ts), and where they are drawn toward. */
  update(casters: readonly Caster[], dt: number): void;
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, toward: { x: number; y: number; z: number }): void;
}

export function createLampShadows(): LampShadows {
  const { count, size, fov, near, reach, strength, bias, offset, fade } = LAMP_SHADOWS;
  const maps = Array.from({ length: count }, () => {
    const depth = new THREE.DepthTexture(size, size);
    return { target: new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true, depthTexture: depth }), depth };
  });
  const lens = Array.from({ length: count }, () => {
    const c = new THREE.PerspectiveCamera(fov, 1, near, 12 + reach);
    c.layers.set(LANTERN_CASTER);
    return c;
  });
  const u = worldUniforms;
  maps.forEach((m, k) => {
    u.uLSMap.value[k] = m.depth;
    u.uLSView.value[k] = lens[k].matrixWorldInverse;
    u.uLSProj.value[k] = lens[k].projectionMatrix;
    u.uLSInfo.value[k].set(near, 12 + reach, 1 / size, 0);
  });
  u.uLSBias.value.set(strength, bias, offset, 0);
  const held: ({ key: string; fade: number; at: THREE.Vector3 } | null)[] = Array.from({ length: count }, () => null);
  const self: LampShadows = {
    enabled: false,
    update(casters, dt) {
      const slots = u.uLampSlot.value as number[];
      slots.fill(-1);
      if (!self.enabled) {
        held.fill(null);
        u.uLSInfo.value.forEach((v: THREE.Vector4) => (v.w = 0));
        return;
      }
      held.forEach((h, k) => {
        if (h && !casters.some((c) => c.key === h.key)) held[k] = null; // it is no longer among the nearest
      });
      for (const c of casters) {
        if (held.some((h) => h?.key === c.key)) continue;
        const free = held.indexOf(null);
        if (free >= 0) held[free] = { key: c.key, fade: 0, at: new THREE.Vector3(c.x, c.y, c.z) };
      }
      held.forEach((h, k) => {
        const c = h && casters.find((x) => x.key === h.key);
        if (!h || !c) {
          u.uLSInfo.value[k].w = 0;
          return;
        }
        h.fade = Math.min(1, h.fade + dt / fade);
        h.at.set(c.x, c.y, c.z);
        slots[c.slot] = k;
        u.uLSInfo.value[k].w = h.fade;
      });
    },
    render(renderer, scene, toward) {
      if (!self.enabled) return;
      const [was, material] = [renderer.getRenderTarget(), scene.overrideMaterial];
      scene.overrideMaterial = FAR_SIDE;
      held.forEach((h, k) => {
        if (!h) return;
        lens[k].position.copy(h.at);
        lens[k].lookAt(toward.x, toward.y + 0.8, toward.z);
        lens[k].updateMatrixWorld(true);
        renderer.setRenderTarget(maps[k].target);
        renderer.render(scene, lens[k]);
      });
      scene.overrideMaterial = material;
      renderer.setRenderTarget(was);
    },
  };
  return self;
}
