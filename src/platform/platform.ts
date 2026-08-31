import type { Platform } from './contracts/platform';
import { platformProvider } from './index';
import { TauriFileAdapter } from './providers/tauri/tauri-file-adapter';
import { TauriStorageAdapter } from './providers/tauri/tauri-storage-adapter';
import { WebFileAdapter } from './providers/web/web-file-adapter';
import { WebStorageAdapter } from './providers/web/web-storage-adapter';
import { assetService } from './services/asset-service';
import { cacheService } from './services/cache-service';
import { exportService } from './services/export-service';
import { FileService } from './services/file-service';
import { StorageService } from './services/storage-service';

/** Application-wide platform facade. Feature code depends on this object only. */
export function createPlatform(): Platform {
  const fileAdapter =
    platformProvider.id === 'tauri' ? new TauriFileAdapter() : new WebFileAdapter();
  const fileService = new FileService(fileAdapter);
  const storageAdapter =
    platformProvider.id === 'tauri' ? new TauriStorageAdapter() : new WebStorageAdapter();
  const storageService = new StorageService(storageAdapter);
  return {
    assets: assetService,
    export: exportService,
    files: fileService,
    storage: storageService,
    cache: cacheService,
    capabilities: platformProvider.capabilities,
  };
}

export const platform = createPlatform();
