import type { CustomLogoEntry } from '@/features/template/templates/custom-logo';
import { sanitizeCustomSvg } from '@/features/template/templates/svg-text';
import type { CustomLogo } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';

/** 工作区里的 Logo 目录名（与 Rust 侧 `logo.rs::logos_dir` 一致）。 */
const LOGO_DIR_NAME = 'Logos';

function joinPath(base: string, ...parts: string[]): string {
  const separator = base.includes('\\') ? '\\' : '/';

  return [base.replace(/[\\/]+$/, ''), ...parts].join(separator);
}

/**
 * 自定义 Logo 在界面上的资源地址（设置页预览与模板渲染共用一套拼法）。
 */
export function customLogoUrl(workspace: string, fileName: string): string {
  return platformRuntime.toNativeFileUrl(joinPath(workspace, LOGO_DIR_NAME, fileName));
}

/**
 * 规整配置里读出来的自定义 Logo 清单。
 *
 * 配置可以被手改：丢掉没有文件名的条目、关键字去空、名称缺失时用文件名兜底，
 * 保证渲染侧拿到的都是可用数据。
 */
export function normalizeCustomLogos(items: readonly CustomLogo[] | undefined): CustomLogo[] {
  return (items ?? [])
    .filter((item): item is CustomLogo => Boolean(item) && Boolean(item.file_name))
    .map((item) => ({
      ...item,
      name: item.name?.trim() || item.file_name,
      keywords: (item.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean),
    }));
}

/**
 * 读出「设置 → Logo」里的自定义条目，并解析成渲染可用的形式。
 *
 * 解析包含两件事：拼出 asset 协议地址；SVG 再取一次文本并清理（内联渲染用）。
 * 位图不需要读文件，直接用地址，避免启动时无谓的 IO。
 */
export async function resolveCustomLogoEntries(): Promise<CustomLogoEntry[]> {
  try {
    const config = await platformRuntime.getConfig();
    const items = normalizeCustomLogos(config.logos?.items);
    const workspace = config.save_directory ?? '';

    if (items.length === 0 || !workspace) {
      return [];
    }

    return await Promise.all(
      items.map(async (item): Promise<CustomLogoEntry> => {
        const url = customLogoUrl(workspace, item.file_name);

        if (!item.file_name.toLowerCase().endsWith('.svg')) {
          return { ...item, url, svg: null };
        }

        try {
          const svg = sanitizeCustomSvg(
            await platformRuntime.readLogoSvg(workspace, item.file_name),
          );
          return { ...item, url, svg };
        } catch (error) {
          // 读不到就退回 <img> 渲染，画布上仍然能看到标志（只是不跟随文字颜色）
          console.warn('读取自定义 Logo 的 SVG 失败，将按图片渲染:', error);
          return { ...item, url, svg: null };
        }
      }),
    );
  } catch (error) {
    console.warn('读取自定义 Logo 失败:', error);
    return [];
  }
}
