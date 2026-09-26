/**
 * The desktop shell (playtest round 11; what ships on Steam): the built game in its own window. A
 * browser holds a page's sound until its first key press or click, so on the web the title waits
 * for one; the shell lets the game sound from the start, so the title's theme plays as the game
 * boots and it opens straight into the main menu (music.ts, main.ts). The game is served from
 * `dist/` on an `app://` scheme (serve.js), as from a web server. `npm run desktop` builds it and
 * opens the shell; `npm run desktop:dev` opens the running dev server (`npm run dev`) in it instead.
 */

import { app, BrowserWindow, protocol } from 'electron';
import { fileURLToPath } from 'node:url';
import { serveFrom } from './serve.js';

const ORIGIN = 'app://seventy-steps';
const DEV = process.argv.includes('--dev');
const URL_TO_OPEN = DEV ? 'http://localhost:5173/' : `${ORIGIN}/`;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // the theme sounds at once
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

function open() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    title: 'Seventy Steps',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { autoplayPolicy: 'no-user-gesture-required', contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => win.show());
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

void app.whenReady().then(() => {
  protocol.handle('app', serveFrom(fileURLToPath(new URL('../dist/', import.meta.url))));
  open();
});
app.on('window-all-closed', () => app.quit());
