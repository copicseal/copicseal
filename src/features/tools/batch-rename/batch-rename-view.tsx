import { ChevronDown, FolderOpen, Loader2, RotateCcw, Tags, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { DirectoryEntry, RenamePair, RenamePreset, RenameSortBy } from '@/platform/contracts';
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

type ConflictKind = 'duplicate' | 'empty' | 'separator';

const CONFLICT_KEYS: Record<ConflictKind, MessageKey> = {
  duplicate: 'common.tools.batchRename.conflictDuplicate',
  empty: 'common.tools.batchRename.conflictEmpty',
  separator: 'common.tools.batchRename.conflictSeparator',
};

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

  /** 上一次执行成功的那批（用于撤销；只在本次会话内有效） */
  const [lastApplied, setLastApplied] = useState<{ dir: string; pairs: RenamePair[] } | null>(null);
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

  const rows: PreviewRow[] = useMemo(
    () => buildPreview(visibleEntries, { pattern, start, padding }),
    [visibleEntries, pattern, start, padding],
  );
  const conflicts = rows.filter((row) => row.conflict !== null);
  const fallbackCount = rows.filter((row) => row.usedFallbackTime).length;

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
      }
    } catch (error) {
      console.error('打开目录选择失败:', error);
      toast.error(t('common.tools.batchRename.openFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const applyRename = async () => {
    if (!folder || conflicts.length > 0) {
      return;
    }

    setApplying(true);

    try {
      const outcome = await platformRuntime.applyBatchRename(
        folder,
        rows.map((row) => ({ from: row.entry.name, to: row.target })),
      );

      if (outcome.conflicts.length > 0) {
        toast.error(t('common.tools.batchRename.blocked'), {
          description: outcome.conflicts.join('、'),
        });
      } else {
        if (outcome.renamed.length > 0) {
          setLastApplied({ dir: folder, pairs: outcome.renamed });
          toast.success(t('common.tools.batchRename.applied', { count: outcome.renamed.length }));
        }

        if (outcome.failed.length > 0) {
          toast.error(t('common.tools.batchRename.failedCount', { count: outcome.failed.length }), {
            description: outcome.failed.map((item) => `${item.name}: ${item.reason}`).join('\n'),
          });
        }
      }

      await loadEntries();
    } catch (error) {
      console.error('执行重命名失败:', error);
      toast.error(t('common.tools.batchRename.applyFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
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
      const outcome = await platformRuntime.undoBatchRename(lastApplied.dir, lastApplied.pairs);

      if (outcome.renamed.length > 0) {
        toast.success(t('common.tools.batchRename.undone', { count: outcome.renamed.length }));
      }

      if (outcome.failed.length > 0) {
        toast.error(t('common.tools.batchRename.failedCount', { count: outcome.failed.length }), {
          description: outcome.failed.map((item) => `${item.name}: ${item.reason}`).join('\n'),
        });
      }

      setLastApplied(null);
      await loadEntries();
    } catch (error) {
      console.error('撤销重命名失败:', error);
      toast.error(t('common.tools.batchRename.applyFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setApplying(false);
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
          <span className="min-w-0 truncate text-xs text-muted-foreground" title={folder}>
            {folder}
          </span>
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
                    {rows.map((row) => (
                      <div
                        key={row.entry.name}
                        className={cn(
                          'grid grid-cols-2 items-center gap-2 rounded-md px-2 py-1 text-[11px]',
                          row.conflict ? 'bg-destructive/10 text-destructive' : 'odd:bg-muted/20',
                        )}
                      >
                        <span className="truncate" title={row.entry.name}>
                          {row.entry.name}
                        </span>
                        <span className="truncate" title={row.target}>
                          {row.target}
                          {row.conflict ? (
                            <span className="ml-2 text-[10px] opacity-80">
                              {t(CONFLICT_KEYS[row.conflict as ConflictKind])}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* 执行（固定在底部，不被预览挤压） */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={applying || rows.length === 0 || conflicts.length > 0}
              onClick={() => void applyRename()}
            >
              <Tags data-icon="inline-start" />
              {t('common.tools.batchRename.apply')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={applying || !lastApplied}
              onClick={() => void undoRename()}
            >
              <RotateCcw data-icon="inline-start" />
              {t('common.tools.batchRename.undo')}
            </Button>
            {conflicts.length > 0 ? (
              <span className="text-[10px] text-destructive">
                {t('common.tools.batchRename.blocked')}
              </span>
            ) : null}
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
