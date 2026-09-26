/**
 * The desktop shell's files (playtest round 11): the built game, served from `root` to the shell's
 * `app://` scheme (main.js), so its modules, its fetches and its media load as they do from a web
 * server. Byte ranges are honoured, as a media element asks for them to seek (the title's theme
 * leaps back to loop).
 */

import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

/** The part of a file of `size` bytes a Range header asks for, or null for all of it. */
export function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1;
  return { start, end };
}

/** Answers requests for files under `root` (the built game): its index at `/`, nothing outside it. */
export function serveFrom(root) {
  const base = resolve(root);
  return async (request) => {
    const path = decodeURIComponent(new URL(request.url).pathname);
    const file = resolve(base, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(base + sep)) return new Response(null, { status: 403 });
    let data;
    try {
      data = await readFile(file);
    } catch {
      return new Response(null, { status: 404 });
    }
    const headers = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'accept-ranges': 'bytes' };
    const range = byteRange(request.headers.get('range'), data.length);
    if (!range) return new Response(data, { headers: { ...headers, 'content-length': String(data.length) } });
    if (range.start >= data.length || range.start > range.end) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${data.length}` } });
    }
    return new Response(data.subarray(range.start, range.end + 1), {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${range.start}-${range.end}/${data.length}`, 'content-length': String(range.end - range.start + 1) },
    });
  };
}
