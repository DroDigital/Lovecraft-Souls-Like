/**
 * The moon's shadows (round 34): trees, houses, stones and everyone who walks cast the shadow the moon
 * gives them, on the ground, on walls and on one another, as far as the lantern's neighbourhood. One
 * depth map is drawn from the moon over the investigator each frame, of whatever stands on the CASTER
 * layer (terrain does not: it only receives); the world shader (shaders/shadow.ts) takes the moon's
 * share of the light from what lies behind something in it. Under a roof, in a dungeon, or with the
 * setting off, nothing is drawn and the shader skips it. Render only.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHADOW } from '../data/tuning';
import { box } from './meshKit';
import { moonFrame } from './moonFrame';
import { worldUniforms } from './worldMaterial';

/** The layer a body that casts a shadow is on (the camera sees layer 0, which it keeps). */
export const CASTER = 1;

/** Puts `o` and everything it holds among the bodies that cast shadows. */
export function casting<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => c.layers.enable(CASTER));
  return o;
}

const HIDDEN = new THREE.MeshBasicMaterial(); // never drawn by the investigator's camera (it is on the CASTER layer alone); the moon's pass draws it with its own

/**
 * One mesh of the shapes of whatever casts in a chunk (their positions only), seen by the moon's camera and
 * not by the investigator's, so a chunk costs the shadow pass one draw and not one for each material its
 * trees and houses are made of. Null when nothing casts.
 */
export function shadowMesh(geos: readonly THREE.BufferGeometry[]): THREE.Mesh | null {
  if (!geos.length) return null;
  const bare = geos.map((g) => {
    const b = new THREE.BufferGeometry();
    const at = g.getAttribute('position');
    b.setAttribute('position', at);
    b.setIndex(g.index ?? [...Array(at.count).keys()]);
    return b;
  });
  const mesh = new THREE.Mesh(mergeGeometries(bare), HIDDEN);
  mesh.layers.set(CASTER);
  return mesh;
}

const proxies = new Map<number, THREE.BufferGeometry>();
const WHITE: readonly [number, number, number] = [1, 1, 1];

/** A person's shape for the moon (legs, coat, arms, head, a brimmed hat), one mesh in place of the figure's twenty, `hip` metres to the pelvis. Drawn a little within the figure, so its own body never falls in the shadow of it. */
export function personShadow(hip: number): THREE.Mesh {
  const key = Math.round(hip * 100);
  let geo = proxies.get(key);
  if (!geo) {
    const h = key / 100;
    geo = mergeGeometries([
      box(0.16, h, 0.18, -0.13, h / 2, 0, WHITE), box(0.16, h, 0.18, 0.13, h / 2, 0, WHITE), // legs
      box(0.42, 0.62, 0.24, 0, h + 0.31, 0, WHITE), // coat
      box(0.1, 0.7, 0.12, -0.31, h + 0.3, 0, WHITE), box(0.1, 0.7, 0.12, 0.31, h + 0.3, 0, WHITE), // arms
      box(0.22, 0.26, 0.22, 0, h + 0.78, 0, WHITE), // head
      box(0.54, 0.03, 0.54, 0, h + 0.93, 0, WHITE), box(0.28, 0.14, 0.28, 0, h + 1.02, 0, WHITE), // hat
    ]);
    proxies.set(key, geo);
  }
  const mesh = new THREE.Mesh(geo, HIDDEN);
  mesh.layers.set(CASTER);
  return mesh;
}

export interface MoonShadow {
  /** Where the map is centred: the investigator. */
  readonly focus: THREE.Vector3;
  /** Drawn at all: the open world, not under a roof, and the setting on. */
  enabled: boolean;
  /** Draws the map (before the world is), and tells the shaders whether to use it. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void;
}

const DEPTH_ONLY = new THREE.ShaderMaterial({
  vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
  side: THREE.DoubleSide,
  colorWrite: false,
});

/** From the NDC the camera makes to the 0..1 the map is read in. */
const TO_UNIT = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

/** A moon lower than this (its height, of a unit vector) lights nothing the shadows could tell from the dark. */
const LOW = 0.14;

export function createMoonShadow(): MoonShadow {
  const { size, range, depth } = SHADOW;
  const depthTexture = new THREE.DepthTexture(size, size);
  const target = new THREE.WebGLRenderTarget(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true, depthTexture });
  const camera = new THREE.OrthographicCamera(-range, range, range, -range, 1, depth);
  camera.layers.set(CASTER);
  const u = worldUniforms;
  u.uShadowMap.value = depthTexture;
  u.uShadow.value.set(0, 1 / size, SHADOW.bias / (depth - 1), SHADOW.offset);
  const [focus, toMoon, aim] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const texel = (2 * range) / size;
  const shadow: MoonShadow = {
    focus,
    enabled: false,
    render(renderer, scene) {
      toMoon.copy(u.uLightDir.value).normalize();
      const on = shadow.enabled && toMoon.y > LOW;
      u.uShadow.value.x = on ? SHADOW.strength : 0;
      if (!on) return;
      const f = moonFrame(toMoon, focus, texel, depth);
      camera.position.copy(f.position);
      camera.up.copy(f.up);
      camera.lookAt(aim.copy(f.position).sub(toMoon));
      camera.updateMatrixWorld(true);
      u.uShadowMat.value.multiplyMatrices(TO_UNIT, camera.projectionMatrix).multiply(camera.matrixWorldInverse);
      const [was, material] = [renderer.getRenderTarget(), scene.overrideMaterial];
      scene.overrideMaterial = DEPTH_ONLY;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      scene.overrideMaterial = material;
      renderer.setRenderTarget(was);
    },
  };
  return shadow;
}
