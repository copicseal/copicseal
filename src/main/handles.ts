import type { MenuItemConstructorOptions } from 'electron';
import { BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import { handleCapture } from './utils/capture.ts';
import { openTargetPath } from './utils/file.ts';
import { getSysFonts } from './utils/font.ts';
import { store } from './utils/storage.ts';
import { getAppVersion } from './utils/updater.ts';

export function mainHandles() {
  ipcMain.handle('captureDOM', async (_event, options) => {
    return handleCapture(options);
  });

  ipcMain.handle('openDirectoryDialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return filePaths[0];
  });

  ipcMain.handle('showCtxMenu', (_event, menus: MenuItemConstructorOptions[]) => {
    return new Promise<string>((resolve) => {
      const template: (MenuItemConstructorOptions)[] = menus.map((menu) => {
        return {
          ...menu,
          click: (menuItem) => {
            resolve(menuItem.id);
          },
        };
      });
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: BrowserWindow.fromWebContents(_event.sender)! });
    });
  });

  ipcMain.handle('openTargetPath', async (_event, options) => {
    return openTargetPath(options);
  });

  ipcMain.handle('getSysFonts', async () => {
    return getSysFonts();
  });

  ipcMain.handle('getAppVersion', async () => {
    return getAppVersion();
  });

  ipcMain.handle('config:get', (_e, key, defaultValue) => {
    return store.get(key, defaultValue);
  });

  ipcMain.handle('config:set', (_e, key, value) => {
    store.set(key, value);
  });

  ipcMain.handle('config:delete', (_e, key) => {
    store.delete(key);
  });
}
