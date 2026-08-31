import type { PlatformCapabilities, PlatformProvider } from '@/platform/contracts';

export const tauriCapabilities: PlatformCapabilities = {
  image: { resize: true, composite: true, heicDecode: true },
  files: { pickImages: true, saveToDirectory: true, download: true },
  system: { tray: true, openPath: true, autoUpdate: true },
};

export const tauriProvider: PlatformProvider = {
  id: 'tauri',
  capabilities: tauriCapabilities,
};
