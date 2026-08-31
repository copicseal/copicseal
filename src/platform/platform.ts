import type { Platform } from './contracts/platform';
import { platformProvider } from './index';
import { assetService } from './services/asset-service';
import { cacheService } from './services/cache-service';
import { exportService } from './services/export-service';
import { fileService } from './services/file-service';
import { storageService } from './services/storage-service';

/** Application-wide platform facade. Feature code depends on this object only. */
export function createPlatform(): Platform {
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
