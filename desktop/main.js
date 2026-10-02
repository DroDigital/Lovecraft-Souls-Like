/**
 * The desktop shell (playtest round 11; what ships on Steam): the built game in its own window. A
 * browser holds a page's sound until its first key press or click, so on the web the title waits
 * for one; the shell lets the game sound from the start, so the title's theme plays as the game
 * boots and it opens straight into the main menu (music.ts, main.ts). The game is served from
 * `dist/` on an `app://` scheme (serve.js), as from a web server. `npm run desktop` builds it and
 * opens the shell; `npm run desktop:dev` opens the running dev server (`npm run dev`) in it instead.
 * Round 12: the window keeps its size, place and fullscreen from one run to the next (window.json),
 * wears the Elder Sign drawn in code (icon.js), and the game's saves, settings and records are files
 * in the user's data folder (saves/, where Steam Cloud can find them), not the browser's storage.
 * Round 36: controllers are read natively too (padWorker.js, gamepad-node over SDL2), for Chromium on
 * macOS lists none to the page; the page reads them from the bridge when the browser's list is empty.
 */

import { app, BrowserWindow, ipcMain, nativeImage, protocol, screen, utilityProcess } from 'electron';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconPng } from './icon.js';
import { serveFrom } from './serve.js';

const ORIGIN = 'app://seventy-steps';
const DEV = process.argv.includes('--dev');
const URL_TO_OPEN = DEV ? 'http://localhost:5173/' : `${ORIGIN}/`;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // the theme sounds at once
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

/** Writes `text` to `file` whole or not at all (a crash mid-write leaves the old one). */
function writeWhole(file, text) {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(`${file}.tmp`, text);
  renameSync(`${file}.tmp`, file);
}

const windowFile = () => join(app.getPath('userData'), 'window.json');

/** The window as it was left: its bounds (if they still fall on a screen) and whether it filled it. */
function lastWindow() {
  try {
    const w = JSON.parse(readFileSync(windowFile(), 'utf8'));
    const ok = [w.x, w.y, w.width, w.height].every(Number.isFinite) && screen.getAllDisplays().some(({ workArea: a }) => w.x < a.x + a.width && w.x + w.width > a.x && w.y < a.y + a.height && w.y + w.height > a.y);
    return { bounds: ok ? { x: w.x, y: w.y, width: w.width, height: w.height } : null, fullscreen: !!w.fullscreen, maximized: !!w.maximized };
  } catch {
    return { bounds: null, fullscreen: true, maximized: true }; // the first run fills the screen (round 13)
  }
}

function open() {
  const last = lastWindow();
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    ...last.bounds,
    icon: nativeImage.createFromBuffer(iconPng(256)),
    minWidth: 640,
    minHeight: 360,
    title: 'Seventy Steps',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false, // round 31: a window tabbed away from kept loading and running (frames and timers are not slowed or stopped behind another window)
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)), // window.desktop: quit, fullscreen
    },
  });
  win.once('ready-to-show', () => {
    if (last.maximized) win.maximize();
    win.setFullScreen(last.fullscreen);
    win.show();
    win.focus();
    win.webContents.focus(); // the page must have the focus for Chromium to report a pad at all (round 31)
  });
  win.on('focus', () => win.webContents.focus()); // and again on returning to the window
  win.on('close', () => {
    try {
      writeWhole(windowFile(), JSON.stringify({ ...win.getNormalBounds(), fullscreen: win.isFullScreen(), maximized: win.isMaximized() }));
    } catch {
      // The next run opens at the default size.
    }
  });
  win.webContents.on('before-input-event', (event, input) => {
    const toggle = input.type === 'keyDown' && (input.key === 'F11' || (input.key === 'Enter' && input.alt));
    if (!toggle) return;
    event.preventDefault();
    win.setFullScreen(!win.isFullScreen());
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(DEV ? 'http://localhost:5173/' : ORIGIN)) event.preventDefault(); // it only ever reloads itself
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  void win.loadURL(URL_TO_OPEN);
}

ipcMain.handle('desktop:quit', () => app.quit());
// An achievement earned: the game keeps it itself; this is where Steamworks will be told, once the shell carries it.
ipcMain.handle('desktop:achieve', () => false);

// The game's storage as files, one a key (sync, as the Web Storage API it stands in for is).
const keyFile = (key) => join(app.getPath('userData'), 'saves', `${String(key).replace(/[^A-Za-z0-9_-]+/g, '_')}.json`);
ipcMain.on('desktop:store-get', (e, key) => {
  try {
    e.returnValue = readFileSync(keyFile(key), 'utf8');
  } catch {
    e.returnValue = null;
  }
});
ipcMain.on('desktop:store-set', (e, key, value) => {
  try {
    writeWhole(keyFile(key), String(value));
    e.returnValue = true;
  } catch {
    e.returnValue = false;
  }
});
ipcMain.on('desktop:store-remove', (e, key) => {
  rmSync(keyFile(key), { force: true });
  e.returnValue = true;
});
ipcMain.handle('desktop:fullscreen', (e, on) => BrowserWindow.fromWebContents(e.sender)?.setFullScreen(!!on));
ipcMain.handle('desktop:is-fullscreen', (e) => !!BrowserWindow.fromWebContents(e.sender)?.isFullScreen());

// The controllers, as the SDL worker reports them: kept here, and sent to every window as they change.
let pads = [];
let padStarts = 0;
let quitting = false;
app.on('before-quit', () => void (quitting = true));
function startPads() {
  const worker = utilityProcess.fork(fileURLToPath(new URL('./padWorker.js', import.meta.url)), [], { serviceName: 'Seventy Steps controllers', stdio: 'inherit' });
  worker.on('message', (m) => {
    if (m?.type === 'unavailable') console.warn(`controllers: SDL is not available (${m.reason}); the browser's own list is used`);
    if (m?.type !== 'pads') return;
    pads = m.pads;
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('desktop:pads', pads);
  });
  worker.on('exit', (code) => {
    pads = [];
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('desktop:pads', pads);
    if (!quitting && code !== 0 && padStarts++ < 3) setTimeout(startPads, 1000); // a fault in the native module stops the pads for a moment, not the game
  });
}
ipcMain.handle('desktop:pads-get', () => pads); // a page loaded (or reloaded) after the pads were found asks for them once

void app.whenReady().then(() => {
  startPads();
  protocol.handle('app', serveFrom(fileURLToPath(new URL('../dist/', import.meta.url))));
  open();
});
app.on('window-all-closed', () => app.quit());
