/** Types for serve.js (the desktop shell runs it as plain JavaScript). */

export function byteRange(header: string | null | undefined, size: number): { start: number; end: number } | null;

export function serveFrom(root: string): (request: Request) => Promise<Response>;
