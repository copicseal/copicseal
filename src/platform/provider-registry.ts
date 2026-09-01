import type { PlatformProvider } from './contracts';
import { tauriProvider } from './providers/tauri/tauri-platform-provider';
import { webProvider } from './providers/web/web-platform-provider';

/** Selects the host provider once, without importing the platform facade. */
export const platformProvider: PlatformProvider =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? tauriProvider : webProvider;

export const platformCapabilities = platformProvider.capabilities;
