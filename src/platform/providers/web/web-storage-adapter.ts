import type { AppConfig, FontInfo } from '@/platform/contracts';
import { PlatformError } from '@/platform/contracts';
import type { StorageAdapter } from '@/platform/contracts/platform';

type StorageValue = unknown;

/** IndexedDB-backed key/value storage with an in-memory fallback. */
export class WebStorageAdapter implements StorageAdapter {
  private readonly memory = new Map<string, StorageValue>();
  private database: Promise<IDBDatabase | null> | null = null;

  private openDatabase(): Promise<IDBDatabase | null> {
    if (this.database) return this.database;
    this.database = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open('copicseal-platform', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('values');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return this.database;
  }

  async get<T>(key: string): Promise<T | null> {
    const database = await this.openDatabase();
    if (!database) return (this.memory.get(key) as T | undefined) ?? null;
    return new Promise((resolve, reject) => {
      const request = database.transaction('values', 'readonly').objectStore('values').get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () =>
        reject(
          new PlatformError('Web storage read failed', {
            code: 'STORAGE_FAILED',
            provider: 'web',
            cause: request.error,
          }),
        );
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const database = await this.openDatabase();
    if (!database) {
      this.memory.set(key, value);
      return;
    }
    return new Promise((resolve, reject) => {
      const request = database
        .transaction('values', 'readwrite')
        .objectStore('values')
        .put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          new PlatformError('Web storage write failed', {
            code: 'STORAGE_FAILED',
            provider: 'web',
            cause: request.error,
          }),
        );
    });
  }

  async getConfig(): Promise<AppConfig> {
    const config = await this.get<AppConfig>('app-config');
    if (!config)
      throw new PlatformError('Web configuration is not initialized', {
        code: 'STORAGE_FAILED',
        provider: 'web',
      });
    return config;
  }

  updateConfig(config: AppConfig): Promise<void> {
    return this.set('app-config', config);
  }

  async listSystemFonts(): Promise<FontInfo[]> {
    return [];
  }
}
