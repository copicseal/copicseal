import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  DEVICE_FIELD_GROUPS,
  DEVICE_FIELD_ORDER,
  sanitizeDeviceFields,
} from '@/features/template/lib/device-overrides';
import {
  EXIF_TEXT_VARIABLES,
  type ExifOverrideField,
} from '@/features/template/templates/format-exif-text';
import type { DeviceCategory, DeviceFieldValue, UserDeviceProfile } from '@/platform';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

/**
 * 每个字段的示例值（占位文案）。
 *
 * 与 `exif.rs` 的展示口径保持一致：焦距 `50mm`、光圈 `f/1.4`、快门 `1/200s`、ISO 只写数字。
 * 档案里的值会被当作**已格式化**的 EXIF 值直接用（`formatExifFocalLength` 不会再补 `mm`），
 * 所以这里必须带单位，不能只写数字。
 */
const FIELD_PLACEHOLDERS: Record<ExifOverrideField, string> = {
  make: 'SONY',
  model: 'ILCE-7M4',
  lens_model: 'FE 50mm F1.4 GM',
  focal_length: '50mm',
  aperture: 'f/1.4',
  shutter_speed: '1/200s',
  iso: '400',
  date_taken: '2024-01-01 12:00:00',
  latitude: '31.230278',
  longitude: '121.473889',
};

const CATEGORY_LABEL_KEYS: Record<DeviceCategory, MessageKey> = {
  camera: 'settings.devices.category.camera',
  lens: 'settings.devices.category.lens',
};

const CATEGORY_TITLE_KEYS: Record<DeviceCategory, MessageKey> = {
  camera: 'settings.devices.addCameraTitle',
  lens: 'settings.devices.addLensTitle',
};

/** 字段下拉里的分组标题 */
const FIELD_GROUP_LABEL_KEYS: Record<'camera' | 'lens' | 'common', MessageKey> = {
  camera: 'settings.devices.fieldGroup.camera',
  lens: 'settings.devices.fieldGroup.lens',
  common: 'settings.devices.fieldGroup.common',
};

/** 新建档案时的预置字段：相机给品牌+型号，镜头给镜头型号+焦距 */
const DEFAULT_FIELDS: Record<DeviceCategory, DeviceFieldValue[]> = {
  camera: [
    { field: 'make', value: '' },
    { field: 'model', value: '' },
  ],
  lens: [
    { field: 'lens_model', value: '' },
    { field: 'focal_length', value: '' },
  ],
};

/** 字段名 → 展示文案（与「EXIF 字段」卡片共用同一份变量标签） */
function fieldLabel(t: (key: MessageKey) => string, field: ExifOverrideField): string {
  const variable = EXIF_TEXT_VARIABLES.find((item) => item.field === field);

  return variable?.labelKey ? t(variable.labelKey) : (variable?.label ?? field);
}

/** 列表行里的一句话摘要：把已填的值串起来 */
function summaryOf(device: UserDeviceProfile): string {
  return device.fields
    .map((field) => field.value.trim())
    .filter(Boolean)
    .join(' · ');
}

interface DeviceEditorDialogProps {
  profile: UserDeviceProfile;
  onSave: (profile: UserDeviceProfile) => void;
  onClose: () => void;
}

/**
 * 设备编辑弹框。
 *
 * 草稿只存在弹框内部，**保存时才写一次配置**：列表那边保持只读，输入过程不会带着
 * 整页重渲染，也不会有「每个字都落盘」的卡顿。
 */
function DeviceEditorDialog({ profile, onSave, onClose }: DeviceEditorDialogProps) {
  const t = useTranslate();
  const [name, setName] = useState(profile.name);
  const [fields, setFields] = useState<DeviceFieldValue[]>(profile.fields);

  const usedFields = new Set(fields.map((field) => field.field));
  const nextField = DEVICE_FIELD_ORDER.find((field) => !usedFields.has(field));

  const addField = () => {
    if (!nextField) {
      return;
    }
    setFields((prev) => [...prev, { field: nextField, value: '' }]);
  };

  const handleSave = () => {
    onSave({
      ...profile,
      name: name.trim() || t(CATEGORY_LABEL_KEYS[profile.category]),
      fields: sanitizeDeviceFields(fields),
      updated_at: Math.floor(Date.now() / 1000),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(CATEGORY_TITLE_KEYS[profile.category])}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            autoFocus
            aria-label={t('settings.devices.name')}
            className="h-7 text-xs"
            placeholder={t('settings.devices.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          {fields.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">{t('settings.devices.fieldsEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {fields.map((row, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 弹框内的草稿行没有稳定 id，位置即身份
                <li key={index} className="flex items-center gap-2">
                  <Select
                    value={row.field}
                    onValueChange={(value) =>
                      setFields((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, field: value as ExifOverrideField } : item,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_FIELD_GROUPS.map((group) => (
                        <SelectGroup key={group.id}>
                          <SelectLabel>{t(FIELD_GROUP_LABEL_KEYS[group.id])}</SelectLabel>
                          {group.fields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {fieldLabel(t, field)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={t('settings.devices.value')}
                    className="h-7 min-w-0 flex-1 text-xs"
                    placeholder={FIELD_PLACEHOLDERS[row.field]}
                    value={row.value}
                    onChange={(event) =>
                      setFields((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="plain"
                    size="icon-sm"
                    aria-label={t('settings.devices.removeField')}
                    onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nextField}
            onClick={addField}
          >
            <Plus data-icon="inline-start" />
            {nextField ? t('settings.devices.addField') : t('settings.devices.allFieldsUsed')}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t('settings.devices.cancel')}
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            {t('settings.devices.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DevicesTabProps {
  devices: UserDeviceProfile[];
  onChange: (devices: UserDeviceProfile[]) => void;
}

/**
 * 设置 → 设备：维护「相机 / 镜头」两类档案。
 *
 * 面向相机或手动镜头不写 EXIF 的场景：这里存好已知信息，边框水印页的「EXIF 字段」
 * 卡片顶部就能一键套用到改动值层。
 *
 * 列表本身只读，新增 / 编辑 / 复制都在弹框里完成（见 `DeviceEditorDialog`）。
 */
export function DevicesTab({ devices, onChange }: DevicesTabProps) {
  const t = useTranslate();
  const [editing, setEditing] = useState<UserDeviceProfile | null>(null);

  const openNew = (category: DeviceCategory) => {
    const count = devices.filter((device) => device.category === category).length;
    const now = Math.floor(Date.now() / 1000);

    setEditing({
      id: crypto.randomUUID(),
      name: `${t(CATEGORY_LABEL_KEYS[category])} ${count + 1}`,
      category,
      fields: DEFAULT_FIELDS[category].map((field) => ({ ...field })),
      created_at: now,
      updated_at: now,
    });
  };

  const openDuplicate = (device: UserDeviceProfile) => {
    const now = Math.floor(Date.now() / 1000);

    setEditing({
      ...device,
      id: crypto.randomUUID(),
      name: `${device.name} ${t('settings.devices.copySuffix')}`,
      fields: device.fields.map((field) => ({ ...field })),
      created_at: now,
      updated_at: now,
    });
  };

  const handleSave = (profile: UserDeviceProfile) => {
    const exists = devices.some((device) => device.id === profile.id);

    onChange(
      exists
        ? devices.map((device) => (device.id === profile.id ? profile : device))
        : [...devices, profile],
    );
    setEditing(null);
  };

  const handleRemove = (device: UserDeviceProfile) => {
    toast(t('settings.devices.removeConfirm', { name: device.name }), {
      description: t('settings.devices.removeConfirmDescription'),
      action: {
        label: t('settings.devices.remove'),
        onClick: () => {
          onChange(devices.filter((item) => item.id !== device.id));
          toast.success(t('settings.devices.removed', { name: device.name }));
        },
      },
      cancel: t('settings.devices.cancel'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-card px-5 py-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">{t('settings.devices.title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.devices.description')}</p>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          {t('settings.devices.hint')}
        </p>
      </div>

      {(['camera', 'lens'] as const).map((category) => {
        const items = devices.filter((device) => device.category === category);

        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium text-foreground">
                {t(CATEGORY_LABEL_KEYS[category])}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={() => openNew(category)}>
                <Plus data-icon="inline-start" />
                {category === 'camera'
                  ? t('settings.devices.addCamera')
                  : t('settings.devices.addLens')}
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                {category === 'camera'
                  ? t('settings.devices.emptyCamera')
                  : t('settings.devices.emptyLens')}
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((device) => (
                  <li
                    key={device.id}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{device.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {summaryOf(device) || t('settings.devices.noFieldValues')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="plain"
                      size="sm"
                      onClick={() => setEditing(device)}
                    >
                      <Pencil className="size-3.5" />
                      {t('settings.devices.edit')}
                    </Button>
                    <Button
                      type="button"
                      variant="plain"
                      size="icon-sm"
                      aria-label={t('settings.devices.duplicate')}
                      onClick={() => openDuplicate(device)}
                    >
                      <Copy />
                    </Button>
                    <Button
                      type="button"
                      variant="plain"
                      size="icon-sm"
                      aria-label={t('settings.devices.remove')}
                      onClick={() => handleRemove(device)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {editing ? (
        <DeviceEditorDialog
          key={editing.id}
          profile={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
