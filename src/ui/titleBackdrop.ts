/**
 * The title's live backdrop (playtest round 4): the investigator walking down the Seventy Steps
 * (world/titleStair.ts) under a low moon, lantern at the hip, toward a gate glowing purple far below
 * in the fog that keeps its distance however far they go, through the game's own pipeline. The walk
 * loops every eight steps, where the stair repeats. Stopped, and its canvas removed, when the world
 * begins.
 */

import * as THREE from 'three';
import { startLoop } from '../core/loop';
import { LANTERN, LIGHT, RENDER, SIM, type Vec3 } from '../data/tuning';
import { buildFigure } from '../render/figures';
import { allEffectsOn, computeFx, lensAt, type FxState } from '../render/fx';
import { cadence } from '../render/gait';
import { lightNight } from '../render/lantern';
import { applyLens } from '../render/lens';
import { ANOMALY } from '../render/palette';
import { createPipeline } from '../render/pipeline';
import { pose } from '../render/poses';
import { updatePostUniforms } from '../render/postPass';
import { createSky } from '../render/sky';
import { updateWorldUniforms, worldUniforms } from '../render/worldMaterial';
import { slopeAt, STAIR, titleStair, treadAt } from '../world/titleStair';

export interface TitleBackdrop {
  stop(): void;
}

const MOON: Vec3 = [0.28, 0.13, -1]; // low ahead and to the right, over the stair's foot...
const MOONLIGHT = { dir: [0.35, 0.75, -1] as Vec3, strength: 1.8 }; // ...its light cheated higher and brighter, so the whole descent reads
const WALK = 1.05; // metres a second down the stair
const GATE = 27; // metres below the walker, where the gate stands
const LANE = -0.8; // the walker keeps left of the middle, so the gate shows past them
const CAMERA = { side: 0.3, up: 2.6, back: 4.6, ahead: 8, drop: 1.6, aim: 0.5 }; // behind and above the walker, looking down the stair

export function startTitleBackdrop(fxCap: number, scale: number): TitleBackdrop {
  const pipeline = createPipeline(document.body);
  const scene = new THREE.Scene();
  const sky = createSky(MOON);
  const walker = buildFigure('player');
  const gate = buildFigure('gate');
  scene.add(sky.mesh, titleStair(), walker.root, gate.root);
  const camera = new THREE.PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
  lightNight();
  worldUniforms.uLightDir.value.set(...MOONLIGHT.dir).normalize();
  worldUniforms.uLightColor.value.set(...LIGHT.nightMoon).multiplyScalar(MOONLIGHT.strength);
  worldUniforms.uGlowColor.value.set(...ANOMALY.purple).multiplyScalar(LIGHT.glowIntensity * 2.5); // the gate's light, strong enough to show through the fog
  worldUniforms.uGlowRange.value = LIGHT.glowRange * 1.3;
  const state: FxState = { sanity: 100, cap: fxCap, anomalyProximity: 0, enabled: allEffectsOn() };
  const resize = (): void => pipeline.resize(true, scale);
  resize();
  addEventListener('resize', resize);
  const glow = new THREE.Vector3();
  const loop = STAIR.period * STAIR.run;
  let [z, stride, time] = [-1, 0, 0];
  const stop = startLoop(
    {
      step(dt) {
        time += dt;
        z -= WALK * dt;
        stride += 2 * Math.PI * cadence(WALK) * dt;
        if (z < -1 - loop) z += loop; // the stair repeats here: no seam
      },
      render(alpha) {
        const lead = alpha / SIM.hz;
        const [t, at] = [time + lead, z - WALK * lead];
        const y = slopeAt(at);
        walker.root.position.set(LANE, y, at);
        walker.root.rotation.y = Math.PI; // down the stair, toward −z
        const ground = (_x: number, forward: number): number => Math.min(0.3, Math.max(-0.3, treadAt(at - forward) - y));
        pose(walker, { move: null, def: undefined, frame: 0, speed: WALK, stride: stride + 2 * Math.PI * cadence(WALK) * lead, guard: false, flinch: 0, rollYaw: 0, time: t, ground });
        worldUniforms.uLanternPos.value.set(LANE - LANTERN.side, y + LANTERN.height, at - LANTERN.forward); // at the left hip, as it hangs in play
        camera.position.set(LANE + CAMERA.side, y + CAMERA.up, at + CAMERA.back);
        camera.lookAt(LANE + CAMERA.aim, y - CAMERA.drop, at - CAMERA.ahead);
        sky.update(camera, t, null, false);
        gate.root.position.set(0, treadAt(at - GATE), at - GATE); // the gate keeps its distance below
        glow.set(0, treadAt(at - GATE) + 1.4, at - GATE + 1);
        const fx = computeFx(state);
        const lens = lensAt(fx, t);
        applyLens(camera, lens.fovDeg, lens.skew);
        updateWorldUniforms(fx, t, camera.position, glow, pipeline.size);
        updatePostUniforms(pipeline.post, fx, t, pipeline.size);
        pipeline.render(scene, camera);
      },
    },
    SIM.hz,
    SIM.maxFrameSeconds,
  );
  return {
    stop() {
      stop();
      removeEventListener('resize', resize);
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      });
      pipeline.renderer.dispose();
      pipeline.renderer.domElement.remove();
    },
  };
}
