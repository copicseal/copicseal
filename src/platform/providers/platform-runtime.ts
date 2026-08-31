import * as tauriApi from './tauri/api';
import { webFiles } from './web/web-platform-provider';

const webRuntime: typeof tauriApi = {
  ...tauriApi,
  openImageDialog: async () => {
    const selection = await webFiles.pickImages();
    return selection.cancelled ? null : selection.files.map((file) => file.name);
  },
  openDirectoryDialog: async () => null,
  saveImageDialog: async () => null,
  toNativeFileUrl: (path) => path,
};

/** The only host switch in the application. Services consume this runtime facade. */
export const platformRuntime: typeof tauriApi =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? tauriApi : webRuntime;
