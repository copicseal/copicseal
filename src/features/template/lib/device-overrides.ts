import type {
  DeviceFieldValue,
  ExifData,
  ExifOverrideFieldName,
  UserDeviceProfile,
} from '@/platform';
import type { ExifOverrides } from '../templates/format-exif-text';

/**
 * 字段分组：相机常用 / 镜头常用 / 通用。
 *
 * 下拉按这三组展示（`SelectGroup` + `SelectLabel`），顺序也就是字段的展示顺序；
 * `DEVICE_FIELD_ORDER` 由它派生，避免多份清单漂移。
 */
export const DEVICE_FIELD_GROUPS: ReadonlyArray<{
  id: 'camera' | 'lens' | 'common';
  fields: readonly ExifOverrideFieldName[];
}> = [
  { id: 'camera', fields: ['make', 'model'] },
  { id: 'lens', fields: ['lens_model', 'focal_length', 'aperture'] },
  { id: 'common', fields: ['shutter_speed', 'iso', 'date_taken', 'latitude', 'longitude'] },
];

/**
 * 设备档案能写的字段（分组顺序展开）。
 *
 * 与模板变量表是同一份集合：多一个少一个都会让「设备填了但模板用不到」或反之，所以用变量表校验。
 */
export const DEVICE_FIELD_ORDER: readonly ExifOverrideFieldName[] = DEVICE_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

const KNOWN_FIELDS = new Set<string>(DEVICE_FIELD_ORDER);

/** 配置可以被手改，不认识的字段直接忽略。 */
export function isKnownDeviceField(field: string): field is ExifOverrideFieldName {
  return KNOWN_FIELDS.has(field);
}

/**
 * 规整一个设备的字段：忽略未知字段、同字段保留最后一行、按字段表顺序排列。
 *
 * **保留空值行**：编辑器里刚添加、还没填的行不能凭空消失；空值只在应用时才忽略
 * （见 `mergeDeviceFields`）。这与改动值的语义也不同：改动值里的空串表示「就是要留空」。
 */
export function sanitizeDeviceFields(fields: readonly DeviceFieldValue[]): DeviceFieldValue[] {
  const byField = new Map<ExifOverrideFieldName, string>();

  for (const item of fields) {
    if (!isKnownDeviceField(item.field)) {
      continue;
    }

    byField.set(item.field, item.value);
  }

  return DEVICE_FIELD_ORDER.filter((field) => byField.has(field)).map((field) => ({
    field,
    value: byField.get(field) as string,
  }));
}

/**
 * 规整配置里读出来的设备清单。
 *
 * 配置可能被手改或来自更早的版本：类别非法或没有 id 的条目直接丢掉，
 * 字段再按 `sanitizeDeviceFields` 清一遍，界面上拿到的永远是干净数据。
 */
export function normalizeDeviceProfiles(items: readonly UserDeviceProfile[]): UserDeviceProfile[] {
  return items
    .filter(
      (item): item is UserDeviceProfile =>
        Boolean(item) && (item.category === 'camera' || item.category === 'lens') && !!item.id,
    )
    .map((item) => ({ ...item, fields: sanitizeDeviceFields(item.fields ?? []) }));
}

/**
 * 相机 + 镜头合并成一份改动值；同字段以镜头为准（镜头离成像参数更近）。
 *
 * 空值行在这里被跳过：设备档案里没填的项不能把照片上已有的值抹成空。
 */
export function mergeDeviceFields(
  camera: UserDeviceProfile | null,
  lens: UserDeviceProfile | null,
): ExifOverrides {
  const merged: ExifOverrides = {};

  for (const device of [camera, lens]) {
    if (!device) {
      continue;
    }

    for (const { field, value } of device.fields) {
      if (!isKnownDeviceField(field)) {
        continue;
      }

      const trimmed = value.trim();
      if (trimmed === '') {
        continue;
      }

      merged[field] = trimmed;
    }
  }

  return merged;
}

export type DeviceApplyMode = 'replace' | 'fillEmpty';

/** 判断某个字段当前是否为空（改动值优先，其次照片解析值）。 */
function isEmptyField(
  field: ExifOverrideFieldName,
  overrides: ExifOverrides,
  exif: ExifData | null,
): boolean {
  const value = overrides[field] ?? exif?.[field] ?? null;

  return value === null || String(value).trim() === '';
}

/**
 * 算出这张照片真正要写入的改动值。
 *
 * - `replace`：直接写入设备涉及到的字段；设备没提到的字段（含用户手工改动）保持原样
 * - `fillEmpty`：只写当前为空的字段，照片自己读到的真实值不会被覆盖
 */
export function resolveAppliedOverrides(
  merged: ExifOverrides,
  current: { overrides: ExifOverrides; exif: ExifData | null },
  mode: DeviceApplyMode,
): ExifOverrides {
  const result: ExifOverrides = {};

  for (const [field, value] of Object.entries(merged) as Array<[ExifOverrideFieldName, string]>) {
    if (mode === 'fillEmpty' && !isEmptyField(field, current.overrides, current.exif)) {
      continue;
    }

    result[field] = value;
  }

  return result;
}

/**
 * 把当前照片读到的 EXIF（含已有改动值）反向整理成一份设备档案的字段。
 *
 * 「保存为设备」用：手抄一遍太麻烦，直接从一张有 EXIF 的照片生成。
 */
export function deviceFieldsFromExif(
  exif: ExifData | null,
  overrides: ExifOverrides,
): DeviceFieldValue[] {
  const fields: DeviceFieldValue[] = [];

  for (const field of DEVICE_FIELD_ORDER) {
    const value = overrides[field] ?? exif?.[field] ?? null;

    if (value === null || String(value).trim() === '') {
      continue;
    }

    fields.push({ field, value: String(value) });
  }

  return fields;
}

/** 从照片里挑出适合做设备名的字段。 */
export function suggestDeviceName(
  category: 'camera' | 'lens',
  exif: ExifData | null,
  overrides: ExifOverrides,
): string {
  const pick = (field: ExifOverrideFieldName) => {
    const value = overrides[field] ?? exif?.[field] ?? null;
    return value === null ? '' : String(value).trim();
  };

  if (category === 'lens') {
    return pick('lens_model') || pick('focal_length') || '';
  }

  return [pick('make'), pick('model')].filter(Boolean).join(' ');
}
