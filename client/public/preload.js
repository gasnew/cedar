const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  on: ipcRenderer.on,
  send: ipcRenderer.send,
  removeListener: ipcRenderer.removeListener,
});
