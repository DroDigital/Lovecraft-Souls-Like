/** Types for icon.js (the desktop shell runs it as plain JavaScript). */

/** A node Buffer, as far as the tests read one. */
export interface Png extends Uint8Array {
  readUInt32BE(offset: number): number;
  indexOf(value: string | number): number;
}

export function iconPixels(size: number): Uint8Array;

export function iconPng(size?: number): Png;
