import type { FontConfig, TemplatePreset } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const { getConfig, updateConfig } = platformRuntime;

/**
 * 读取「模板预设」。
 *
 * 配置是整段读写的：写的时候必须先取回完整配置再只替换 `template_presets`，
 * 否则会把其他设置一起覆盖成旧值。
 */
export async function resolveTemplatePresets(): Promise<TemplatePreset[]> {
  try {
    const config = await getConfig();
    return config.template_presets ?? [];
  } catch (error) {
    console.warn('读取模板预设失败:', error);
    return [];
  }
}

/** 覆盖写入「模板预设」；增删改都走这里，调用方负责先算出完整清单。 */
export async function saveTemplatePresets(presets: TemplatePreset[]): Promise<void> {
  const config = await getConfig();
  await updateConfig({ ...config, template_presets: presets });
}

/** 读取「全局字体」：新导入与未调整过的图片默认使用的字体族。 */
export async function resolveDefaultFont(): Promise<string> {
  try {
    const config = await getConfig();
    return config.fonts?.default_font ?? '';
  } catch (error) {
    console.warn('读取默认字体失败:', error);
    return '';
  }
}

/** 写入「全局字体」，同时把会话内的默认字体一起换掉由调用方负责。 */
export async function saveDefaultFont(font: string): Promise<void> {
  const config = await getConfig();
  await updateConfig({ ...config, fonts: { ...config.fonts, default_font: font } });
}

/** 读取字体设置（引入的本机字体 + 导入的字体文件 + 全局字体）。 */
export async function resolveFontConfig(): Promise<FontConfig> {
  try {
    const config = await getConfig();
    const fonts = config.fonts ?? {};

    return {
      favorites: fonts.favorites ?? [],
      default_font: fonts.default_font ?? '',
      imported: fonts.imported ?? [],
      notes: fonts.notes ?? [],
    };
  } catch (error) {
    console.warn('读取字体设置失败:', error);
    return { favorites: [], default_font: '', imported: [], notes: [] };
  }
}

/** 覆盖写入字体设置；增删字体都走这里，调用方负责先算出完整清单。 */
export async function saveFontConfig(fonts: FontConfig): Promise<void> {
  const config = await getConfig();
  await updateConfig({ ...config, fonts });
}
