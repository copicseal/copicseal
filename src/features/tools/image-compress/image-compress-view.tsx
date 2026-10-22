import { FolderOpen, ImageDown, ImagePlus, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { CompressOptions } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { CoDropZone } from '@/shared/components/co-drop-zone';
import { useTranslate } from '@/shared/i18n';
import { Button } from '@/shared/ui/button';
import { ComparePreview } from './components/compare-preview';
import { ImportBar } from './components/import-bar';
import { SettingsPanel } from './components/settings-panel';
import { TaskFooter } from './components/task-footer';
import { TaskList } from './components/task-list';
import { useCompressSettings } from './hooks/use-compress-settings';
import { useCompressTasks } from './hooks/use-compress-tasks';
import { DEFAULT_OPTIONS } from './utils/presets';

/**
 * 图片压缩工具页。
 *
 * 布局：顶部导入条 · 左栏任务列表 · 中栏真实前后对比 · 右栏参数 · 底部进度与统计。
 * 所有编解码与写盘都在 Rust 侧完成（见 `src-tauri/src/compress.rs`），
 * 这里只做任务编排与展示，不在 React 组件里堆压缩业务逻辑。
 */
export default function ImageCompressView() {
  const t = useTranslate();
  const settings = useCompressSettings();
  const tasks = useCompressTasks(settings.cacheDir);

  const hasWebp = tasks.tasks.some((task) => task.ext === 'webp');
  const needsOutput = settings.options.output_mode === 'custom' && !settings.outputDir;
  const canStart =
    settings.ready && tasks.canRun && !needsOutput && !tasks.running && !tasks.importing;
  const hint = !settings.ready
    ? null
    : !tasks.canRun
      ? t('compress.footer.noImages')
      : needsOutput
        ? t('compress.footer.noOutput')
        : tasks.tasks.some((task) => task.blockedReason)
          ? t('compress.footer.notReady')
          : null;

  const handleChooseDir = useCallback(async () => {
    try {
      const picked = await platformRuntime.openDirectoryDialog();
      const dir = Array.isArray(picked) ? picked[0] : picked;
      if (dir) {
        settings.setOutputDir(dir);
      }
    } catch (error) {
      console.warn('选择输出目录失败:', error);
    }
  }, [settings]);

  /** 统一的「能不能开始」校验：把原因用 toast 说清楚，而不是让按钮静默失败。 */
  const ensureReady = useCallback(
    (options: CompressOptions) => {
      if (tasks.tasks.every((task) => task.blockedReason)) {
        toast.error(t('compress.footer.noImages'));
        return false;
      }

      if (options.output_mode === 'custom' && !settings.outputDir) {
        toast.error(t('compress.footer.noOutput'));
        return false;
      }

      return true;
    },
    [settings.outputDir, t, tasks.tasks],
  );

  const handleStart = useCallback(async () => {
    if (!ensureReady(settings.options)) {
      return;
    }
    await tasks.startAll(settings.options, settings.outputDir);
  }, [ensureReady, settings.options, settings.outputDir, tasks]);

  const handleQuickStart = useCallback(async () => {
    const quickOptions: CompressOptions = { ...DEFAULT_OPTIONS };
    if (!ensureReady(quickOptions)) {
      return;
    }
    settings.applyOptions(quickOptions);
    await tasks.startAll(quickOptions, settings.outputDir);
  }, [ensureReady, settings, tasks]);

  const handleReprocess = useCallback(
    async (id: string) => {
      if (!ensureReady(settings.options)) {
        return;
      }
      await tasks.startOne(id, settings.options, settings.outputDir);
    },
    [ensureReady, settings.options, settings.outputDir, tasks],
  );

  const handleRetry = useCallback(async () => {
    if (!ensureReady(settings.options)) {
      return;
    }
    await tasks.retryFailed(settings.options, settings.outputDir);
  }, [ensureReady, settings.options, settings.outputDir, tasks]);

  const empty = tasks.tasks.length === 0;

  return (
    <CoDropZone
      className="h-full w-full flex-col items-stretch justify-start gap-3 rounded-none border-0 p-0 hover:border-transparent"
      onFilesDrop={(files) => void tasks.addFiles(files)}
    >
      {empty ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-2">
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border p-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {tasks.importing ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImageDown className="size-5" />
              )}
            </span>

            <div className="space-y-1">
              <p className="text-sm font-medium">{t('compress.import.dropTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('compress.import.dropHint')}</p>
              <p className="pt-1 text-[11px] leading-4 text-muted-foreground/80">
                {t('compress.import.dropNote')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={() => void tasks.pickFiles()} disabled={tasks.importing}>
                <ImagePlus data-icon="inline-start" />
                {t('compress.import.pickFiles')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void tasks.pickFolder()}
                disabled={tasks.importing}
              >
                <FolderOpen data-icon="inline-start" />
                {t('compress.import.pickFolder')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ImportBar
            count={tasks.tasks.length}
            importing={tasks.importing}
            running={tasks.running}
            onPickFiles={() => void tasks.pickFiles()}
            onPickFolder={() => void tasks.pickFolder()}
            onClear={tasks.clearTasks}
          />

          <div className="flex min-h-0 flex-1 gap-3">
            <TaskList
              tasks={tasks.tasks}
              selectedId={tasks.selectedId}
              running={tasks.running}
              onSelect={tasks.select}
              onRemove={tasks.removeTask}
            />

            <ComparePreview
              task={tasks.selectedTask}
              running={tasks.running}
              resolveCacheDir={tasks.resolveCacheDir}
              onReprocess={(id) => void handleReprocess(id)}
            />

            <SettingsPanel
              mode={settings.mode}
              options={settings.options}
              outputDir={settings.outputDir}
              presets={settings.presets}
              running={tasks.running}
              importing={tasks.importing}
              hasWebp={hasWebp}
              onModeChange={settings.setMode}
              onOptionChange={settings.updateOption}
              onApplyOptions={settings.applyOptions}
              onApplyPreset={settings.applyPreset}
              onSavePreset={settings.savePreset}
              onDeletePreset={settings.deletePreset}
              onChooseDir={() => void handleChooseDir()}
              onQuickStart={() => void handleQuickStart()}
            />
          </div>

          <TaskFooter
            tasks={tasks.tasks}
            progress={tasks.progress}
            running={tasks.running}
            canStart={canStart}
            hint={hint}
            outputDir={
              settings.options.output_mode === 'custom' && settings.outputDir
                ? settings.outputDir
                : null
            }
            onStart={() => void handleStart()}
            onCancel={() => void tasks.cancel()}
            onRetry={() => void handleRetry()}
            onOpenOutput={() => {
              void platformRuntime.openDirectory(settings.outputDir).catch((error) => {
                console.warn('打开输出目录失败:', error);
              });
            }}
          />
        </>
      )}
    </CoDropZone>
  );
}
