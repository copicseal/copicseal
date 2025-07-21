import type { MenuItemConstructorOptions } from 'electron';
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import semver from 'semver';
import { handleCapture } from './utils/capture.ts';
import { openTargetPath } from './utils/file.ts';
import { getSysFonts } from './utils/font.ts';
import { store } from './utils/storage.ts';

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
    const ret = {
      currentVersion: app.getVersion(),
      latestVersion: app.getVersion(),
      downloadLink: '',
      changelog: '',
    };
    const res = await fetch(`https://copicseal-updater.kohai.top/${ret.currentVersion.includes('beta') ? 'beta' : 'stable'}`)
      .then(r => r.json() as Promise<{ name: string; body: string }[]>)
      .catch(() => []);
    if (res && res.length) {
      const changlog: string[] = [];
      res.forEach((item) => {
        if (semver.gt(item.name, ret.latestVersion)) {
          ret.latestVersion = item.name.replace('v', '');
        }
        if (semver.gte(item.name, ret.currentVersion)) {
          changlog.push(item.body);
        }
      });
      if (changlog.length > 1) {
        changlog.pop();
      }
      ret.changelog = changlog.join('\n---\n') || '暂无更新信息';
    }

    ret.downloadLink = `https://copicseal-updater.kohai.top/download?version=v${ret.latestVersion}&platform=${process.platform}`;

    return ret;
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
