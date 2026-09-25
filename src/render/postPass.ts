/** The single fullscreen post pass: material, fullscreen triangle, per-frame uniform update. */

import * as THREE from 'three';
import { FX, GRADE } from '../data/tuning';
import type { FxParams } from './fx';
import { ANOMALY_HUES, buildPalette, COLD_TINT, WARM_TINT } from './palette';
import { POST_FRAG, POST_VERT } from './shaders/post';

function createUniforms(source: THREE.Texture, palette: Float32Array) {
  return {
    tScene: { value: source },
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
    uPalette: { value: palette },
  };
}

export interface PostPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  uniforms: ReturnType<typeof createUniforms>;
}

export function createPostPass(source: THREE.Texture): PostPass {
  const palette = buildPalette();
  const uniforms = createUniforms(source, new Float32Array(palette.flat()));
  const material = new THREE.ShaderMaterial({
    defines: { PALETTE_SIZE: palette.length },
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
