const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  on: ipcRenderer.on,
  send: ipcRenderer.send,
  invoke: ipcRenderer.invoke,
  removeListener: ipcRenderer.removeListener,
});
