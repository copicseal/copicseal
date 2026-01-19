import type { MenuItemConstructorOptions } from 'electron';
import type { CaptureOptions } from './main/utils/capture';

type MenuItem = Omit<MenuItemConstructorOptions, 'click'> & {
  click?: (menu: MenuItem) => void;
};

interface Storage {
  get: <T = any>(key: string) => Promise<T>;
  set: <T = any>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface WindowAPI {
  onWinResized: (callback: () => void) => () => void;
  captureDOM: (options: CaptureOptions) => Promise<string[]>;
  openDirectoryDialog: () => Promise<string>;
  showCtxMenu: (menus: MenuItem[]) => Promise<string>;
  openTargetPath: (targetPath: string) => Promise<void>;
  getAppVersion: () => Promise<{ currentVersion: string; latestVersion: string; downloadLink: string; changelog: string }>;
  getSysFonts: () => Promise<string[]>;
  manageSaveDirectory: (newDir?: string, oldDir?: string) => Promise<string>;
  getStorage: () => Storage;
}
