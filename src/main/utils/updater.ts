import type { BrowserWindow } from 'electron';
import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

export function checkForUpdates(win: BrowserWindow) {
  if (process.platform === 'darwin') {
    return;
  }
  autoUpdater.autoDownload = false;

  // autoUpdater.forceDevUpdateConfig = true;
  const appVersion = app.getVersion();
  if (appVersion.includes('beta')) {
    autoUpdater.channel = 'beta';
  }

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: '发现新版本',
      message: `有新版本[ ${appVersion} -> ${info.version} ]可用，是否立即下载？`,
      buttons: ['是', '否'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(win, {
      title: '安装更新',
      message: '更新已下载，应用将重新启动以完成更新。',
    }).then(() => {
      console.log(info);

      // autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('更新错误:', error);
    dialog.showMessageBox(win, {
      title: '安装更新',
      message: error.message,
    });
  });
  console.log('检查更新中...', autoUpdater.getFeedURL());

  autoUpdater.checkForUpdates().then((res) => {
    console.log('检查更新结果:', res);
  });
}
