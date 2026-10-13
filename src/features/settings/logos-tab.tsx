import { ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { customLogoUrl } from '@/features/template/lib/logo-settings';
import { listBuiltInBrands } from '@/features/template/templates/brand';
import type { CustomLogo } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';

/** 关键字输入的展示形式：逗号（中英文）分隔。 */
function parseKeywords(input: string): string[] {
  return input
    .split(/[,，]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function keywordsToInput(keywords: readonly string[]): string {
  return keywords.join(', ');
}

interface LogoEditorDialogProps {
  /** 正在编辑的条目；新增时为 null */
  logo: CustomLogo | null;
  workspace: string;
  /** 已存在的条目，用于判断「是否覆盖内置品牌」 */
  existing: readonly CustomLogo[];
  onSave: (logo: CustomLogo) => void;
  onClose: () => void;
}

/**
 * 添加 / 编辑自定义 Logo 的弹框。
 *
 * 文件在「选择文件」时就落进工作区 `Logos/`（Rust 侧会校验格式与大小），
 * 取消时把本次新落的文件删掉，避免留下孤儿文件。
 */
function LogoEditorDialog({ logo, workspace, existing, onSave, onClose }: LogoEditorDialogProps) {
  const t = useTranslate();
  const [fileName, setFileName] = useState(logo?.file_name ?? '');
  const [size, setSize] = useState(logo?.size ?? 0);
  const [name, setName] = useState(logo?.name ?? '');
  const [keywordInput, setKeywordInput] = useState(keywordsToInput(logo?.keywords ?? []));
  const [catchAll, setCatchAll] = useState(logo?.catch_all ?? false);
  /** 本次会话新落盘、但还没保存进配置的文件（取消时要清理） */
  const [uploaded, setUploaded] = useState<string[]>([]);

  const previewUrl = fileName ? customLogoUrl(workspace, fileName) : '';
  const keywords = parseKeywords(keywordInput);
  const builtInKeys = listBuiltInBrands().map((brand) => brand.key);
  const overridesBuiltIn = keywords.find((keyword) => builtInKeys.includes(keyword.toUpperCase()));
  const canSave = Boolean(fileName) && (keywords.length > 0 || catchAll);

  const cleanupFiles = (files: readonly string[]) => {
    for (const file of files) {
      void platformRuntime.removeLogoFile(workspace, file).catch((error) => {
        console.warn('清理未保存的 Logo 文件失败:', error);
      });
    }
  };

  const handlePickFile = async () => {
    try {
      const picked = await platformRuntime.openLogoDialog();
      const path = Array.isArray(picked) ? picked[0] : picked;

      if (!path) {
        return;
      }

      const imported = await platformRuntime.importLogoFile(workspace, path);

      // 同一次编辑里只保留最后一次选的图：旧的那份直接删掉
      cleanupFiles(uploaded);
      setUploaded([imported.file_name]);
      setFileName(imported.file_name);
      setSize(imported.size);
      if (!name.trim()) {
        setName(imported.file_name.replace(/\.[^.]+$/, ''));
      }
    } catch (error) {
      console.error('导入 Logo 失败:', error);
      toast.error(t('settings.logos.importFailed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleClose = () => {
    cleanupFiles(uploaded);
    onClose();
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    // 换了图：旧文件若没有别的条目在用，顺手删掉
    const previous = logo?.file_name;
    if (
      previous &&
      previous !== fileName &&
      !existing.some((item) => item.id !== logo?.id && item.file_name === previous)
    ) {
      cleanupFiles([previous]);
    }

    onSave({
      id: logo?.id ?? crypto.randomUUID(),
      name: name.trim() || fileName.replace(/\.[^.]+$/, ''),
      keywords,
      catch_all: catchAll,
      file_name: fileName,
      size,
      added_at: logo?.added_at ?? Math.floor(Date.now() / 1000),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {logo ? t('settings.logos.editTitle') : t('settings.logos.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="co-logo-checker flex size-16 shrink-0 items-center justify-center rounded-md border border-border/70 p-1">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-14 w-full object-contain" />
              ) : (
                <ImagePlus aria-hidden="true" className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePickFile()}
              >
                <ImagePlus data-icon="inline-start" />
                {fileName ? t('settings.logos.changeFile') : t('settings.logos.chooseFile')}
              </Button>
              <p className="truncate text-[10px] text-muted-foreground">
                {fileName || t('settings.logos.fileHint')}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">{t('settings.logos.name')}</span>
            <Input
              autoFocus
              className="h-7 text-xs"
              placeholder={t('settings.logos.namePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">
              {t('settings.logos.keywords')}
            </span>
            <Input
              className="h-7 text-xs"
              placeholder={t('settings.logos.keywordsPlaceholder')}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
            <p className="text-[10px] leading-4 text-muted-foreground">
              {t('settings.logos.keywordsHint')}
            </p>
            {overridesBuiltIn ? (
              <p className="text-[10px] text-primary">
                {t('settings.logos.overrideNotice', { brand: overridesBuiltIn })}
              </p>
            ) : null}
          </div>

          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Switch
              checked={catchAll}
              onCheckedChange={setCatchAll}
              aria-label={t('settings.logos.catchAll')}
            />
            {t('settings.logos.catchAll')}
          </span>
          <p className="text-[10px] leading-4 text-muted-foreground">
            {t('settings.logos.catchAllHint')}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            {t('settings.logos.cancel')}
          </Button>
          <Button type="button" size="sm" disabled={!canSave} onClick={handleSave}>
            {t('settings.logos.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LogosTabProps {
  logos: CustomLogo[];
  /** 工作区目录：自定义 Logo 落在 `<工作区>/Logos/` */
  workspace: string;
  onChange: (logos: CustomLogo[]) => void;
}

/**
 * 设置 → Logo：内置品牌只读展示 + 自定义 Logo 管理。
 *
 * 内置那部分来自打包资产（`src/assets/logos/`），不允许改；
 * 想替换同品牌的展示就添加一条自定义条目——渲染时**自定义优先**。
 */
export function LogosTab({ logos, workspace, onChange }: LogosTabProps) {
  const t = useTranslate();
  const [view, setView] = useState<'custom' | 'builtin'>('custom');
  const [editing, setEditing] = useState<CustomLogo | null>(null);
  const [creating, setCreating] = useState(false);
  const builtIn = listBuiltInBrands();
  const supported = Boolean(workspace);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
  };

  const closeDialog = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleSave = (next: CustomLogo) => {
    const exists = logos.some((item) => item.id === next.id);

    onChange(exists ? logos.map((item) => (item.id === next.id ? next : item)) : [...logos, next]);
    toast.success(t('settings.logos.saved', { name: next.name }));
    closeDialog();
  };

  const handlePromote = (id: string) => {
    const target = logos.find((item) => item.id === id);

    if (!target) {
      return;
    }

    onChange([target, ...logos.filter((item) => item.id !== id)]);
  };

  const handleRemove = (logo: CustomLogo) => {
    toast(t('settings.logos.removeConfirm', { name: logo.name }), {
      description: t('settings.logos.removeConfirmDescription'),
      action: {
        label: t('settings.logos.remove'),
        onClick: () => {
          onChange(logos.filter((item) => item.id !== logo.id));

          // 同一文件可能被多条条目引用，还有人在用就留着
          const stillUsed = logos.some(
            (item) => item.id !== logo.id && item.file_name === logo.file_name,
          );
          if (!stillUsed) {
            void platformRuntime.removeLogoFile(workspace, logo.file_name).catch((error) => {
              console.warn('删除 Logo 文件失败:', error);
            });
          }

          toast.success(t('settings.logos.removed', { name: logo.name }));
        },
      },
      cancel: t('settings.logos.cancel'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-card px-5 py-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">{t('settings.logos.title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.logos.description')}</p>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          {t('settings.logos.hint')}
        </p>
      </div>

      {/* 分段控件自己画：不依赖 Tabs 的激活态样式，与字体页保持同一套观感 */}
      <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg bg-muted p-[3px]">
        <button
          type="button"
          onClick={() => setView('custom')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
            view === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground',
          )}
        >
          {t('settings.logos.tabs.custom', { count: logos.length })}
        </button>
        <button
          type="button"
          onClick={() => setView('builtin')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
            view === 'builtin'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground',
          )}
        >
          {t('settings.logos.tabs.builtIn', { count: builtIn.length })}
        </button>
      </div>

      {view === 'builtin' ? (
        <section className="space-y-2">
          <p className="px-1 text-[11px] leading-5 text-muted-foreground">
            {t('settings.logos.builtInNote')}
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {builtIn.map((brand) => (
              <li
                key={brand.key}
                className="co-logo-checker flex h-16 items-center justify-center rounded-md border border-border/60 p-2"
                title={brand.label}
              >
                <img src={brand.url} alt={brand.label} className="h-12 w-full object-contain" />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="space-y-2">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!supported}
              onClick={openCreate}
            >
              <Plus data-icon="inline-start" />
              {t('settings.logos.add')}
            </Button>
          </div>

          {!supported ? (
            <p className="px-1 text-xs text-muted-foreground">
              {t('settings.logos.webUnsupported')}
            </p>
          ) : logos.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">{t('settings.logos.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {logos.map((logo, index) => (
                <li
                  key={logo.id}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2"
                >
                  <div className="co-logo-checker flex size-12 shrink-0 items-center justify-center rounded-md border border-border/60 p-1">
                    <img
                      src={customLogoUrl(workspace, logo.file_name)}
                      alt=""
                      className="h-10 w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {logo.name}
                      </span>
                      {index === 0 ? (
                        <span className="shrink-0 border border-primary/40 bg-primary/10 px-1 text-[10px] text-primary">
                          {t('settings.logos.priority')}
                        </span>
                      ) : null}
                      {logo.catch_all ? (
                        <span className="shrink-0 border border-border bg-muted/60 px-1 text-[10px] text-foreground">
                          {t('settings.logos.catchAllBadge')}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {logo.keywords.length > 0
                        ? logo.keywords.join(' / ')
                        : t('settings.logos.keywordsEmpty')}
                    </p>
                  </div>
                  <Button type="button" variant="plain" size="sm" onClick={() => setEditing(logo)}>
                    <Pencil className="size-3.5" />
                    {t('settings.logos.edit')}
                  </Button>
                  {index > 0 ? (
                    <Button
                      type="button"
                      variant="plain"
                      size="icon-sm"
                      aria-label={t('settings.logos.promote')}
                      onClick={() => handlePromote(logo.id)}
                    >
                      <ArrowUp />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="plain"
                    size="icon-sm"
                    aria-label={t('settings.logos.remove')}
                    onClick={() => handleRemove(logo)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editing || creating ? (
        <LogoEditorDialog
          key={editing?.id ?? 'new'}
          logo={editing}
          workspace={workspace}
          existing={logos}
          onSave={handleSave}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}
