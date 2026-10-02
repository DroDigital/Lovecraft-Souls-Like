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

uniform sampler2D uLShadowMap;
uniform mat4 uLShadowView; // world to the lantern's view
uniform mat4 uLShadowProj; // and its view to the map's clip
uniform vec2 uLShadowNF; // near and far
uniform vec4 uLShadow; // strength (0: no shadows), a texel, the bias in metres, the offset along the normal (metres)

// The lantern's depth map holds the window depth of what stands nearest in each direction; the metres it is, along the map's axis.
float lanternDepth(vec2 uv) {
  float d = texture(uLShadowMap, uv).r;
  return uLShadowNF.x * uLShadowNF.y / (uLShadowNF.y - d * (uLShadowNF.y - uLShadowNF.x));
}

// 1 where the lantern reaches wp (surface normal n), 0 where something solid stands between: four taps, turned, over a map drawn from the far faces of what is solid.
float lanternLit(vec3 wp, vec3 n) {
  if (uLShadow.x <= 0.0) return 1.0;
  vec4 lp = uLShadowView * vec4(wp + n * uLShadow.w, 1.0);
  float z = -lp.z;
  if (z <= uLShadowNF.x || z >= uLShadowNF.y) return 1.0;
  vec4 cl = uLShadowProj * lp;
  vec2 uv = cl.xy / cl.w * 0.5 + 0.5;
  float e = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
  if (e >= 1.0) return 1.0;
  float b = z - (uLShadow.z + 0.01 * z);
  vec2 t = vec2(uLShadow.y) * 1.25;
  // Eight taps in two turns (round 35: four, nearest, made an edge a staircase that crawled as the light moved): the same eight every pixel, so nothing shimmers.
  float lit = step(b, lanternDepth(uv + t * vec2(-0.9, -0.3))) + step(b, lanternDepth(uv + t * vec2(-0.3, -0.9)))
            + step(b, lanternDepth(uv + t * vec2(0.3, -0.9))) + step(b, lanternDepth(uv + t * vec2(0.9, -0.3)))
            + step(b, lanternDepth(uv + t * vec2(0.9, 0.3))) + step(b, lanternDepth(uv + t * vec2(0.3, 0.9)))
            + step(b, lanternDepth(uv + t * vec2(-0.3, 0.9))) + step(b, lanternDepth(uv + t * vec2(-0.9, 0.3)));
  return mix(1.0, 0.125 * lit, 1.0 - smoothstep(0.72, 0.98, e));
}
`;
