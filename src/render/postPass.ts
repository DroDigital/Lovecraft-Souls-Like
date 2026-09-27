/** The single fullscreen post pass: material, fullscreen triangle, per-frame uniform update. Round 16: it reads the scene's depth for the volumetric fog (shaders/fog.ts, volumetricFog.ts). */

import * as THREE from 'three';
import { FOG, FX, GRADE } from '../data/tuning';
import type { FxParams } from './fx';
import { ANOMALY_HUES, buildPalette, COLD_TINT, WARM_TINT } from './palette';
import { POST_FRAG, POST_VERT } from './shaders/post';
import { worldUniforms } from './worldMaterial';

function createUniforms(source: THREE.Texture, depth: THREE.Texture | null, palette: Float32Array) {
  const w = worldUniforms; // the lantern and the lamps, shared: they light the mist as they light the world
  return {
    tScene: { value: source },
    tDepth: { value: depth },
    uProjInv: { value: new THREE.Matrix4() },
    uCamWorld: { value: new THREE.Matrix4() },
    uCamPos: { value: new THREE.Vector3() },
    uFog: { value: new THREE.Vector4(0, 1, 0, 0) }, // none until a frame sets it (volumetricFog.ts)
    uFogColor: { value: new THREE.Vector3() },
    uFogDrift: { value: new THREE.Vector3() },
    uFogFar: { value: FOG.far },
    uFogGlow: { value: FOG.glow },
    uLanternPos: w.uLanternPos,
    uLanternColor: w.uLanternColor,
    uLanternRange: w.uLanternRange,
    uLanternDecay: w.uLanternDecay,
    uLamps: w.uLamps,
    uLampColors: w.uLampColors,
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uRipple: { value: 0 },
    uChroma: { value: 0 },
    uIsolate: { value: 0 },
    uDesat: { value: 0 },
    uAnomalyProximity: { value: 0 },
    uAnomalyStress: { value: 0 },
    uHueWidth: { value: FX.hueWidth },
    uMinSat: { value: FX.minSaturation },
    uCold: { value: new THREE.Vector3(...COLD_TINT) },
    uWarm: { value: new THREE.Vector3(...WARM_TINT) },
    uSplit: { value: new THREE.Vector2(...GRADE.split) },
    uHurt: { value: new THREE.Vector4(0, 0, 0, 0) },
    uAnomalyHues: { value: new THREE.Vector3(...ANOMALY_HUES) },
    uQuantize: { value: 0 },
    uDither: { value: 0 },
    uGamma: { value: 1 }, // 1 / the brightness setting (round 12)
    uPalette: { value: palette },
  };
}

export interface PostPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  uniforms: ReturnType<typeof createUniforms>;
}

export function createPostPass(source: THREE.Texture, depth: THREE.Texture | null = null): PostPass {
  const palette = buildPalette();
  const uniforms = createUniforms(source, depth, new Float32Array(palette.flat()));
  const material = new THREE.ShaderMaterial({
    defines: { PALETTE_SIZE: palette.length, FOG_STEPS: FOG.steps },
    uniforms,
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mesh = new THREE.Mesh(triangle, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, camera: new THREE.Camera(), uniforms };
}

export function updatePostUniforms(post: PostPass, fx: FxParams, time: number, res: THREE.Vector2): void {
  const u = post.uniforms;
  u.uRes.value.copy(res);
  u.uTime.value = time;
  u.uRipple.value = fx.ripple;
  u.uChroma.value = fx.chroma;
  u.uIsolate.value = fx.isolate ? 1 : 0;
  u.uDesat.value = fx.desaturate;
  u.uAnomalyProximity.value = fx.anomalyProximity;
  u.uAnomalyStress.value = fx.anomalyStress;
  u.uQuantize.value = fx.quantize ? 1 : 0;
  u.uDither.value = fx.ditherSpread;
}
