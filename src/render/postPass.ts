/** The single fullscreen post pass: material, fullscreen triangle, per-frame uniform update. Round 16: it reads the scene's depth for the volumetric fog (shaders/fog.ts, volumetricFog.ts). */

import * as THREE from 'three';
import { LOOKS } from '../data/looks';
import { FOG, FX, LIGHT } from '../data/tuning';
import type { FxParams } from './fx';
import { ANOMALY_HUES } from './palette';
import { ANOMALY_FROM, ANOMALY_TO, buildRealmPalette, gradeTints } from './realmPalette';
import { POST_FRAG, POST_VERT } from './shaders/post';
import { worldUniforms } from './worldMaterial';

function createUniforms(source: THREE.Texture, depth: THREE.Texture | null, palette: Float32Array) {
  const w = worldUniforms; // the lantern and the lamps, shared: they light the mist as they light the world
  const [ink, shade, mid, high] = gradeTints(LOOKS.hub); // until a realm's own is laid (render/realmLook.ts)
  return {
    tScene: { value: source },
    tDepth: { value: depth },
    uProjInv: { value: new THREE.Matrix4() },
    uCamWorld: { value: new THREE.Matrix4() },
    uCamPos: { value: new THREE.Vector3() },
    uFog: { value: new THREE.Vector4(0, 1, 0, 0) }, // none until a frame sets it (volumetricFog.ts)
    uFogAir: { value: new THREE.Vector4(0, 1, 0, 0) },
    uMoonDir: { value: new THREE.Vector3(...LIGHT.nightMoonDir).normalize() }, // the sky's moon (sky.ts)
    uFogColor: { value: new THREE.Vector3() },
    uFogDrift: { value: new THREE.Vector3() },
    uFogFar: { value: FOG.far },
    uFogGlow: { value: FOG.glow },
    uFogLantern: { value: FOG.lantern },
    uFogStart: { value: new THREE.Vector2(FOG.start, FOG.full) },
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
    uInk: { value: new THREE.Vector3(...ink) },
    uShade: { value: new THREE.Vector3(...shade) },
    uMid: { value: new THREE.Vector3(...mid) },
    uHigh: { value: new THREE.Vector3(...high) },
    uHurt: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFaint: { value: new THREE.Vector2(0, 0) }, // near death (hurtFx.ts; round 23)
    uStone: { value: 0 }, // a petrifying gaze: the colour drains, the edges close in, it cracks (hurtFx.ts; round 25)
    uBlur: { value: 0 }, // a failing mind: the edges of sight lose their focus (round 22)
    uAnomalyHues: { value: new THREE.Vector3(...ANOMALY_HUES) },
    uChar: { value: new THREE.Vector2(FX.charShare, FX.charLevels) }, // what a character keeps (round 34)
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
  const palette = buildRealmPalette(LOOKS.hub);
  const uniforms = createUniforms(source, depth, new Float32Array(palette.flat()));
  const material = new THREE.ShaderMaterial({
    defines: { PALETTE_SIZE: palette.length, ANOMALY_FROM, ANOMALY_TO, FOG_STEPS: FOG.steps },
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
  u.uBlur.value = fx.blur;
}
