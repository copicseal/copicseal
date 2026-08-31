export * from './contracts';
export * from './errors';
export * from './providers/tauri/api';
export { tauriCapabilities, tauriProvider } from './providers/tauri/provider';
export { webFiles, webProvider } from './providers/web';

import type { PlatformProvider } from './contracts';
import { tauriProvider } from './providers/tauri/provider';
import { webProvider } from './providers/web';

/** Selects the provider once at startup; feature code does not inspect the host. */
export const platformProvider: PlatformProvider =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window ? tauriProvider : webProvider;

export const platformCapabilities = platformProvider.capabilities;
