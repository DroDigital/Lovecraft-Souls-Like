/** Phase 0 entry: the §2 render pipeline on a look-test scene, driven by a sanity slider. */

import { PerspectiveCamera } from 'three';
import { startLoop } from './core/loop';
import { FX, ORBIT, RENDER, SIM } from './data/tuning';
import { allEffectsOn, anomalyProximity, computeFx, lensAt, type FxState } from './render/fx';
import { applyLens } from './render/lens';
import { createPipeline } from './render/pipeline';
import { updatePostUniforms } from './render/postPass';
import { updateWorldUniforms } from './render/worldMaterial';
import { createDebugPanel } from './ui/debugPanel';
import { createOrbitRig } from './ui/orbitRig';
import { createTestScene } from './world/testScene';

const state: FxState = { sanity: 100, cap: FX.capDefault, anomalyProximity: 0, enabled: allEffectsOn() };
const pipeline = createPipeline(document.body);
const world = createTestScene();
const camera = new PerspectiveCamera(RENDER.fovDeg, RENDER.width / RENDER.height, RENDER.near, RENDER.far);
const rig = createOrbitRig(pipeline.renderer.domElement);
const panel = createDebugPanel(state);

let lowRes = state.enabled.pixelate;
pipeline.resize(lowRes);
addEventListener('resize', () => pipeline.resize(lowRes));

let simTime = 0;
let frames = 0;
let statsAt = performance.now();

startLoop(
  {
    step(dt) {
      simTime += dt;
      rig.step(dt);
    },
    render(alpha) {
      const time = simTime + alpha / SIM.hz;
      if (lowRes !== state.enabled.pixelate) pipeline.resize((lowRes = state.enabled.pixelate));

      const [x, y, z] = rig.position(alpha);
      camera.position.set(x, Math.max(y, world.groundHeight(x, z) + ORBIT.minHeightAboveGround), z);
      camera.lookAt(...rig.target);
      world.update(time);

      state.anomalyProximity = anomalyProximity(camera.position.distanceTo(world.anomalyPosition));
      const fx = computeFx(state);
      const lens = lensAt(fx, time);
      applyLens(camera, lens.fovDeg, lens.skew);
      updateWorldUniforms(fx, time, camera.position, world.anomalyPosition, pipeline.size);
      updatePostUniforms(pipeline.post, fx, time, pipeline.size);
      pipeline.render(world.scene, camera);

      frames++;
      const now = performance.now();
      if (now - statsAt >= 500) {
        const fps = Math.round((frames * 1000) / (now - statsAt));
        const calls = pipeline.renderer.info.render.calls;
        panel.setStats(`${fps} fps · ${calls} draws · stress ${fx.stress.toFixed(2)} · anomaly ${fx.anomalyProximity.toFixed(2)}`);
        frames = 0;
        statsAt = now;
      }
    },
  },
  SIM.hz,
  SIM.maxFrameSeconds,
);
