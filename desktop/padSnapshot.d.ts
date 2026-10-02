/** Types for padSnapshot.js (the desktop shell runs it as plain JavaScript). */

export interface PadData {
  index: number;
  id: string;
  connected: boolean;
  mapping: string;
  axes: number[];
  buttons: { pressed: boolean; touched: boolean; value: number }[];
}

export function snapshot(list: ArrayLike<unknown> | null | undefined): PadData[];

export function sameSnapshot(a: readonly PadData[], b: readonly PadData[]): boolean;
