import type { WindowAPI } from 'src/types';
import { createApp } from 'vue';

import App from './App.vue';
import './theme';

const app = createApp(App);

app.mount('#app');

if (!window.api) {
  const api: WindowAPI = {
    onWinResized: (callback: () => void) => {
      window.addEventListener('resize', callback);
      return () => void window.removeEventListener('resize', callback);
    },
    captureDOM: async (options: CaptureOptions) => {
      console.log('captureDOM', options);

      return [];
    },
    openDirectoryDialog: async () => {
      return '';
    },
    showCtxMenu: async (_menus: any) => {
      return '';
    },
    openTargetPath: async (targetPath: string) => {
      console.log('openTargetPath', targetPath);
    },
    getAppVersion: async () => {
      return {
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        downloadLink: 'https://copicseal.kohai.top/',
      };
    },
  };

  window.api = api;
}

interface Output {
  path: string;
  type?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  width: number;
  height: number;
  scale?: number;
}

export interface CaptureOptions {
  html: string;
  output: Output[] | Output;
}
