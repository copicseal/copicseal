import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { CompressOptions, CompressPreset } from '@/platform/contracts';
import { useTranslate } from '@/shared/i18n';
import { loadCompressConfig, saveCompressPresets } from '../lib/settings';
import type { CompressMode } from '../types';
import { createLocalId, DEFAULT_OPTIONS, optionsToPreset, presetToOptions } from '../utils/presets';

export interface CompressSettingsApi {
  options: CompressOptions;
  outputDir: string;
  cacheDir: string;
  mode: CompressMode;
  presets: CompressPreset[];
  /** 配置读完之前不要用 outputDir 判断「能不能开始」 */
  ready: boolean;
  setMode: (mode: CompressMode) => void;
  setOutputDir: (dir: string) => void;
  updateOption: <K extends keyof CompressOptions>(key: K, value: CompressOptions[K]) => void;
  applyOptions: (patch: Partial<CompressOptions>) => void;
  applyPreset: (preset: CompressPreset) => void;
  /** 保存当前参数为预设；成功返回 true（调用方据此关对话框） */
  savePreset: (name: string) => Promise<boolean>;
  deletePreset: (id: string) => Promise<void>;
}

/**
 * 压缩参数 + 预设的会话状态。
 *
 * 参数不落配置（只有「预设」落 `config.compress`）：一次性的压缩不应该改变下次打开
 * 工具的默认值；想留住的组合用「保存预设」显式保存。
 */
export function useCompressSettings(): CompressSettingsApi {
  const t = useTranslate();
  const [options, setOptions] = useState<CompressOptions>(DEFAULT_OPTIONS);
  const [outputDir, setOutputDir] = useState('');
  const [cacheDir, setCacheDir] = useState('');
  const [presets, setPresets] = useState<CompressPreset[]>([]);
  const [mode, setMode] = useState<CompressMode>('custom');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadCompressConfig().then((snapshot) => {
      if (cancelled) {
        return;
      }

      // 输出目录默认沿用设置里的导出目录，用户已经手填过就不要再覆盖
      setOutputDir((previous) => previous || snapshot.outputDir);
      setCacheDir(snapshot.cacheDir);
      setPresets(snapshot.presets);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateOption = useCallback(
    <K extends keyof CompressOptions>(key: K, value: CompressOptions[K]) => {
      setOptions((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const applyOptions = useCallback((patch: Partial<CompressOptions>) => {
    setOptions((previous) => ({ ...previous, ...patch }));
  }, []);

  const applyPreset = useCallback((preset: CompressPreset) => {
    setOptions((previous) => ({ ...previous, ...presetToOptions(preset) }));
  }, []);

  const savePreset = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return false;
      }

      const preset = optionsToPreset(createLocalId('compress-preset'), trimmed, options);

      try {
        const saved = await saveCompressPresets([...presets, preset]);
        setPresets(saved);
        toast.success(t('compress.presets.savedToast', { name: trimmed }));
        return true;
      } catch (error) {
        console.error('保存压缩预设失败:', error);
        toast.error(t('compress.presets.saveFailed'), {
          description: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [options, presets, t],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      try {
        const saved = await saveCompressPresets(presets.filter((preset) => preset.id !== id));
        setPresets(saved);
      } catch (error) {
        console.error('删除压缩预设失败:', error);
        toast.error(t('compress.presets.saveFailed'), {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [presets, t],
  );

  return {
    options,
    outputDir,
    cacheDir,
    mode,
    presets,
    ready,
    setMode,
    setOutputDir,
    updateOption,
    applyOptions,
    applyPreset,
    savePreset,
    deletePreset,
  };
}
