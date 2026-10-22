import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CompressTask } from '@/features/tools/image-compress/types';
import type { CompressOptions, CompressProgress, ImageProbe } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { useTranslate } from '@/shared/i18n';
import { isRunnable, toTaskStatus } from '../types';
import { formatFileSize, formatPercent, sizeChange } from '../utils/format';
import { createLocalId, MAX_TASKS } from '../utils/presets';

const THUMBNAIL_EDGE = 160;
const THUMBNAIL_CONCURRENCY = 3;

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
}

function probeToTask(probe: ImageProbe): CompressTask {
  return {
    id: createLocalId('compress-task'),
    path: probe.path,
    name: probe.name,
    ext: probe.ext,
    size: probe.size,
    width: probe.width,
    height: probe.height,
    thumbnailPath: null,
    status: 'pending',
    stage: '',
    result: null,
    blockedReason: probe.error,
  };
}

export interface CompressTasksApi {
  tasks: CompressTask[];
  selectedId: string | null;
  selectedTask: CompressTask | null;
  progress: CompressProgress | null;
  running: boolean;
  importing: boolean;
  /** 有图片、且没有「被拦下」的项 */
  canRun: boolean;
  select: (id: string) => void;
  pickFiles: () => Promise<void>;
  pickFolder: () => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeTask: (id: string) => void;
  clearTasks: () => void;
  startAll: (options: CompressOptions, outputDir: string) => Promise<void>;
  startOne: (id: string, options: CompressOptions, outputDir: string) => Promise<void>;
  retryFailed: (options: CompressOptions, outputDir: string) => Promise<void>;
  cancel: () => Promise<void>;
  /** 预览图生成需要缓存目录（Rust 侧写入 `<cache>/Compress/`） */
  resolveCacheDir: () => Promise<string>;
}

/**
 * 压缩任务的核心逻辑：导入（选文件 / 选文件夹 / 拖入）、去重、缩略图、执行、进度、取消、重试。
 *
 * 真正耗时的编解码在 Rust 侧（`compress_images`，内部有界并发），这里只负责：
 * 组织任务列表、把进度事件落到行上、把结果按 id 回填。UI 组件不直接碰这些逻辑。
 */
export function useCompressTasks(defaultCacheDir: string): CompressTasksApi {
  const t = useTranslate();
  const [tasks, setTasks] = useState<CompressTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<CompressProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);

  const tasksRef = useRef<CompressTask[]>([]);
  const cacheDirRef = useRef(defaultCacheDir);
  const thumbnailQueue = useRef<string[]>([]);
  const thumbnailActive = useRef(0);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    if (defaultCacheDir) {
      cacheDirRef.current = defaultCacheDir;
    }
  }, [defaultCacheDir]);

  const resolveCacheDir = useCallback(async () => {
    if (cacheDirRef.current) {
      return cacheDirRef.current;
    }

    const config = await platformRuntime.getConfig();
    cacheDirRef.current = config.cache?.directory ?? '';
    return cacheDirRef.current;
  }, []);

  const pumpThumbnails = useCallback(async () => {
    if (thumbnailActive.current >= THUMBNAIL_CONCURRENCY) {
      return;
    }

    const path = thumbnailQueue.current.shift();
    if (!path) {
      return;
    }

    thumbnailActive.current += 1;

    try {
      const cacheDir = await resolveCacheDir();
      const thumbnailPath = await platformRuntime.createImagePreview(
        path,
        cacheDir,
        THUMBNAIL_EDGE,
      );
      setTasks((previous) =>
        previous.map((task) => (task.path === path ? { ...task, thumbnailPath } : task)),
      );
    } catch (error) {
      // 缩略图失败不影响压缩本身，退化成占位图标即可
      console.warn('生成缩略图失败:', error);
    } finally {
      thumbnailActive.current -= 1;
      void pumpThumbnails();
    }
  }, [resolveCacheDir]);

  const enqueueThumbnails = useCallback(
    (paths: string[]) => {
      thumbnailQueue.current.push(...paths);
      for (let index = 0; index < THUMBNAIL_CONCURRENCY; index += 1) {
        void pumpThumbnails();
      }
    },
    [pumpThumbnails],
  );

  const addPaths = useCallback(
    async (paths: string[]) => {
      const existing = new Set(tasksRef.current.map((task) => task.path.toLowerCase()));
      const unique: string[] = [];
      let duplicates = 0;

      for (const path of paths) {
        const key = path.toLowerCase();
        if (existing.has(key)) {
          duplicates += 1;
          continue;
        }
        existing.add(key);
        unique.push(path);
      }

      // 列表上限：一次拖进几千张会把缩略图队列和内存拖垮，超出的直接忽略
      const room = Math.max(0, MAX_TASKS - tasksRef.current.length);
      if (unique.length > room) {
        unique.splice(room);
      }

      if (unique.length === 0) {
        if (duplicates > 0) {
          toast.info(t('compress.import.addedNone'), {
            description: t('compress.import.skippedDuplicates', { count: duplicates }),
          });
        }
        return;
      }

      setImporting(true);
      try {
        const probes = await platformRuntime.probeImages(unique);
        const incoming = probes.map(probeToTask);

        setTasks((previous) => [...previous, ...incoming]);
        setSelectedId((previous) => previous ?? incoming[0]?.id ?? null);
        enqueueThumbnails(incoming.filter(isRunnable).map((task) => task.path));

        const blocked = incoming.filter((task) => task.blockedReason).length;
        const description = [
          duplicates > 0 ? t('compress.import.skippedDuplicates', { count: duplicates }) : '',
          blocked > 0 ? t('compress.import.skippedUnsupported', { count: blocked }) : '',
        ]
          .filter(Boolean)
          .join(' · ');

        toast.success(t('compress.import.addedMany', { count: incoming.length }), {
          description: description || undefined,
        });
      } catch (error) {
        console.error('读取图片信息失败:', error);
        toast.error(t('compress.import.failed'), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setImporting(false);
      }
    },
    [enqueueThumbnails, t],
  );

  const pickFiles = useCallback(async () => {
    try {
      const picked = await platformRuntime.openImageDialog();
      const paths = (Array.isArray(picked) ? picked : picked ? [picked] : []).filter(Boolean);
      if (paths.length > 0) {
        await addPaths(paths);
      }
    } catch (error) {
      console.warn('原生文件对话框不可用:', error);
      toast.error(t('compress.import.failed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [addPaths, t]);

  const addPathsRef = useRef(addPaths);
  addPathsRef.current = addPaths;

  const pickFolder = useCallback(async () => {
    try {
      const picked = await platformRuntime.openDirectoryDialog();
      const dir = Array.isArray(picked) ? picked[0] : picked;
      if (!dir) {
        return;
      }

      setImporting(true);
      try {
        const result = await platformRuntime.listImages(dir, true);
        if (result.skipped.length > 0) {
          toast.info(t('compress.import.skippedUnsupported', { count: result.skipped.length }));
        }
        if (result.paths.length === 0) {
          toast.info(t('compress.import.addedNone'));
          return;
        }
        await addPathsRef.current(result.paths);
      } finally {
        setImporting(false);
      }
    } catch (error) {
      console.error('读取文件夹失败:', error);
      toast.error(t('compress.import.folderFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [t]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      if (list.length === 0) {
        return;
      }

      setImporting(true);
      try {
        const cacheDir = await resolveCacheDir();
        const paths: string[] = [];

        // HTML5 拖放只有字节：先原样落成临时文件，再走与「选择图片」完全相同的链路
        for (const file of list) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const path = await platformRuntime.stageDroppedFile(cacheDir, file.name, bytes);
          paths.push(path);
        }

        await addPathsRef.current(paths);
      } catch (error) {
        console.error('拖入文件落盘失败:', error);
        toast.error(t('compress.import.failed'), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setImporting(false);
      }
    },
    [resolveCacheDir, t],
  );

  const select = useCallback((id: string) => setSelectedId(id), []);

  const removeTask = useCallback((id: string) => {
    const remaining = tasksRef.current.filter((task) => task.id !== id);
    setTasks(remaining);
    // 删掉的正好是选中项时，把选中挪到相邻的一张，避免中栏突然空掉
    setSelectedId((previous) => {
      if (previous !== id) {
        return previous;
      }
      const index = tasksRef.current.findIndex((task) => task.id === id);
      return remaining[index]?.id ?? remaining[Math.max(0, index - 1)]?.id ?? null;
    });
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    setSelectedId(null);
  }, []);

  const runBatch = useCallback(
    async (targets: CompressTask[], options: CompressOptions, outputDir: string) => {
      if (targets.length === 0) {
        return;
      }

      const ids = new Set(targets.map((task) => task.id));
      setRunning(true);
      setProgress(null);
      setTasks((previous) =>
        previous.map((task) =>
          ids.has(task.id) ? { ...task, status: 'pending', stage: '', result: null } : task,
        ),
      );

      let unlisten: (() => void) | null = null;

      try {
        unlisten = await platformRuntime.onCompressProgress((update) => {
          setProgress(update);
          const currentId = update.current_id;
          if (!currentId || !update.current_stage) {
            return;
          }
          setTasks((previous) =>
            previous.map((task) =>
              task.id === currentId
                ? { ...task, status: 'running', stage: update.current_stage }
                : task,
            ),
          );
        });

        const outcome = await platformRuntime.compressImages(
          targets.map((task) => ({ id: task.id, path: task.path })),
          options,
          options.output_mode === 'custom' ? outputDir : '',
        );

        const results = new Map(outcome.results.map((result) => [result.id, result]));
        setTasks((previous) =>
          previous.map((task) => {
            const result = results.get(task.id);
            return result
              ? { ...task, status: toTaskStatus(result.status), stage: '', result }
              : task;
          }),
        );

        const change = sizeChange(outcome.total_original, outcome.total_output);
        const saved = formatFileSize(Math.abs(change.saved)) || '0 B';
        const percent = formatPercent(Math.abs(change.percent));

        if (outcome.cancelled) {
          toast.info(t('compress.footer.cancelledToast'));
        } else {
          toast.success(t('compress.footer.doneToast'), {
            description: change.bigger
              ? t('compress.footer.summaryBigger', {
                  succeeded: outcome.succeeded,
                  failed: outcome.failed,
                  saved,
                  percent,
                })
              : t('compress.footer.summary', {
                  succeeded: outcome.succeeded,
                  failed: outcome.failed,
                  saved,
                  percent,
                }),
          });
        }
      } catch (error) {
        console.error('压缩失败:', error);
        toast.error(t('compress.footer.failedToast'), {
          description: error instanceof Error ? error.message : String(error),
        });
        setTasks((previous) =>
          previous.map((task) =>
            ids.has(task.id) && task.status === 'running'
              ? { ...task, status: 'failed', stage: '' }
              : task,
          ),
        );
      } finally {
        setRunning(false);
        setProgress(null);
        if (unlisten) {
          unlisten();
        }
      }
    },
    [t],
  );

  const startAll = useCallback(
    async (options: CompressOptions, outputDir: string) => {
      await runBatch(tasksRef.current.filter(isRunnable), options, outputDir);
    },
    [runBatch],
  );

  const startOne = useCallback(
    async (id: string, options: CompressOptions, outputDir: string) => {
      const target = tasksRef.current.find((task) => task.id === id);
      if (target && isRunnable(target)) {
        await runBatch([target], options, outputDir);
      }
    },
    [runBatch],
  );

  const retryFailed = useCallback(
    async (options: CompressOptions, outputDir: string) => {
      const failed = tasksRef.current.filter(
        (task) => task.status === 'failed' && isRunnable(task),
      );
      await runBatch(failed, options, outputDir);
    },
    [runBatch],
  );

  const cancel = useCallback(async () => {
    try {
      await platformRuntime.cancelCompress();
    } catch (error) {
      console.warn('取消压缩失败:', error);
    }
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  const canRun = tasks.some(isRunnable);

  return {
    tasks,
    selectedId,
    selectedTask,
    progress,
    running,
    importing,
    canRun,
    select,
    pickFiles,
    pickFolder,
    addFiles,
    removeTask,
    clearTasks,
    startAll,
    startOne,
    retryFailed,
    cancel,
    resolveCacheDir,
  };
}
