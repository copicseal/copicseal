import type { MenuItemConstructorOptions } from 'electron';
import { BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import { handleCapture } from './utils/capture';
import { openTargetPath } from './utils/file';

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
}
