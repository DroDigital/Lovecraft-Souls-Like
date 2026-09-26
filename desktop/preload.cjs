/**
 * The desktop shell's bridge (playtest round 12): what the game may ask of its window, and nothing
 * more, exposed as `window.desktop` (ui/desktop.ts): quitting, fullscreen, and the storage of saves as
 * files. CommonJS, as a sandboxed preload must be.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
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
