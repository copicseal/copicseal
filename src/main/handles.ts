import type { MenuItemConstructorOptions } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
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

  ipcMain.handle('manageSaveDirectory', async (_event, newDir?: string, oldDir?: string) => {
    // 当没有参数时，返回默认目录
    if (newDir === undefined) {
      const defaultDir = path.join(app.getPath('documents'), 'Copicseal');
      // 确保默认目录存在
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      return defaultDir;
    }
    // 当有一个参数时，表示当前的目录
    else if (oldDir === undefined) {
      // 确保当前目录存在
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }
      return newDir;
    }
    // 当有两个参数时，移动旧目录的内容到新目录
    else {
      try {
        // 确保新目录存在
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }
        // 检查旧目录是否存在
        if (fs.existsSync(oldDir)) {
          // 获取旧目录中的所有文件和子目录
          const items = fs.readdirSync(oldDir);

          // 移动每个文件和子目录到新目录
          for (const item of items) {
            const oldPath = path.join(oldDir, item);
            const newPath = path.join(newDir, item);

            // 如果当前项目的完整路径与新目录相同，则跳过
            if (path.normalize(oldPath) === path.normalize(newDir)) {
              console.log(`Skipping item that matches newDir: ${oldPath}`);
              continue;
            }

            // 如果新路径已经存在，先删除它
            if (fs.existsSync(newPath)) {
              if (fs.statSync(newPath).isDirectory()) {
                fs.rmSync(newPath, { recursive: true, force: true });
              }
              else {
                fs.unlinkSync(newPath);
              }
            }
            console.log({ oldPath, newPath });

            // 移动文件或目录
            fs.renameSync(oldPath, newPath);
          }

          // 检查旧目录是否为空，如果为空则删除
          const remainingItems = fs.readdirSync(oldDir);
          if (remainingItems.length === 0) {
            fs.rmSync(oldDir, { recursive: true, force: true });
          }
        }
        return newDir;
      }
      catch (error) {
        console.error('Failed to move directory contents:', error);
        throw error;
      }
    }
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
