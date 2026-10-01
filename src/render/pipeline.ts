/**
 * Render pipeline (spec §2): the world renders into a low-res target (400×225 scaled by the
 * resolution setting: 600×338 by default), then the one post pass draws into a canvas of the same
 * size, which CSS upscales nearest-neighbour (`image-rendering: pixelated`) into a letterboxed 16:9 box.
 * The shaders a scene needs are compiled ahead, out of sight (playtest round 10: compiled on the
 * first frame drawn, they held the page on black): in parallel, where the browser can.
 */

import * as THREE from 'three';
import { FX, RENDER } from '../data/tuning';
import { createLanternShadow, type LanternShadow } from './lanternShadow';
import { createLampShadows, type LampShadows } from './lampShadows';
import { createMoonShadow, type MoonShadow } from './moonShadow';
import { createPostPass, type PostPass } from './postPass';
import { worldUniforms } from './worldMaterial';

export interface Pipeline {
  renderer: THREE.WebGLRenderer;
  post: PostPass;
  /** The moon's shadows (round 34): `render` says where and whether, and draws the map before the world. */
  shadow: MoonShadow;
  /** The lantern's shadows (round 34): drawn from the investigator in the way the camera looks, in the open night and under a roof alike. */
  lantern: LanternShadow;
  /** The lamps' shadows (round 35): `update` is told the lamps that may cast before the frame is drawn. */
  lamps: LampShadows;
  /** Internal render size in pixels (low-res target, or full canvas when pixelation is off). */
  size: THREE.Vector2;
  /** `scale` multiplies the low-res target (the settings menu's resolution scale). */
  resize(lowRes: boolean, scale?: number): void;
  /** `shadowAt`: where the shadow maps are centred (the investigator), or null for none (the setting off, not in the world: round 34); `moon`: the moon is drawn over the open ground too, and not under a roof or in a dungeon. */
  render(scene: THREE.Scene, camera: THREE.Camera, shadowAt?: { x: number; y: number; z: number } | null, moon?: boolean): void;
  /** Starts compiling every shader the scene and the post pass need; resolves once they can be drawn without a stall. */
  compile(scene: THREE.Scene, camera: THREE.Camera): Promise<void>;
  /** Compiles, then draws a frame (sending the GPU what the scene holds), so the next one shown comes at once. */
  warm(scene: THREE.Scene, camera: THREE.Camera): Promise<void>;
  /** The last frame's low-res picture as the world drew it, before the post pass: RGBA bytes, rows from the bottom (the glitch hunts read it: round 21). */
  grab(): { data: Uint8Array; width: number; height: number };
}

export function createPipeline(parent: HTMLElement): Pipeline {
  // Shaders work directly in display sRGB, so no colour-space conversions anywhere.
  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(1);
  renderer.setClearColor(new THREE.Color(...FX.fogColor));
  renderer.info.autoReset = false;
  parent.appendChild(renderer.domElement);

  const target = new THREE.WebGLRenderTarget(RENDER.width, RENDER.height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
    depthBuffer: true,
    depthTexture: new THREE.DepthTexture(RENDER.width, RENDER.height), // read by the volumetric fog (round 16)
  });
  const post = createPostPass(target.texture, target.depthTexture);
  const shadow = createMoonShadow();
  const lantern = createLanternShadow();
  const lamps = createLampShadows();
  worldUniforms.uMarkCharacters.value = 1; // the post pass reads characters from the target's alpha
  const size = new THREE.Vector2(RENDER.width, RENDER.height);

  const render = (scene: THREE.Scene, camera: THREE.Camera, shadowAt: { x: number; y: number; z: number } | null = null, moon = true): void => {
    renderer.info.reset();
    if (shadowAt) shadow.focus.set(shadowAt.x, shadowAt.y, shadowAt.z);
    shadow.enabled = !!shadowAt && moon;
    shadow.render(renderer, scene);
    lantern.enabled = !!shadowAt;
    lantern.render(renderer, scene, camera, shadowAt ?? shadow.focus);
    lamps.enabled = !!shadowAt;
    lamps.render(renderer, scene, shadowAt ?? shadow.focus);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(post.scene, post.camera);
  };
  /** Every program is also taken into use (its uniforms read) once compiled: that waits on the GPU, and would stall the first frame that draws it. */
  const compile = async (scene: THREE.Scene, camera: THREE.Camera): Promise<void> => {
    await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(post.scene, post.camera)]);
    for (const root of [scene, post.scene]) {
      root.traverse((o) => {
        for (const m of [(o as Partial<THREE.Mesh>).material ?? []].flat()) (renderer.properties.get(m) as { currentProgram?: THREE.WebGLProgram }).currentProgram?.getUniforms();
      });
    }
  };

  return {
    renderer,
    post,
    shadow,
    lantern,
    lamps,
    size,
    render,
    compile,
    async warm(scene, camera) {
      await compile(scene, camera);
      render(scene, camera);
    },
    grab() {
      const [width, height] = [target.width, target.height];
      const data = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(target, 0, 0, width, height, data);
      return { data, width, height };
    },
    resize(lowRes, scale = 1) {
      const aspect = RENDER.width / RENDER.height;
      const cssW = Math.min(innerWidth, innerHeight * aspect);
      const cssH = cssW / aspect;
      const dpr = devicePixelRatio || 1;
      const w = lowRes ? Math.round(RENDER.width * scale) : Math.round(cssW * dpr);
      const h = lowRes ? Math.round(RENDER.height * scale) : Math.round(cssH * dpr);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${cssW}px`;
      renderer.domElement.style.height = `${cssH}px`;
      target.setSize(w, h);
      size.set(w, h);
    },
  };
}
