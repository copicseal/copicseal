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
});
async function loadConfig() {
  const data = await storage.get('config');
  if (data) {
    config.value = data;
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
