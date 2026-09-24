/**
 * Render pipeline (spec §2): the world renders into a low-res target (default 400×225), then
 * the one post pass draws into a canvas of the same size, which CSS upscales nearest-neighbour
 * (`image-rendering: pixelated`) into a letterboxed 16:9 box.
 */

import * as THREE from 'three';
import { FX, RENDER } from '../data/tuning';
import { createPostPass, type PostPass } from './postPass';
import { worldUniforms } from './worldMaterial';

export interface Pipeline {
  renderer: THREE.WebGLRenderer;
  post: PostPass;
  /** Internal render size in pixels (low-res target, or full canvas when pixelation is off). */
  size: THREE.Vector2;
  resize(lowRes: boolean): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
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
  });
  const post = createPostPass(target.texture);
  worldUniforms.uMarkCharacters.value = 1; // the post pass reads characters from the target's alpha
  const size = new THREE.Vector2(RENDER.width, RENDER.height);

  return {
    renderer,
    post,
    size,
    resize(lowRes) {
      const aspect = RENDER.width / RENDER.height;
      const cssW = Math.min(innerWidth, innerHeight * aspect);
      const cssH = cssW / aspect;
      const dpr = devicePixelRatio || 1;
      const w = lowRes ? RENDER.width : Math.round(cssW * dpr);
      const h = lowRes ? RENDER.height : Math.round(cssH * dpr);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${cssW}px`;
      renderer.domElement.style.height = `${cssH}px`;
      target.setSize(w, h);
      size.set(w, h);
    },
    render(scene, camera) {
      renderer.info.reset();
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post.scene, post.camera);
    },
  };
}
