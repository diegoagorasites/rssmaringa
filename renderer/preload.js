const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  abrirConfig: () => ipcRenderer.invoke('abrir-config'),
  salvarConfig: (config) => ipcRenderer.invoke('salvar-config', config),
  onProcessoStatus: (callback) => ipcRenderer.on('processo-status', callback)
});
