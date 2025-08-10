import type { BrowserWindow } from 'electron';
import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import semver from 'semver';
import { getMachineId } from './storage.ts';

const UPDATER_BASE_URL = 'https://copicseal-updater.kohai.top';

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

      autoUpdater.quitAndInstall();
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

export async function getAppVersion() {
  const ret = {
    currentVersion: app.getVersion(),
    latestVersion: app.getVersion(),
    downloadLink: '',
    changelog: '',
  };
  const machineId = getMachineId();
  const res = await fetch(`${UPDATER_BASE_URL}/${ret.currentVersion.includes('beta') ? 'beta' : 'stable'}`, {
    headers: {
      'App-Version': ret.currentVersion,
      'Machine-ID': machineId,
      'User-Agent': `Copicseal/${ret.currentVersion} (${process.platform}/${machineId})`,
    },
  })
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

  ret.downloadLink = `${UPDATER_BASE_URL}/download?version=v${ret.latestVersion}&platform=${process.platform}&utm_source=Copicseal_${ret.currentVersion}`;

  return ret;
}
