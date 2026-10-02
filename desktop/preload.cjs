/**
 * The desktop shell's bridge (playtest round 12): what the game may ask of its window, and nothing
 * more, exposed as `window.desktop` (ui/desktop.ts): quitting, fullscreen, the storage of saves as
 * files, and (round 36) the controllers read natively. CommonJS, as a sandboxed preload must be.
 */

const { contextBridge, ipcRenderer } = require('electron');

// The controllers the shell reads natively (padWorker.js): the latest state, stamped as it arrives.
let pads = [];
const take = (list) => void (pads = (Array.isArray(list) ? list : []).map((p) => ({ ...p, timestamp: performance.now() })));
ipcRenderer.on('desktop:pads', (_e, list) => take(list));
void ipcRenderer.invoke('desktop:pads-get').then(take, () => undefined);

contextBridge.exposeInMainWorld('desktop', {
  pads: () => pads, // as navigator.getGamepads() lists them, for the page to read when the browser lists none (core/pads.ts)
  quit: () => ipcRenderer.invoke('desktop:quit'),
  setFullscreen: (on) => ipcRenderer.invoke('desktop:fullscreen', !!on),
  isFullscreen: () => ipcRenderer.invoke('desktop:is-fullscreen'),
  achieve: (id) => ipcRenderer.invoke('desktop:achieve', String(id)), // an achievement earned (round 12)
  store: { // saves, settings and records as files in the user's data folder (round 12)
    get: (key) => ipcRenderer.sendSync('desktop:store-get', String(key)),
    set: (key, value) => ipcRenderer.sendSync('desktop:store-set', String(key), String(value)),
    remove: (key) => ipcRenderer.sendSync('desktop:store-remove', String(key)),
  },
});
