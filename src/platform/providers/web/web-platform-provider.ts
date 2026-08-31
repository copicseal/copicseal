import type { PlatformCapabilities, PlatformProvider, WebFileProvider } from '@/platform/contracts';
import { PlatformError } from '@/platform/contracts';

const imageAccept = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].join(',');

const capabilities: PlatformCapabilities = {
  image: { resize: true, composite: true, heicDecode: false },
  files: { pickImages: true, saveToDirectory: false, download: true },
  system: { tray: false, openPath: false, autoUpdate: false },
};

function createFileInput(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = imageAccept;
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

const files: WebFileProvider = {
  async pickImages() {
    const selected = await createFileInput();
    return { files: selected, cancelled: selected.length === 0 };
  },

  async save(data, fileName) {
    const blob =
      data instanceof Blob
        ? data
        : (() => {
            const buffer = new ArrayBuffer(data.byteLength);
            new Uint8Array(buffer).set(data);
            return new Blob([buffer]);
          })();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  toUrl(file) {
    return URL.createObjectURL(file);
  },
};

export const webProvider: PlatformProvider = {
  id: 'web',
  capabilities,
};

export { files as webFiles };

export function unsupportedWebPathOperation(operation: string): never {
  throw new PlatformError(`${operation} is not available in the browser`, {
    code: 'PLATFORM_UNSUPPORTED',
    provider: 'web',
  });
}
