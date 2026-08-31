export * from './contracts';
export * from './errors';
export * from './providers/tauri/api';
export { tauriCapabilities, tauriProvider } from './providers/tauri/tauri-platform-provider';
export { webFiles, webProvider } from './providers/web/web-platform-provider';
export * from './services/asset-service';
export * from './services/cache-service';
export * from './services/export-service';
export * from './services/file-service';
export * from './services/storage-service';

import type { PlatformProvider } from './contracts';
import { tauriProvider } from './providers/tauri/tauri-platform-provider';
import { webProvider } from './providers/web/web-platform-provider';

/** Selects the provider once at startup; feature code does not inspect the host. */
export const platformProvider: PlatformProvider =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? tauriProvider : webProvider;

export const platformCapabilities = platformProvider.capabilities;

export { createPlatform, platform } from './platform';
