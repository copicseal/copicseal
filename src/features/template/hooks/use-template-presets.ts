import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { resolveTemplatePresets, saveTemplatePresets } from '@/platform';
import { useTranslate } from '@/shared/i18n';
import {
  createTemplatePresetRecord,
  isValidPresetName,
  MAX_TEMPLATE_PRESETS,
  overwriteTemplatePresetRecord,
  parseTemplatePresets,
  TEMPLATE_PRESET_NAME_MAX,
  TEMPLATE_PRESET_NAME_MIN,
  type TemplatePresetContent,
  type TemplatePresetRecord,
  toTemplatePreset,
} from '../lib/template-preset';
import { useTemplateStore } from '../store/use-template-store';

export interface TemplatePresetsController {
  presets: TemplatePresetRecord[];
  /** 新建一条预设；名称非法或已达上限时返回 null 并提示。 */
  createPreset: (
    name: string,
    content: TemplatePresetContent,
  ) => Promise<TemplatePresetRecord | null>;
  /** 用当前照片的配置覆盖已有预设，名称与 id 不变。 */
  overwritePreset: (id: string, content: TemplatePresetContent) => Promise<void>;
  removePreset: (id: string) => Promise<void>;
  renamePreset: (id: string, name: string) => Promise<void>;
  /** 上移 / 下移一位；越界时不做任何事。 */
  movePreset: (id: string, delta: number) => Promise<void>;
}

/**
 * 模板预设的读写。
 *
 * 持久化落在 `config.template_presets`，会话内的清单放在 template store：
 * 模板页与设置页各自挂载这个 hook，读到的是同一份数据，改完两边立刻同步。
 */
export function useTemplatePresets(): TemplatePresetsController {
  const t = useTranslate();
  const presets = useTemplateStore((state) => state.templatePresets);
  const setTemplatePresets = useTemplateStore((state) => state.setTemplatePresets);

  // 启动时把配置里的预设装进 store；配置是过去某个版本写的，解析时一并归一
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await resolveTemplatePresets();
      if (!cancelled) {
        setTemplatePresets(parseTemplatePresets(stored));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTemplatePresets]);

  /** 先落库再更新会话：写盘失败时界面不会显示一个并不存在的预设。 */
  const persist = useCallback(
    async (next: TemplatePresetRecord[]) => {
      try {
        await saveTemplatePresets(next.map(toTemplatePreset));
        setTemplatePresets(next);
      } catch (error) {
        console.error('保存模板预设失败:', error);
        toast.error(t('template.preset.saveFailed'));
      }
    },
    [setTemplatePresets, t],
  );

  const createPreset = useCallback(
    async (name: string, content: TemplatePresetContent) => {
      const trimmed = name.trim();

      if (!isValidPresetName(trimmed)) {
        toast.warning(
          t('template.preset.nameLength', {
            min: TEMPLATE_PRESET_NAME_MIN,
            max: TEMPLATE_PRESET_NAME_MAX,
          }),
        );
        return null;
      }

      if (presets.length >= MAX_TEMPLATE_PRESETS) {
        toast.warning(t('template.preset.limitReached', { count: MAX_TEMPLATE_PRESETS }));
        return null;
      }

      const record = createTemplatePresetRecord(trimmed, content);
      // 新存的排在最前，与旧版一致：刚存完就能在列表顶部看到
      await persist([record, ...presets]);
      return record;
    },
    [persist, presets, t],
  );

  const overwritePreset = useCallback(
    async (id: string, content: TemplatePresetContent) => {
      await persist(
        presets.map((preset) =>
          preset.id === id ? overwriteTemplatePresetRecord(preset, content) : preset,
        ),
      );
    },
    [persist, presets],
  );

  const removePreset = useCallback(
    async (id: string) => {
      await persist(presets.filter((preset) => preset.id !== id));
    },
    [persist, presets],
  );

  const renamePreset = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();

      if (!isValidPresetName(trimmed)) {
        toast.warning(
          t('template.preset.nameLength', {
            min: TEMPLATE_PRESET_NAME_MIN,
            max: TEMPLATE_PRESET_NAME_MAX,
          }),
        );
        return;
      }

      await persist(
        presets.map((preset) => (preset.id === id ? { ...preset, name: trimmed } : preset)),
      );
    },
    [persist, presets, t],
  );

  const movePreset = useCallback(
    async (id: string, delta: number) => {
      const from = presets.findIndex((preset) => preset.id === id);
      const to = from + delta;

      if (from < 0 || to < 0 || to >= presets.length) {
        return;
      }

      const next = [...presets];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      await persist(next);
    },
    [persist, presets],
  );

  return { presets, createPreset, overwritePreset, removePreset, renamePreset, movePreset };
}
