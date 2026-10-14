import type { ExifData } from '@/platform/contracts';
import { EMPTY_EXIF } from '@/platform/contracts';

/**
 * 网页端的 EXIF 适配器（**已停用**）。
 *
 * 桌面端现在用「系统里已有 / 插件目录里安装的原生 ExifTool」读元数据
 * （`src-tauri/src/exiftool.rs` + 设置 → 插件），内置的 ExifTool-WASM 已经移除 ——
 * 它给应用带来约 24 MB 的 wasm 资源，而桌面端并不需要。
 *
 * 网页端因此暂时没有 EXIF 读取能力：这里返回空 EXIF、写回原样返回，
 * 保证网页端仍能正常跑起来（当前首要目标是桌面端）。
 * 以后若要认真支持网页端，再接一个轻量实现，不要把整套 WASM 塞回主包。
 */
export class WebExifAdapter {
  async read(_file: File): Promise<ExifData> {
    console.warn('[web] 网页端暂不提供 EXIF 读取（内置 ExifTool 已移除）');
    return structuredClone(EMPTY_EXIF);
  }

  async copyMetadata(_source: File, output: Uint8Array, _outputName: string): Promise<Uint8Array> {
    return output;
  }
}

export const webExifAdapter = new WebExifAdapter();
