/**
 * Where a lamp's light does not reach (round 35; render/lampShadows.ts draws the maps): the lamp's share of the light at a point, from the depth map of the nearest few lamps. Pure GLSL.
 */

export const LAMP_SHADOW_GLSL = /* glsl */ `
uniform sampler2D uLSMap[3]; // the lamps' depth maps (lampShadows.ts; round 35), how each is looked through...
uniform mat4 uLSView[3];
uniform mat4 uLSProj[3];
uniform vec4 uLSInfo[3]; // ...near, far, a texel, and how far its shadow has come in
uniform vec4 uLSBias; // strength, bias (metres), offset along the normal (metres)

float lampTap(int k, vec2 uv, float b) {
  vec2 nf = uLSInfo[k].xy;
  float d = 1.0;
  if (k == 0) d = texture(uLSMap[0], uv).r;
  else if (k == 1) d = texture(uLSMap[1], uv).r;
  else d = texture(uLSMap[2], uv).r;
  return step(b, nf.x * nf.y / (nf.y - d * (nf.y - nf.x)));
}

// The share of lamp map k's light that reaches wp (surface normal n): 1 in the open, less behind something solid; the same eight taps at every pixel.
float lampShadowOf(int k, vec3 wp, vec3 n) {
  vec4 lp = uLSView[k] * vec4(wp + n * uLSBias.z, 1.0);
  float z = -lp.z;
  vec2 nf = uLSInfo[k].xy;
  if (z <= nf.x || z >= nf.y) return 1.0;
  vec4 cl = uLSProj[k] * lp;
  vec2 uv = cl.xy / cl.w * 0.5 + 0.5;
  float e = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
  if (e >= 1.0) return 1.0;
  float b = z - (uLSBias.y + 0.012 * z);
  vec2 t = vec2(uLSInfo[k].z) * 1.4;
  float lit = lampTap(k, uv + t * vec2(-0.9, -0.3), b) + lampTap(k, uv + t * vec2(-0.3, -0.9), b) + lampTap(k, uv + t * vec2(0.3, -0.9), b) + lampTap(k, uv + t * vec2(0.9, -0.3), b)
            + lampTap(k, uv + t * vec2(0.9, 0.3), b) + lampTap(k, uv + t * vec2(0.3, 0.9), b) + lampTap(k, uv + t * vec2(-0.3, 0.9), b) + lampTap(k, uv + t * vec2(-0.9, 0.3), b);
  float share = mix(1.0, lit * 0.125, 1.0 - smoothstep(0.72, 0.98, e));
  return mix(1.0, share, uLSBias.x * uLSInfo[k].w);
}
`;
