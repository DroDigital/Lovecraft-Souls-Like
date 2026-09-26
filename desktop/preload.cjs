/**
 * The desktop shell's bridge (playtest round 12): what the game may ask of its window, and nothing
 * more, exposed as `window.desktop` (ui/desktop.ts). CommonJS, as a sandboxed preload must be.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.invoke('desktop:quit'),
  setFullscreen: (on) => ipcRenderer.invoke('desktop:fullscreen', !!on),
  isFullscreen: () => ipcRenderer.invoke('desktop:is-fullscreen'),
});
