import type { UserDeviceProfile } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { normalizeDeviceProfiles } from './device-overrides';

/**
 * 读取「设置 → 设备」里的设备档案。
 *
 * 老配置里没有 `devices` 段（该字段是后加的），统一按空列表处理，
 * 拿到的数据都过一遍 `normalizeDeviceProfiles`（丢掉非法类别、清洗字段）。
 */
export async function resolveUserDevices(): Promise<UserDeviceProfile[]> {
  try {
    const config = await platformRuntime.getConfig();
    return normalizeDeviceProfiles(config.devices?.items ?? []);
  } catch (error) {
    console.warn('读取设备档案失败:', error);
    return [];
  }
}

/**
 * 把设备清单写回配置（读-改-写，只动 `devices` 段）。
 *
 * 「把当前照片存为设备」在模板页触发，不经过设置页的 `configRef`，所以这里重新读一次
 * 配置再合并，避免把其它设置覆盖成旧值。
 */
export async function saveUserDevices(
  items: readonly UserDeviceProfile[],
): Promise<UserDeviceProfile[]> {
  const config = await platformRuntime.getConfig();
  const next = [...items];

  await platformRuntime.updateConfig({ ...config, devices: { items: next } });

  return next;
}
