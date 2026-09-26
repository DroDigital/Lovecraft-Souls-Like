import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { byteRange, serveFrom } from '../desktop/serve.js';

const THEME = 'public/music/subterranean-pulse.mp3';
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const get = (path: string, range?: string): Request => new Request(`app://seventy-steps${path}`, range ? { headers: { range } } : undefined);

describe('the desktop shell serves the built game (playtest round 11)', () => {
  it('reads the byte ranges a media element asks for when it seeks', () => {
    expect(byteRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
    expect(byteRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 });
    expect(byteRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
    expect(byteRange('bytes=500-5000', 1000)).toEqual({ start: 500, end: 999 });
    for (const bad of [null, undefined, '', 'bytes=-', 'items=0-9']) expect(byteRange(bad, 1000)).toBeNull();
  });

  it('serves the theme whole, and any part of it the player seeks to', async () => {
    const serve = serveFrom('public');
    const file = readFileSync(THEME);
    const whole = await serve(get('/music/subterranean-pulse.mp3'));
    expect(whole.status).toBe(200);
    expect(whole.headers.get('content-type')).toBe('audio/mpeg');
    expect(whole.headers.get('accept-ranges')).toBe('bytes');
    expect(same(new Uint8Array(await whole.arrayBuffer()), file)).toBe(true);
    const part = await serve(get('/music/subterranean-pulse.mp3', 'bytes=1000-1999'));
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe(`bytes 1000-1999/${file.length}`);
    expect(same(new Uint8Array(await part.arrayBuffer()), file.subarray(1000, 2000))).toBe(true);
    expect((await serve(get('/music/subterranean-pulse.mp3', `bytes=${file.length}-`))).status).toBe(416);
  });

  it('opens on the index, and serves nothing outside the game', async () => {
    const index = await serveFrom('.')(get('/')); // the page itself (dist/ holds its built twin)
    expect(index.status).toBe(200);
    expect(index.headers.get('content-type')).toContain('text/html');
    expect(await index.text()).toContain('<title>Seventy Steps</title>');
    const serve = serveFrom('public');
    expect((await serve(get('/missing.js'))).status).toBe(404);
    expect((await serve(get('/%2e%2e%2fpackage.json'))).status).toBe(403);
  });
});
