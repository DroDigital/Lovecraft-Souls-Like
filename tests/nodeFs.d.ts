/** The few node:fs (and node:zlib) calls the tests make, typed here: the project carries no @types/node (Vitest runs in Node). */
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readFileSync(path: string): Uint8Array;
  export function statSync(path: string): { size: number };
  export function appendFileSync(path: string, data: string): void;
  export function writeFileSync(path: string, data: string): void;
}
declare module 'node:zlib' {
  export function inflateSync(data: Uint8Array): Uint8Array;
}
