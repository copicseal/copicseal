import type { Storage } from '../../types.d.ts';
import { ipcRenderer } from 'electron/renderer';

export function getStorage(): Storage {
  return {
    get(key) {
      return ipcRenderer.invoke('config:get', key);
    },
    set(key, value) {
      return ipcRenderer.invoke('config:set', key, value);
    },
    delete(key) {
      return ipcRenderer.invoke('config:delete', key);
    },
  };
}
