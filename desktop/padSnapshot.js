/**
 * What the SDL worker tells the game of the controllers (round 36): Chromium on macOS lists no pad
 * to the page, so the shell reads them natively (padWorker.js, with gamepad-node over SDL2) and
 * sends their state across as plain data. Pure, so the shape is tested without a controller.
 */

const round = (v) => Math.round((Number.isFinite(v) ? v : 0) * 1000) / 1000; // a stick's last digits are noise; a steady one sends nothing

/** The pads of a Gamepad API list (holes and disconnected ones left out) as plain objects the page's own Gamepad reading takes. */
export function snapshot(list) {
  const pads = [];
  for (const p of list ?? []) {
    if (!p || p.connected === false) continue;
    pads.push({
      index: pads.length, // the page's own numbering: SDL's leave gaps as pads come and go
      id: String(p.id ?? 'controller'),
      connected: true,
      mapping: p.mapping === 'standard' ? 'standard' : '',
      axes: Array.from(p.axes ?? [], round),
      buttons: Array.from(p.buttons ?? [], (b) => ({ pressed: !!b?.pressed, touched: !!(b?.touched ?? b?.pressed), value: round(b?.value ?? (b?.pressed ? 1 : 0)) })),
    });
  }
  return pads;
}

/** Whether two snapshots say the same (what is sent only when it changes). */
export const sameSnapshot = (a, b) => JSON.stringify(a) === JSON.stringify(b);
