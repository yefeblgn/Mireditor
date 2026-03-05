const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  onStatus: (callback) => ipcRenderer.on('splash-status', (_e, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('splash-progress', (_e, data) => callback(data)),
  onReady: (callback) => ipcRenderer.on('splash-ready', () => callback()),
});
