import type { CollageConfig } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const { getConfig, updateConfig } = platformRuntime;

/** 出厂默认值：读不到配置（比如 Web 端）时兜底，字段与 Rust 侧 `CollageConfig::default` 保持一致。 */
export const DEFAULT_COLLAGE_CONFIG: CollageConfig = {
  layout_mode: 'grid',
  layout_id: '',
  aspect_preset: '1:1',
  custom_ratio_width: 4,
  custom_ratio_height: 5,
  background_color: '#ffffff',
  gap: 12,
  padding: 20,
  border_radius: 18,
  shadow: 18,
  long_direction: 'vertical',
  long_align: 'center',
  long_size: 720,
  export_format: 'png',
  export_quality: 'high',
  export_scale: 1,
  export_width: 2048,
  export_height: 2048,
  export_lock_ratio: true,
};

/**
 * 读取拼图默认值。
 *
 * 配置是整段读写的：写的时候必须先取回完整配置再只替换 `collage`，
 * 否则会把其他设置一起覆盖成旧值。
 */
export async function resolveCollageDefaults(): Promise<CollageConfig> {
  try {
    const config = await getConfig();
    return { ...DEFAULT_COLLAGE_CONFIG, ...config.collage };
  } catch (error) {
    console.warn('读取拼图默认值失败:', error);
    return DEFAULT_COLLAGE_CONFIG;
  }
}

/** 覆盖写入拼图默认值；调用方给出要改的字段即可。 */
export async function saveCollageDefaults(patch: Partial<CollageConfig>): Promise<void> {
  const config = await getConfig();
  await updateConfig({
    ...config,
    collage: { ...DEFAULT_COLLAGE_CONFIG, ...config.collage, ...patch },
  });
}
