import type { CaptureOptions } from '../main/utils/capture.ts';
import type { WindowAPI } from '../types.d.ts';
import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron/renderer';
import { getStorage } from './utils/storage.ts';

// Custom APIs for renderer
const api: WindowAPI = {
  onWinResized: (callback: () => void) => {
    ipcRenderer.on('resized', callback);
    return () => void ipcRenderer.off('resized', callback);
  },
  captureDOM: (options: CaptureOptions) => {
    return ipcRenderer.invoke('captureDOM', options);
  },
  openDirectoryDialog: () => ipcRenderer.invoke('openDirectoryDialog'),
  showCtxMenu: async (menus) => {
    menus.forEach((menu) => {
      menu.id = menu.id || Math.random().toString(36).slice(2);
    });
    const id = await ipcRenderer.invoke('showCtxMenu', menus.map(menu => ({ ...menu, click: null })));
    menus.forEach((menu) => {
      if (menu.id === id) {
        menu.click?.(menu);
      }
    });
    return id;
  },
  openTargetPath: targetPath => ipcRenderer.invoke('openTargetPath', targetPath),
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
  getSysFonts: () => ipcRenderer.invoke('getSysFonts'),
  getStorage,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  }
  catch (error) {
    console.error(error);
  }
}
else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
}
