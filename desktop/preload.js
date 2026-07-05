const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crushDesktop', {
  platform: process.platform,
  isDesktop: true,
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
});
