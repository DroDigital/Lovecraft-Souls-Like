/**
 * World material GLSL (spec §2): Gouraud vertex lighting, PS1 vertex snapping, affine
 * texture wobble (uv·w passed through, divided per fragment), fog fading to near-black, and
 * sanity-driven non-Euclidean vertex displacement.
 */

export const WORLD_VERT = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
uniform float uSnap;
uniform float uDisplace;
uniform vec3 uCamPos;
uniform float uDispAmp;
uniform float uDispFreq;
uniform float uDispSafe;
uniform float uDispFull;
uniform float uTwist;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uGlowPos;
uniform vec3 uGlowColor;
uniform float uGlowRange;
uniform float uFogNear;
uniform float uFogFar;
uniform float uEmissive;
uniform vec2 uUvScale;
uniform vec2 uUvScroll;

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying float vFog;

// Non-Euclidean distortion. Nothing moves near the camera, so combat stays readable.
vec3 displace(vec3 wp) {
  vec3 rel = wp - uCamPos;
  float d = length(rel.xz);
  float w = smoothstep(uDispSafe, uDispFull, d) * uDisplace;
  if (w <= 0.0) return wp;
  float f = uDispFreq;
  wp += w * uDispAmp * vec3(
    sin(wp.y * f * 1.7 + wp.z * f + uTime * 1.3),
    0.5 * sin(wp.x * f + wp.z * f * 0.8 + uTime * 0.9),
    sin(wp.x * f * 1.3 + wp.y * f * 1.9 + uTime * 1.1));
  float a = w * uTwist * sin(uTime * 0.21 + d * 0.05);
  rel = wp - uCamPos;
  wp.xz = uCamPos.xz + mat2(cos(a), sin(a), -sin(a), cos(a)) * rel.xz;
  return wp;
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  wp.xyz = displace(wp.xyz);

  vec4 vp = viewMatrix * wp;
  vec4 clip = projectionMatrix * vp;
  if (uSnap > 0.0 && clip.w > 0.0) {
    vec2 grid = uRes * 0.5 / uSnap;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  gl_Position = clip;

  vec2 uv0 = uv * uUvScale + uUvScroll * uTime;
  vUv = uv0;
  vUvw = vec3(uv0 * clip.w, clip.w);

  vec3 light = uAmbient + uLightColor * max(dot(wn, uLightDir), 0.0);
  vec3 toGlow = uGlowPos - wp.xyz;
  float gd = length(toGlow);
  float fall = clamp(1.0 - gd / uGlowRange, 0.0, 1.0);
  light += uGlowColor * fall * fall * (0.35 + 0.65 * max(dot(wn, toGlow / max(gd, 0.001)), 0.0));
  vec3 tint = vec3(1.0);
#ifdef USE_COLOR
  tint = color;
#endif
  vLight = mix(light, vec3(1.0), uEmissive) * tint;
  vFog = clamp((-vp.z - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
}
`;

export const WORLD_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uAffine;
uniform vec3 uFogColor;
uniform float uFogAmount;

varying vec2 vUv;
varying vec3 vUvw;
varying vec3 vLight;
varying float vFog;

void main() {
  // WebGL2 has no noperspective: uv·w / w interpolates affinely, like the PS1.
  vec2 uv = mix(vUv, vUvw.xy / vUvw.z, uAffine);
  vec3 col = texture(uMap, uv).rgb * vLight;
  gl_FragColor = vec4(mix(col, uFogColor, vFog * uFogAmount), 1.0);
}
`;
