/**
 * Where the moon's light does not reach (round 34; render/moonShadow.ts draws the map): a point looked
 * up in the depth map drawn from the moon is lit if nothing stands between it and the moon, shaded if
 * something does. Four taps, turned, so an edge is a little soft and not a staircase. Pure GLSL.
 */

export const SHADOW_GLSL = /* glsl */ `
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat; // world to the map's 0..1 (x, y across it, z along the moon's rays)
uniform vec4 uShadow; // strength (0: no shadows), a texel, the bias in depth units, the offset along the normal (metres)

// 1 where the moon reaches wp (its surface normal n, turned ndl to the moon), 0 where something stands in front of it.
float moonLit(vec3 wp, vec3 n, float ndl) {
  if (uShadow.x <= 0.0) return 1.0;
  vec3 c = (uShadowMat * vec4(wp + n * uShadow.w * (1.0 + 2.0 * (1.0 - ndl)), 1.0)).xyz;
  float e = max(abs(c.x - 0.5), abs(c.y - 0.5)) * 2.0;
  if (e >= 1.0 || c.z >= 1.0 || c.z <= 0.0) return 1.0;
  float b = uShadow.z * (1.0 + 2.0 * (1.0 - ndl));
  vec2 t = vec2(uShadow.y);
  float lit = step(c.z - b, texture(uShadowMap, c.xy + t * vec2(-0.7, -0.3)).r)
            + step(c.z - b, texture(uShadowMap, c.xy + t * vec2(0.3, -0.7)).r)
            + step(c.z - b, texture(uShadowMap, c.xy + t * vec2(0.7, 0.3)).r)
            + step(c.z - b, texture(uShadowMap, c.xy + t * vec2(-0.3, 0.7)).r);
  return mix(1.0, 0.25 * lit, 1.0 - smoothstep(0.7, 0.97, e));
}
`;
