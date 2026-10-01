/**
 * How each region is laid out between its sites (world/regionPlan.ts): the road network's ground
 * and width, its towns (houses along their streets, in the region's building style), and how many
 * groves, walled graveyards, stone circles, ruins, rock outcrops and foes' camps it holds, the
 * realms beyond their own landmarks (round 12), and what fills the land between (round 32): copses,
 * wayside stones and farmsteads, not named places. Towns are in metres from the region's south-west
 * corner, like sites.ts.
 */

import type { PropKind } from './regions';
import type { At } from './sites';

export type HouseStyle = 'clapboard' | 'brick' | 'hovel' | 'stone';
export type RoadTexture = 'cobble' | 'mud' | 'sand' | 'slab' | 'snow';

export interface Town {
  at: At;
  radius: number;
  style: HouseStyle;
  decay?: number; // 0..1: the share of houses fallen into ruin (Innsmouth)
}

export interface RegionLayout {
  road: RoadTexture;
  width: number; // metres
  towns: readonly Town[];
  groves: number;
  graveyards: number;
  circles: number;
  ruins: number;
  outcrops: number;
  camps: number;
  walls: boolean; // New England field walls along the roads
  pines?: boolean; // groves of dark conifers rather than dead hardwood
  landmarks: number; // the realm's own landmarks (round 12)...
  landmark?: PropKind; // ...of this kind
  copses: number; // round 32: close stands of trees between the groves...
  waymarks: number; // ...a stone, cross or lamp by the way...
  farms: number; // ...and farmsteads (built in `farm`'s style)
  farm?: HouseStyle;
}

const layout = (road: RoadTexture, width: number, towns: readonly Town[], n: Partial<RegionLayout> = {}): RegionLayout => ({
  road, width, towns, groves: 0, graveyards: 0, circles: 0, ruins: 0, outcrops: 0, camps: 0, walls: false, landmarks: 0, copses: 0, waymarks: 0, farms: 0, ...n,
});
const town = (x: number, z: number, radius: number, style: HouseStyle, decay?: number): Town => ({ at: [x, z], radius, style, ...(decay && { decay }) });

export const REGION_LAYOUTS: Readonly<Record<string, RegionLayout>> = {
  hub: layout('cobble', 5, [town(256, 210, 110, 'brick')], { groves: 4, graveyards: 1, ruins: 1, outcrops: 1, camps: 3, copses: 16, waymarks: 8 }),
  arkham: layout('cobble', 5, [town(440, 256, 105, 'clapboard')], { groves: 3, graveyards: 2, ruins: 4, outcrops: 3, camps: 4, walls: true, copses: 14, waymarks: 8, farms: 4 }),
  dunwich: layout('mud', 3.5, [town(430, 70, 55, 'hovel')], { groves: 5, graveyards: 1, circles: 3, ruins: 4, outcrops: 4, camps: 4, walls: true, copses: 14, waymarks: 8, farms: 5, farm: 'hovel' }),
  innsmouth: layout('cobble', 5, [town(96, 96, 120, 'clapboard', 0.35)], { graveyards: 1, ruins: 5, outcrops: 3, camps: 4, copses: 6, waymarks: 6 }),
  providence: layout('cobble', 5, [town(70, 250, 90, 'brick'), town(440, 130, 60, 'clapboard')], { groves: 3, graveyards: 2, ruins: 2, outcrops: 2, camps: 4, walls: true, copses: 12, waymarks: 8, farms: 3 }),
  vermont: layout('mud', 3.5, [town(256, 70, 40, 'hovel')], { groves: 8, ruins: 2, outcrops: 5, camps: 4, walls: true, pines: true, copses: 22, waymarks: 6, farms: 3, farm: 'hovel' }),
  mountains: layout('snow', 4, [], { ruins: 4, outcrops: 7, camps: 3, landmarks: 4, landmark: 'cone', waymarks: 6 }),
  pnakotus: layout('slab', 4, [], { ruins: 7, circles: 2, outcrops: 4, camps: 4, landmarks: 5, landmark: 'block', waymarks: 6 }),
  kn_yan: layout('slab', 4.5, [], { ruins: 6, circles: 2, outcrops: 5, camps: 4, landmarks: 4, landmark: 'pyramid', waymarks: 6 }), // no New England town under the earth (round 12)
  dreamlands: layout('cobble', 4.5, [town(740, 700, 80, 'stone')], { groves: 12, graveyards: 1, circles: 2, ruins: 6, outcrops: 4, camps: 6, pines: true, copses: 40, waymarks: 14, farms: 4, farm: 'stone' }),
  rlyeh: layout('slab', 5, [], { ruins: 7, circles: 3, outcrops: 3, camps: 3, landmarks: 5, landmark: 'spire', waymarks: 6 }),
  yuggoth: layout('slab', 5, [], { ruins: 5, circles: 3, outcrops: 4, camps: 4, landmarks: 5, landmark: 'tower', waymarks: 6 }),
  beyond: layout('slab', 4, [], { circles: 5, ruins: 3, outcrops: 2, camps: 2, landmarks: 6, landmark: 'globe', waymarks: 4 }),
};
