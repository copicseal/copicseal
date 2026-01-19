import type { AppConfig } from '@renderer/types';
import { storage } from '@renderer/utils/storage';
import { cloneDeep } from 'lodash-es';

const config: Ref<AppConfig> = ref<AppConfig>({
  output: {
    presets: [],
    defaultPath: '',
  },
  templatePresets: [],
  fonts: {
    favorites: [],
    defaultFont: '',
  },
  exportPresets: [],
  templateList: {
    enabled: [],
    installedDir: '',
    remoteRegistry: [],
  },
  userDevices: [],
  saveDirectory: '',
});
async function loadConfig() {
  const data = await storage.get('config');
  if (data) {
    config.value = data;
    // 如果没有设置保存目录，使用默认目录
    if (!config.value.saveDirectory) {
      try {
        config.value.saveDirectory = await window.api.manageSaveDirectory();
        await saveConfig();
      }
      catch (error) {
        console.error('Failed to get default save directory:', error);
      }
    }
    console.log(config.value);
  }
}
loadConfig();

async function saveConfig() {
  return storage.set('config', cloneDeep(config.value));
}

export function useConfig() {
  watch(config, () => {
    saveConfig();
  }, { deep: true });

  return {
    config,
    loadConfig,
  };
}
