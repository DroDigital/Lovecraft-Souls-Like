/**
 * How each region is laid out between its sites (world/regionPlan.ts): the road network's ground
 * and width, its towns (houses along their streets, in the region's building style), and how many
 * groves, walled graveyards, stone circles, ruins, rock outcrops and foes' camps it holds. Towns
 * are in metres from the region's south-west corner, like sites.ts.
 */

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
}

const layout = (road: RoadTexture, width: number, towns: readonly Town[], n: Partial<RegionLayout> = {}): RegionLayout => ({
  road, width, towns, groves: 0, graveyards: 0, circles: 0, ruins: 0, outcrops: 0, camps: 0, walls: false, ...n,
});
const town = (x: number, z: number, radius: number, style: HouseStyle, decay?: number): Town => ({ at: [x, z], radius, style, ...(decay && { decay }) });

export const REGION_LAYOUTS: Readonly<Record<string, RegionLayout>> = {
  hub: layout('cobble', 5, [town(256, 210, 110, 'brick')], { groves: 4, graveyards: 1, ruins: 1, outcrops: 1, camps: 3 }),
  arkham: layout('cobble', 5, [town(440, 256, 105, 'clapboard')], { groves: 3, graveyards: 2, ruins: 4, outcrops: 3, camps: 4, walls: true }),
  dunwich: layout('mud', 3.5, [town(430, 70, 55, 'hovel')], { groves: 5, graveyards: 1, circles: 3, ruins: 4, outcrops: 4, camps: 4, walls: true }),
  innsmouth: layout('cobble', 5, [town(96, 96, 120, 'clapboard', 0.35)], { graveyards: 1, ruins: 5, outcrops: 3, camps: 4 }),
  providence: layout('cobble', 5, [town(70, 250, 90, 'brick'), town(440, 130, 60, 'clapboard')], { groves: 3, graveyards: 2, ruins: 2, outcrops: 2, camps: 4, walls: true }),
  vermont: layout('mud', 3.5, [town(256, 70, 40, 'hovel')], { groves: 8, ruins: 2, outcrops: 5, camps: 4, walls: true, pines: true }),
  mountains: layout('snow', 4, [], { ruins: 4, outcrops: 7, camps: 3 }),
  pnakotus: layout('slab', 4, [], { ruins: 7, circles: 2, outcrops: 4, camps: 4 }),
  kn_yan: layout('cobble', 5, [town(256, 150, 90, 'stone', 0.3)], { ruins: 5, circles: 1, outcrops: 3, camps: 4 }),
  dreamlands: layout('cobble', 4.5, [town(740, 700, 80, 'stone')], { groves: 12, graveyards: 1, circles: 2, ruins: 6, outcrops: 4, camps: 6, pines: true }),
  rlyeh: layout('slab', 5, [], { ruins: 7, circles: 3, outcrops: 3, camps: 3 }),
  yuggoth: layout('slab', 5, [], { ruins: 5, circles: 3, outcrops: 4, camps: 4 }),
  beyond: layout('slab', 4, [], { circles: 5, ruins: 3, outcrops: 2, camps: 2 }),
};
