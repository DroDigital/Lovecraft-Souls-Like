/**
 * What a far titan carries beyond its silhouette (round 26: a flat shape a shade darker than the haze was
 * all but lost against the night): a faint halo of the mist behind it, lit from somewhere it should not
 * be, so the shape stands out against it; and two eyes, which open and shut now and then. Children of the
 * silhouette's mesh (skyline.ts), so they keep its place and its size; drawn with it, added to the sky.
 */

import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

const HALO = `uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
void main() {
  vec2 c = (vUv - vec2(0.5, 0.42)) * vec2(1.0, 1.25);
  gl_FragColor = vec4(uColor, uAlpha * 0.3 * smoothstep(0.5, 0.0, length(c)));
}`;

const EYES = `uniform vec3 uColor; uniform float uAlpha; uniform float uOpen; varying vec2 vUv;
float dot2(vec2 p, vec2 at) { float d = length((p - at) * vec2(1.0, 2.6)); return smoothstep(0.2, 0.0, d); }
void main() {
  float e = dot2(vUv, vec2(0.36, 0.5)) + dot2(vUv, vec2(0.64, 0.5));
  gl_FragColor = vec4(uColor, uAlpha * uOpen * clamp(e, 0.0, 1.0));
}`;

const ADD = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor, // added to the sky...
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor, // ...its alpha kept (the post pass reads it)
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
} as const;

export interface TitanGlow {
  halo: THREE.Mesh;
  eyes: THREE.Mesh;
  /** The eyes' lids at `time`: open, for the most part, and shut for a moment every so often. */
  blink(time: number): void;
}

const quad = new THREE.PlaneGeometry(1, 1);

export function titanGlow(alpha: { value: number }, color: readonly [number, number, number], seed: number): TitanGlow {
  const uColor = { value: new THREE.Vector3(...color) };
  const open = { value: 1 };
  const halo = new THREE.Mesh(quad, new THREE.ShaderMaterial({ uniforms: { uColor, uAlpha: alpha }, vertexShader: VERT, fragmentShader: HALO, ...ADD }));
  halo.position.set(0, 0.45, 0);
  halo.scale.set(1.9, 1.7, 1);
  halo.renderOrder = -999.5;
  halo.frustumCulled = false;
  const eyes = new THREE.Mesh(quad, new THREE.ShaderMaterial({ uniforms: { uColor, uAlpha: alpha, uOpen: open }, vertexShader: VERT, fragmentShader: EYES, ...ADD }));
  eyes.position.set(0.02, 0.81, 0);
  eyes.scale.set(0.11, 0.04, 1);
  eyes.renderOrder = -998.9;
  eyes.frustumCulled = false;
  return {
    halo,
    eyes,
    blink(time) {
      const t = (time * 0.11 + seed * 0.37) % 1; // a slow turn of the dial: shut for a twentieth of it
      open.value = t > 0.95 ? Math.max(0, 1 - (1 - Math.abs(t - 0.975) / 0.025) * 1.1) : 0.75 + 0.25 * Math.sin(time * 0.9 + seed);
    },
  };
}
