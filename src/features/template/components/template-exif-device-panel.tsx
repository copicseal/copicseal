import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { DeviceCategory, ExifData, UserDeviceProfile } from '@/platform';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { ensurePhotoExif } from '../hooks/use-photo-exif';
import {
  type DeviceApplyMode,
  deviceFieldsFromExif,
  mergeDeviceFields,
  resolveAppliedOverrides,
  suggestDeviceName,
} from '../lib/device-overrides';
import { saveUserDevices } from '../lib/device-settings';
import { getTemplatePhotoConfig, useTemplateStore } from '../store/use-template-store';
import type { ExifOverrides } from '../templates/format-exif-text';

/** Radix Select 不允许空串作 value（空串是它的清空语义），用哨兵值表示「不使用设备」 */
const NO_DEVICE = '__co-no-device__';

interface TemplateExifDevicePanelProps {
  photoId: string;
  exif: ExifData | null;
  overrides: ExifOverrides;
}

/**
 * 「EXIF 字段」卡片顶部的「我的设备」区。
 *
 * 面向「相机或手动镜头不记录 EXIF」的场景：在设置 → 设备里维护好档案后，这里选一台相机 +
 * 一支镜头，一键写进照片的改动值层（也就是下方那些输入框）。
 *
 * 两个范围（当前照片 / 全部素材）与两种策略（覆盖 / 仅补空）都对应不同工作流：
 * 手动镜头通常只想补上缺失的环节，而整批老照片则可能希望直接覆盖。
 */
export function TemplateExifDevicePanel({
  photoId,
  exif,
  overrides,
}: TemplateExifDevicePanelProps) {
  const t = useTranslate();
  const { photos } = usePhotos();
  const devices = useTemplateStore((state) => state.devices);
  const setDevices = useTemplateStore((state) => state.setDevices);
  const applyModifiedExif = useTemplateStore((state) => state.applyModifiedExif);
  const [cameraId, setCameraId] = useState(NO_DEVICE);
  const [lensId, setLensId] = useState(NO_DEVICE);
  const [fillEmpty, setFillEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  const cameras = devices.filter((device) => device.category === 'camera');
  const lenses = devices.filter((device) => device.category === 'lens');
  const camera = cameras.find((device) => device.id === cameraId) ?? null;
  const lens = lenses.find((device) => device.id === lensId) ?? null;
  const merged = useMemo(() => mergeDeviceFields(camera, lens), [camera, lens]);
  const hasSelection = Object.keys(merged).length > 0;
  const mode: DeviceApplyMode = fillEmpty ? 'fillEmpty' : 'replace';
  // 收起状态下也让人看得出「当前选了哪套设备」
  const selectedSummary = [camera?.name, lens?.name].filter(Boolean).join(' · ');

  const handleApply = async (scope: 'current' | 'all') => {
    if (!hasSelection) {
      return;
    }

    setBusy(true);
    try {
      const targets = scope === 'current' ? [photoId] : photos.map((photo) => photo.id);
      const entries: Array<{ photoId: string; overrides: ExifOverrides }> = [];

      for (const id of targets) {
        // 当前照片的 EXIF 与改动值父组件已经拿到，直接复用；其余照片按需确保已解析
        const photo = id === photoId ? null : photos.find((item) => item.id === id);
        const targetExif = id === photoId ? exif : photo ? await ensurePhotoExif(photo) : null;
        const targetOverrides =
          id === photoId ? overrides : getTemplatePhotoConfig(id).modifiedExif;
        const applied = resolveAppliedOverrides(
          merged,
          { overrides: targetOverrides, exif: targetExif },
          mode,
        );

        if (Object.keys(applied).length > 0) {
          entries.push({ photoId: id, overrides: applied });
        }
      }

      if (entries.length === 0) {
        toast.info(t('template.exifFields.device.nothingToApply'));
        return;
      }

      applyModifiedExif(entries);
      toast.success(t('template.exifFields.device.applied', { count: entries.length }));
    } catch (error) {
      console.error('应用设备档案失败:', error);
      toast.error(t('template.exifFields.device.applyFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAsDevice = async (category: DeviceCategory) => {
    const fields = deviceFieldsFromExif(exif, overrides);

    if (fields.length === 0) {
      toast.info(t('template.exifFields.device.nothingToSave'));
      return;
    }

    const name =
      suggestDeviceName(category, exif, overrides) || t('template.exifFields.device.untitled');
    const now = Math.floor(Date.now() / 1000);
    const profile: UserDeviceProfile = {
      id: crypto.randomUUID(),
      name,
      category,
      fields,
      created_at: now,
      updated_at: now,
    };

    try {
      setDevices(await saveUserDevices([...devices, profile]));
      toast.success(t('template.exifFields.device.saved', { name }));
    } catch (error) {
      console.error('保存设备档案失败:', error);
      toast.error(t('template.exifFields.device.saveFailed'));
    }
  };

  return (
    // 默认收起：多数照片本身带 EXIF，这块只在「手动镜头 / 老机器」时才需要展开
    <Collapsible
      defaultOpen={false}
      className="group/device rounded-md border border-border/60 bg-background/40"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {t('template.exifFields.device.title')}
        </span>
        {/* 收起时也能看出当前选了哪套设备 */}
        {selectedSummary ? (
          <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/80">
            {selectedSummary}
          </span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/device:rotate-180"
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 px-2 pb-2">
          {/* 右栏很窄：下拉各占一行并带前缀，避免两个挤在一行把「不使用」截成「不使」 */}
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-[11px] text-muted-foreground">
              {t('template.exifFields.device.cameraLabel')}
            </span>
            <Select value={cameraId} onValueChange={setCameraId}>
              <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
                <SelectValue placeholder={t('template.exifFields.device.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_DEVICE}>{t('template.exifFields.device.none')}</SelectItem>
                  {cameras.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-[11px] text-muted-foreground">
              {t('template.exifFields.device.lensLabel')}
            </span>
            <Select value={lensId} onValueChange={setLensId}>
              <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
                <SelectValue placeholder={t('template.exifFields.device.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_DEVICE}>{t('template.exifFields.device.none')}</SelectItem>
                  {lenses.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {/* Switch 渲染成 button 而不是 input，用 span + aria-label 描述，label 元素会被 a11y 规则拦下 */}
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Switch
                checked={fillEmpty}
                onCheckedChange={setFillEmpty}
                aria-label={t('template.exifFields.device.fillEmpty')}
              />
              {t('template.exifFields.device.fillEmpty')}
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                variant="plain"
                size="sm"
                className="min-w-0"
                title={t('template.exifFields.device.applyCurrent')}
                disabled={!hasSelection || busy}
                onClick={() => void handleApply('current')}
              >
                {t('template.exifFields.device.applyCurrentShort')}
              </Button>
              <Button
                type="button"
                variant="plain"
                size="sm"
                className="min-w-0"
                title={t('template.exifFields.device.applyAll')}
                disabled={!hasSelection || busy}
                onClick={() => void handleApply('all')}
              >
                {t('template.exifFields.device.applyAllShort')}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              {devices.length === 0 ? (
                <span>{t('template.exifFields.device.emptyHint')}</span>
              ) : (
                <>
                  <span>{t('template.exifFields.device.saveAs')}</span>
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => void handleSaveAsDevice('camera')}
                  >
                    {t('template.exifFields.device.saveCamera')}
                  </button>
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => void handleSaveAsDevice('lens')}
                  >
                    {t('template.exifFields.device.saveLens')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
