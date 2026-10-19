import {
  Check,
  ChevronDown,
  FolderOpen,
  Loader2,
  RefreshCw,
  RotateCcw,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  CopyRenameProgress,
  DirectoryEntry,
  RenameOutcome,
  RenamePair,
  RenamePreset,
  RenameSortBy,
} from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import type { MessageKey } from '@/shared/i18n';
import { useTranslate } from '@/shared/i18n/i18n-provider';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import type { ToolViewProps } from '../registry';
import { BUILTIN_PRESETS, buildPreview, type PreviewRow } from './naming';

/** 排序选项（顺序即下拉里的顺序）。 */
const SORT_OPTIONS: RenameSortBy[] = ['modified', 'created', 'name', 'taken'];

/** 排序依据 → 文案 key（显式映射，避免用模板串拼 key）。 */
const SORT_LABEL_KEYS: Record<RenameSortBy, MessageKey> = {
  modified: 'common.tools.batchRename.sort.modified',
  created: 'common.tools.batchRename.sort.created',
  name: 'common.tools.batchRename.sort.name',
  taken: 'common.tools.batchRename.sort.taken',
};

type ConflictKind = 'duplicate' | 'empty' | 'separator' | 'taken';

const CONFLICT_KEYS: Record<ConflictKind, MessageKey> = {
  duplicate: 'common.tools.batchRename.conflictDuplicate',
  empty: 'common.tools.batchRename.conflictEmpty',
  separator: 'common.tools.batchRename.conflictSeparator',
  // 只在复制模式下出现：目标目录里已经有同名文件
  taken: 'common.tools.batchRename.conflictTaken',
};

/** 写入方式：原地改名，或把改名后的副本放进另一个目录（原文件不动）。 */
type RenameMode = 'rename' | 'copy';

/**
 * 批量改文件名。
 *
 * 分工：排序、冲突校验、真正改名都在 Rust（`rename.rs`）；这里只负责规则模板、预览与交互，
 * 所以「点了执行到底改了什么」始终与预览一致，且有撤销兜底。
 */
export default function BatchRenameView(_props: ToolViewProps) {
  const t = useTranslate();
  const [folder, setFolder] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const [sortBy, setSortBy] = useState<RenameSortBy>('name');
  const [descending, setDescending] = useState(false);
  const [pattern, setPattern] = useState('{n}');
  const [start, setStart] = useState(1);
  const [padding, setPadding] = useState(1);
  /** 选中的扩展名（空 = 全部）；可选项由读目录的结果自动汇总 */
  const [selectedExts, setSelectedExts] = useState<string[]>([]);

  /** 「保存规则」对话框（不用 window.prompt：原生弹框和整体观感不搭） */
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetDraft, setPresetDraft] = useState('');

  /** 手动改过的文件名：键是原文件名，值是完整新名（规则只当默认值） */
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  /** 写入方式与复制目标 */
  const [mode, setMode] = useState<RenameMode>('rename');
  const [targetDir, setTargetDir] = useState<string | null>(null);
  /** 目标目录里已有的文件名（小写）：复制模式用来在预览里提前标出「会覆盖」 */
  const [targetNames, setTargetNames] = useState<Set<string>>(new Set());
  /** 复制进度（Rust 侧逐文件推送） */
  const [copyProgress, setCopyProgress] = useState<CopyRenameProgress | null>(null);

  /** 上一次执行成功的那批（用于撤销；只在本次会话内有效） */
  const [lastApplied, setLastApplied] = useState<{
    mode: RenameMode;
    /** 改名模式是源目录；复制模式是目标目录（撤销要在那边删副本） */
    dir: string;
    pairs: RenamePair[];
  } | null>(null);
  const [savedPresets, setSavedPresets] = useState<RenamePreset[]>([]);

  useEffect(() => {
    void platformRuntime
      .getConfig()
      .then((config) => setSavedPresets(config.rename?.presets ?? []))
      .catch((error) => console.warn('读取已保存的命名规则失败:', error));
  }, []);

  const loadEntries = useCallback(async () => {
    if (!folder) {
      setEntries([]);
      return;
    }

    setLoading(true);

    try {
      // 扩展名过滤放在前端做：这里一次拿全量，才能把「目录里到底有哪些扩展名」汇总给多选
      const list = await platformRuntime.readDirectoryEntries(folder, sortBy, descending, []);
      setEntries(list);
    } catch (error) {
      console.error('读取目录失败:', error);
      setEntries([]);
      toast.error(t('common.tools.batchRename.readFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }, [descending, folder, sortBy, t]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const loadTargetNames = useCallback(async () => {
    if (mode !== 'copy' || !targetDir) {
      setTargetNames(new Set());
      return;
    }

    try {
      const list = await platformRuntime.readDirectoryEntries(targetDir, 'name', false, []);
      setTargetNames(new Set(list.map((entry) => entry.name.toLowerCase())));
    } catch (error) {
      console.warn('读取目标目录失败:', error);
      setTargetNames(new Set());
    }
  }, [mode, targetDir]);

  useEffect(() => {
    void loadTargetNames();
  }, [loadTargetNames]);

  /** 目录里实际出现过的扩展名（自动汇总、按字母序） */
  const availableExts = useMemo(() => {
    const unique = new Set(entries.map((entry) => entry.ext).filter(Boolean));

    return [...unique].sort();
  }, [entries]);

  /** 换目录 / 文件改名后，把已经不存在于目录里的扩展名从选中项里剔掉 */
  useEffect(() => {
    setSelectedExts((previous) => previous.filter((ext) => availableExts.includes(ext)));
  }, [availableExts]);

  const visibleEntries = useMemo(
    () =>
      selectedExts.length === 0
        ? entries
        : entries.filter((entry) => selectedExts.includes(entry.ext)),
    [entries, selectedExts],
  );

  const overrideMap = useMemo(() => new Map(Object.entries(overrides)), [overrides]);

  const rows: PreviewRow[] = useMemo(
    () =>
      buildPreview(visibleEntries, {
        pattern,
        start,
        padding,
        // 复制到另一个目录时，「目标已存在」要提前提示；改名模式的占用判定交给 Rust
        reserved: mode === 'copy' ? targetNames : undefined,
        overrides: overrideMap,
      }),
    [visibleEntries, pattern, start, padding, mode, targetNames, overrideMap],
  );
  /**
   * 上一次成功的那批里，哪些行「就是这一批」。
   *
   * 复制模式最明显：原文件没动、预览也一模一样，只是目标目录里已经躺着副本，
   * 若按「目标已存在」判成冲突，成功后满屏红字——所以这些行改成绿色对号。
   */
  const doneKeys = useMemo(() => {
    if (!lastApplied || lastApplied.mode !== mode) {
      return new Set<string>();
    }

    const sameDir =
      lastApplied.mode === 'copy' ? lastApplied.dir === targetDir : lastApplied.dir === folder;

    return sameDir
      ? new Set(lastApplied.pairs.map((pair) => `${pair.from}\u0000${pair.to}`))
      : new Set<string>();
  }, [lastApplied, mode, targetDir, folder]);

  const isDone = (row: PreviewRow) => doneKeys.has(`${row.entry.name}\u0000${row.target}`);
  const conflicts = rows.filter((row) => row.conflict !== null && !isDone(row));
  /** 全部行都已完成 → 这一批没有可执行的东西了 */
  const allDone = rows.length > 0 && rows.every((row) => isDone(row));
  const fallbackCount = rows.filter((row) => row.usedFallbackTime).length;

  /** 目标目录与源目录相同（只做粗比较，最终由 Rust canonicalize 后拒绝） */
  const targetIsSource = Boolean(
    folder &&
      targetDir &&
      folder.replace(/[/\\]+$/, '').toLowerCase() ===
        targetDir.replace(/[/\\]+$/, '').toLowerCase(),
  );

  const extLabel =
    selectedExts.length === 0
      ? t('common.tools.batchRename.extensionsAll')
      : selectedExts.length === 1
        ? `.${selectedExts[0]}`
        : t('common.tools.batchRename.extensionsCount', { count: selectedExts.length });

  const pickFolder = async () => {
    try {
      const picked = await platformRuntime.openDirectoryDialog();

      if (picked) {
        setFolder(picked);
        setLastApplied(null);
        // 换目录后原文件名全变了，手动改名的键对不上，直接清掉
        setOverrides({});
      }
    } catch (error) {
      console.error('打开目录选择失败:', error);
      toast.error(t('common.tools.batchRename.openFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /** 点路径直接打开所在目录（Finder / 资源管理器） */
  const openFolder = async (path: string) => {
    try {
      await platformRuntime.openDirectory(path);
    } catch (error) {
      console.error('打开目录失败:', error);
      toast.error(t('common.tools.batchRename.openFolderFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const setOverride = (name: string, value: string) => {
    setOverrides((previous) => ({ ...previous, [name]: value }));
  };

  const clearOverride = (name: string) => {
    setOverrides((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const pickTargetDir = async () => {
    try {
      const picked = await platformRuntime.openDirectoryDialog();

      if (picked) {
        setTargetDir(picked);
      }
    } catch (error) {
      console.error('打开目录选择失败:', error);
      toast.error(t('common.tools.batchRename.openFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /** 执行：改名模式原地改；复制模式把副本写进目标目录（原文件不动）。 */
  const applyRename = async () => {
    if (!folder || conflicts.length > 0) {
      return;
    }

    if (mode === 'copy' && (!targetDir || targetIsSource)) {
      return;
    }

    setApplying(true);
    setCopyProgress(null);

    try {
      const pairs = rows.map((row) => ({ from: row.entry.name, to: row.target }));
      let outcome: RenameOutcome;

      if (mode === 'copy' && targetDir) {
        // 复制可能很慢（几百个大文件），跟着 Rust 的逐文件进度显示「已复制 n/N」
        const unsubscribe = await platformRuntime.onCopyRenameProgress(setCopyProgress);

        try {
          outcome = await platformRuntime.copyBatchRename(folder, targetDir, pairs);
        } finally {
          unsubscribe();
          setCopyProgress(null);
        }
      } else {
        outcome = await platformRuntime.applyBatchRename(folder, pairs);
      }

      if (outcome.conflicts.length > 0) {
        toast.error(t('common.tools.batchRename.blocked'), {
          description: outcome.conflicts.join('、'),
        });
      } else {
        if (outcome.renamed.length > 0) {
          setLastApplied({
            mode,
            // 复制模式的副本在目标目录，撤销要去那边删
            dir: mode === 'copy' && targetDir ? targetDir : folder,
            pairs: outcome.renamed,
          });
          toast.success(
            mode === 'copy'
              ? t('common.tools.batchRename.copied', { count: outcome.renamed.length })
              : t('common.tools.batchRename.applied', { count: outcome.renamed.length }),
          );
        }

        if (outcome.failed.length > 0) {
          toast.error(t('common.tools.batchRename.failedCount', { count: outcome.failed.length }), {
            description: outcome.failed.map((item) => `${item.name}: ${item.reason}`).join('\n'),
          });
        }
      }

      // 成功时保留列表（绿勾＝这一批已完成），点「重新开始」再刷新。
      // 复制模式仍刷新目标目录的名字：用户改规则后要按最新状态判冲突
      //（当前这批因为已记进 lastApplied，会被当成「已完成」而不是冲突）。
      if (mode === 'copy') {
        await loadTargetNames();
      } else if (outcome.failed.length > 0) {
        // 改名有失败时磁盘状态已经和预览不一致，立刻重读
        await loadEntries();
      }
    } catch (error) {
      console.error('执行批量改名失败:', error);
      toast.error(
        t(
          mode === 'copy'
            ? 'common.tools.batchRename.copyFailed'
            : 'common.tools.batchRename.applyFailed',
        ),
        { description: error instanceof Error ? error.message : String(error) },
      );
    } finally {
      setApplying(false);
    }
  };

  const undoRename = async () => {
    if (!lastApplied) {
      return;
    }

    setApplying(true);

    try {
      // 改名模式反向改名；复制模式删掉那批复本（原文件本来就没动）
      const outcome =
        lastApplied.mode === 'copy'
          ? await platformRuntime.undoCopyBatch(lastApplied.dir, lastApplied.pairs)
          : await platformRuntime.undoBatchRename(lastApplied.dir, lastApplied.pairs);

      if (outcome.renamed.length > 0) {
        toast.success(
          lastApplied.mode === 'copy'
            ? t('common.tools.batchRename.undoneCopy', { count: outcome.renamed.length })
            : t('common.tools.batchRename.undone', { count: outcome.renamed.length }),
        );
      }

      if (outcome.failed.length > 0) {
        toast.error(t('common.tools.batchRename.failedCount', { count: outcome.failed.length }), {
          description: outcome.failed.map((item) => `${item.name}: ${item.reason}`).join('\n'),
        });
      }

      const undoneMode = lastApplied.mode;
      setLastApplied(null);

      if (undoneMode === 'copy') {
        await loadTargetNames();
      } else {
        await loadEntries();
      }
    } catch (error) {
      console.error('撤销批量改名失败:', error);
      toast.error(t('common.tools.batchRename.applyFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setApplying(false);
    }
  };

  /** 重新开始：清掉「上一批已完成」的状态，重新读一遍目录 */
  const restart = () => {
    setLastApplied(null);
    setCopyProgress(null);

    if (mode === 'copy') {
      void loadTargetNames();
    } else {
      void loadEntries();
    }
  };

  const saveCurrentPreset = () => {
    setPresetDraft('');
    setSavePresetOpen(true);
  };

  const confirmSavePreset = async () => {
    const name = presetDraft.trim();

    if (!name) {
      return;
    }

    const preset: RenamePreset = {
      id: crypto.randomUUID(),
      name,
      pattern,
      start,
      padding,
      sort_by: sortBy,
      descending,
    };

    try {
      const config = await platformRuntime.getConfig();
      const next = [...(config.rename?.presets ?? []), preset];
      await platformRuntime.updateConfig({ ...config, rename: { presets: next } });
      setSavedPresets(next);
      setSavePresetOpen(false);
      setPresetDraft('');
      toast.success(t('common.tools.batchRename.presetSaved', { name: preset.name }));
    } catch (error) {
      console.error('保存命名规则失败:', error);
      toast.error(t('common.tools.batchRename.presetSaveFailed'));
    }
  };

  const deletePreset = async (preset: RenamePreset) => {
    try {
      const config = await platformRuntime.getConfig();
      const next = (config.rename?.presets ?? []).filter((item) => item.id !== preset.id);
      await platformRuntime.updateConfig({ ...config, rename: { presets: next } });
      setSavedPresets(next);
    } catch (error) {
      console.error('删除命名规则失败:', error);
      toast.error(t('common.tools.batchRename.presetSaveFailed'));
    }
  };

  /** 套用一条规则（内置或自己保存的）。 */
  const applyPreset = (values: {
    pattern: string;
    start: number;
    padding: number;
    sortBy?: RenameSortBy;
  }) => {
    setPattern(values.pattern);
    setStart(values.start);
    setPadding(values.padding);

    if (values.sortBy) {
      setSortBy(values.sortBy);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {folder ? (
        /* 已选目录：路径 + 换目录 */
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => void pickFolder()}>
            <FolderOpen data-icon="inline-start" />
            {t('common.tools.batchRename.changeFolder')}
          </Button>
          <button
            type="button"
            onClick={() => void openFolder(folder)}
            className="min-w-0 truncate text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            title={`${folder}\n${t('common.tools.batchRename.openFolder')}`}
          >
            {folder}
          </button>
          {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
      ) : (
        /* 未选目录：与快门数页同一套空态（居中、约 320px 高的虚线框），只换文案与按钮 */
        <div className="flex flex-1 items-center justify-center">
          <div className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 text-center">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <Tags className="size-7" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('common.tools.batchRename.emptyTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('common.tools.batchRename.emptyHint')}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void pickFolder()}>
                <FolderOpen data-icon="inline-start" />
                {t('common.tools.batchRename.chooseFolder')}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                {t('common.tools.batchRename.emptyNote')}
              </p>
            </div>
          </div>
        </div>
      )}

      {folder ? (
        <>
          {/* 排序 + 规则（高度固定，不被预览挤压） */}
          <div className="shrink-0 space-y-3 rounded-lg border border-border/80 bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{t('common.tools.batchRename.sortBy')}</span>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as RenameSortBy)}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(SORT_LABEL_KEYS[option])}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={descending ? 'desc' : 'asc'}
                onValueChange={(value) => setDescending(value === 'desc')}
              >
                <SelectTrigger size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="asc">{t('common.tools.batchRename.ascending')}</SelectItem>
                    <SelectItem value="desc">{t('common.tools.batchRename.descending')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <span className="ml-2 text-muted-foreground">
                {t('common.tools.batchRename.extensions')}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-32 justify-between"
                    disabled={availableExts.length === 0}
                  >
                    <span className="truncate">{extLabel}</span>
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onSelect={() => setSelectedExts([])}>
                    {t('common.tools.batchRename.extensionsAll')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {availableExts.map((ext) => (
                    <DropdownMenuCheckboxItem
                      key={ext}
                      checked={selectedExts.includes(ext)}
                      // 多选：点复选框时不要让菜单收起
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        setSelectedExts((previous) =>
                          checked ? [...previous, ext] : previous.filter((item) => item !== ext),
                        )
                      }
                    >
                      .{ext}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{t('common.tools.batchRename.rule')}</span>
              <Input
                className="w-48"
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
              />
              <span className="text-muted-foreground">{t('common.tools.batchRename.start')}</span>
              <Input
                type="number"
                min={0}
                className="w-16"
                value={start}
                onChange={(event) => setStart(Math.max(0, Number(event.target.value) || 0))}
              />
              <span className="text-muted-foreground">{t('common.tools.batchRename.padding')}</span>
              <Input
                type="number"
                min={1}
                max={8}
                className="w-16"
                value={padding}
                onChange={(event) =>
                  setPadding(Math.min(8, Math.max(1, Number(event.target.value) || 1)))
                }
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t('common.tools.batchRename.ruleHint')}
            </p>

            {/* 规则来源：内置 + 保存的 */}
            <div className="space-y-1.5 border-t border-border/60 pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {t('common.tools.batchRename.presetsBuiltin')}
                </span>
                {BUILTIN_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      applyPreset({
                        pattern: preset.pattern,
                        start: preset.start,
                        padding: preset.padding,
                        sortBy: preset.sortBy,
                      })
                    }
                  >
                    {t(preset.labelKey)}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {t('common.tools.batchRename.presetsSaved')}
                </span>
                {savedPresets.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/70">
                    {t('common.tools.batchRename.presetsSavedEmpty')}
                  </span>
                ) : (
                  savedPresets.map((preset) => (
                    <span
                      key={preset.id}
                      className="inline-flex items-center gap-0.5 rounded-md border border-border pl-1.5"
                    >
                      <Button
                        type="button"
                        variant="plain"
                        size="xs"
                        title={preset.pattern}
                        onClick={() =>
                          applyPreset({
                            pattern: preset.pattern,
                            start: preset.start,
                            padding: preset.padding,
                            sortBy: preset.sort_by,
                          })
                        }
                      >
                        {preset.name}
                      </Button>
                      <Button
                        type="button"
                        variant="plain"
                        size="icon-xs"
                        aria-label={t('common.tools.batchRename.deletePreset')}
                        onClick={() => void deletePreset(preset)}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  ))
                )}
                <Button
                  type="button"
                  variant="plain"
                  size="sm"
                  onClick={() => void saveCurrentPreset()}
                >
                  {t('common.tools.batchRename.savePreset')}
                </Button>
              </div>
            </div>
          </div>

          {/* 预览：吃掉剩余高度，行数变化时页面高度不跳 */}
          <div className="flex min-h-40 flex-1 flex-col gap-2">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-foreground">
                {t('common.tools.batchRename.preview')}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t('common.tools.batchRename.previewCount', { count: rows.length })}
                {fallbackCount > 0
                  ? ` · ${t('common.tools.batchRename.fallbackTime', { count: fallbackCount })}`
                  : ''}
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                {loading
                  ? t('common.tools.batchRename.loading')
                  : t('common.tools.batchRename.empty')}
              </p>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border/80">
                <div className="grid grid-cols-2 gap-2 border-b border-border/60 bg-muted/50 px-3 py-1.5 text-[10px] text-muted-foreground">
                  <span>{t('common.tools.batchRename.oldName')}</span>
                  <span>{t('common.tools.batchRename.newName')}</span>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="p-1">
                    {rows.map((row) => {
                      const done = isDone(row);

                      return (
                        <div
                          key={row.entry.name}
                          className={cn(
                            'grid grid-cols-2 items-center gap-2 rounded-md px-2 py-1 text-[11px]',
                            done
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : row.conflict
                                ? 'bg-destructive/10 text-destructive'
                                : 'odd:bg-muted/20',
                          )}
                        >
                          <span className="truncate" title={row.entry.name}>
                            {row.entry.name}
                          </span>
                          <span className="flex min-w-0 items-center gap-1">
                            <Input
                              aria-label={t('common.tools.batchRename.newName')}
                              value={row.target}
                              onChange={(event) => setOverride(row.entry.name, event.target.value)}
                              className="h-6 min-w-0 flex-1 border-transparent bg-transparent px-1 text-[11px] shadow-none hover:border-border focus-visible:border-ring"
                              title={row.edited ? `${row.generated}` : undefined}
                            />
                            {row.edited ? (
                              <Button
                                type="button"
                                variant="plain"
                                size="icon-sm"
                                aria-label={t('common.tools.batchRename.resetName')}
                                title={t('common.tools.batchRename.resetName')}
                                onClick={() => clearOverride(row.entry.name)}
                              >
                                <X className="size-3" />
                              </Button>
                            ) : null}
                            {done ? (
                              <span className="inline-flex shrink-0 items-center gap-1 text-[10px]">
                                <Check className="size-3" />
                                {mode === 'copy'
                                  ? t('common.tools.batchRename.rowCopied')
                                  : t('common.tools.batchRename.rowRenamed')}
                              </span>
                            ) : row.conflict ? (
                              <span className="shrink-0 text-[10px] opacity-80">
                                {t(CONFLICT_KEYS[row.conflict as ConflictKind])}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* 执行（固定在底部，不被预览挤压） */}
          <div className="shrink-0 space-y-2">
            {/* 写入方式：就地改名，或把改名后的副本放进另一个目录（原文件不动） */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {t('common.tools.batchRename.writeMode')}
              </span>
              <Select value={mode} onValueChange={(value) => setMode(value as RenameMode)}>
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="rename">
                      {t('common.tools.batchRename.modeRename')}
                    </SelectItem>
                    <SelectItem value="copy">{t('common.tools.batchRename.modeCopy')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {mode === 'copy' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void pickTargetDir()}
                  >
                    <FolderOpen data-icon="inline-start" />
                    {targetDir
                      ? t('common.tools.batchRename.changeTarget')
                      : t('common.tools.batchRename.chooseTarget')}
                  </Button>
                  {targetDir ? (
                    <button
                      type="button"
                      onClick={() => void openFolder(targetDir)}
                      className="min-w-0 max-w-full truncate text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      title={`${targetDir}\n${t('common.tools.batchRename.openFolder')}`}
                    >
                      {targetDir}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('common.tools.batchRename.noTarget')}
                    </span>
                  )}
                </>
              ) : null}
            </div>
            {mode === 'copy' ? (
              <p className="text-[10px] text-muted-foreground">
                {t('common.tools.batchRename.copyHint')}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={
                  applying ||
                  rows.length === 0 ||
                  allDone ||
                  conflicts.length > 0 ||
                  (mode === 'copy' && (!targetDir || targetIsSource))
                }
                onClick={() => void applyRename()}
              >
                <Tags data-icon="inline-start" />
                {mode === 'copy'
                  ? t('common.tools.batchRename.copyAction')
                  : t('common.tools.batchRename.apply')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={applying || !lastApplied}
                onClick={() => void undoRename()}
              >
                <RotateCcw data-icon="inline-start" />
                {lastApplied?.mode === 'copy'
                  ? t('common.tools.batchRename.undoCopy')
                  : t('common.tools.batchRename.undo')}
              </Button>
              {lastApplied ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={applying}
                  onClick={restart}
                >
                  <RefreshCw data-icon="inline-start" />
                  {t('common.tools.batchRename.restart')}
                </Button>
              ) : null}
              {allDone ? (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  {t('common.tools.batchRename.doneSummary', { count: rows.length })}
                </span>
              ) : null}
              {copyProgress ? (
                <span className="text-[10px] text-muted-foreground">
                  {t('common.tools.batchRename.copyProgress', {
                    done: copyProgress.done,
                    total: copyProgress.total,
                  })}
                </span>
              ) : null}
              {conflicts.length > 0 ? (
                <span className="text-[10px] text-destructive">
                  {t('common.tools.batchRename.blocked')}
                </span>
              ) : null}
              {mode === 'copy' && targetIsSource ? (
                <span className="text-[10px] text-destructive">
                  {t('common.tools.batchRename.targetSameAsSource')}
                </span>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* 保存规则：用 Dialog 而不是 window.prompt */}
      <Dialog
        open={savePresetOpen}
        onOpenChange={(open) => {
          setSavePresetOpen(open);

          if (!open) {
            setPresetDraft('');
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('common.tools.batchRename.savePresetTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              autoFocus
              className="h-7 text-xs"
              placeholder={t('common.tools.batchRename.savePresetPlaceholder')}
              value={presetDraft}
              onChange={(event) => setPresetDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void confirmSavePreset();
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('common.tools.batchRename.savePresetHint', {
                pattern,
                sort: t(SORT_LABEL_KEYS[sortBy]),
              })}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="plain"
              size="sm"
              onClick={() => setSavePresetOpen(false)}
            >
              {t('common.tools.batchRename.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!presetDraft.trim()}
              onClick={() => void confirmSavePreset()}
            >
              {t('common.tools.batchRename.savePresetConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
