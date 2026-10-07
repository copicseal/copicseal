import {
  ArrowDown,
  ArrowUp,
  Box,
  ChevronRight,
  Code2,
  Cog,
  Database,
  Download,
  Info,
  LayoutTemplate,
  type LucideIcon,
  MessageSquare,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Type,
  User,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import appLogoUrl from '@/assets/logo.svg';
import { COLLAGE_LAYOUT_GROUPS } from '@/features/collage/layouts';
import { COLLAGE_RATIO_OPTIONS } from '@/features/collage/lib';
import { useFontLibrary } from '@/features/fonts/use-font-library';
import { THIRD_PARTY_NOTICES } from '@/features/settings/third-party-notices';
import { useTemplatePresets } from '@/features/template/hooks/use-template-presets';
import { parseDefaultPresets } from '@/features/template/lib/export-preset';
import {
  MAX_TEMPLATE_PRESETS,
  TEMPLATE_PRESET_NAME_MAX,
} from '@/features/template/lib/template-preset';
import { useTemplateStore } from '@/features/template/store/use-template-store';
import {
  type AppConfig,
  type AppUpdateInfo,
  type AppVersion,
  type CacheOverview,
  type CollageConfig,
  clearAssetCaches,
  DEFAULT_COLLAGE_CONFIG,
  getInUseAssetPaths,
  type OutputPreset,
  type OutputSize,
  platformCapabilities,
} from '@/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const {
  checkForUpdate,
  cleanupCache,
  clearCache,
  getCacheOverview,
  getConfig,
  installUpdate,
  openDirectory,
  openDirectoryDialog,
  updateConfig,
} = platformRuntime;

import { CoDirectoryField } from '@/shared/components/co-directory-field';
import { CoFontField } from '@/shared/components/co-font-field';
import { CoWindowHeader } from '@/shared/components/co-window-header';
import { cn } from '@/shared/lib/utils';
import { useAppNavigation } from '@/shared/providers/navigation-provider';
import { usePageActive } from '@/shared/providers/page-activity-provider';
import { useWindowStyle } from '@/shared/providers/window-style-provider';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import { Switch } from '@/shared/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { FontLibraryTab } from './font-tab';

interface SettingsTab {
  id: string;
  label: string;
  /** 只有一级 tab 带图标；二级 tab 靠缩进表达层级，不再重复图标 */
  icon?: LucideIcon;
}

interface SettingsTabGroup {
  /** 有 label 就是分组：标题不可点，内容放在子项里 */
  label?: string;
  icon?: LucideIcon;
  items: SettingsTab[];
}

/**
 * 侧边 tab 的两级结构。
 *
 * 只对某个功能生效的设置挂在功能下面（如「边框水印 → 导出」），不和全局设置混在
 * 一起；纯分组标题不可点，避免出现"父级有内容、子级也有内容"的双份入口。
 */
const TAB_GROUPS: SettingsTabGroup[] = [
  { items: [{ id: 'general', label: '通用', icon: Cog }] },
  {
    label: '边框水印',
    icon: Box,
    items: [
      { id: 'template', label: '默认项' },
      { id: 'template-preset', label: '模板预设' },
      { id: 'template-export', label: '导出' },
    ],
  },
  {
    label: '拼图',
    icon: Palette,
    items: [
      { id: 'collage', label: '默认项' },
      { id: 'collage-export', label: '导出' },
    ],
  },
  { items: [{ id: 'fonts', label: '字体', icon: Type }] },
  { items: [{ id: 'export', label: '导出', icon: Download }] },
  { items: [{ id: 'cache', label: '缓存', icon: Database }] },
  { items: [{ id: 'about', label: '关于', icon: Info }] },
];

/** 工作区目录下的默认缓存目录；缓存没被单独改过时会跟着工作区目录走。 */
function defaultCacheDirectory(saveDirectory: string): string {
  const separator = saveDirectory.includes('\\') ? '\\' : '/';
  const normalized = saveDirectory.replace(/[\\/]+$/, '');
  return `${normalized}${separator}Cache`;
}

/**
 * 跳转锚点 id → 它所在的设置 tab。
 *
 * 地址栏 hash 只带元素 id，落到别的 tab 里时需要先把 tab 切过去，
 * 否则元素虽然存在（Radix Tabs 未激活时不渲染）却定位不到。
 */
const ANCHOR_TABS: Record<string, string> = {
  'export-directory': 'export',
};

/** 清理缓存时被保留下来的在用量提示；没有在使用的素材时不追加。 */
function keepNote(count: number): string {
  return count > 0 ? `（保留 ${count} 张正在使用的图片）` : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[index]}`;
}

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border/80 bg-card px-5 py-5 shadow-sm">
      <div className="max-w-2xl">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingField({
  id,
  label,
  description,
  children,
}: {
  /** 锚点 id：从别处（例如导出完成提示里的「更改」）跳进来时用来定位 */
  id?: string;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="border-t border-border/70 py-4 first:border-t-0 first:pt-0">
      {/* 标题与说明在上、控件在下：右侧一栏被标题挤窄后，长路径、档位清单这类
          本就偏宽的控件会先被压到换行，倒不如让它们独占整行 */}
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      <div className="mt-3 min-w-0">{children}</div>
    </div>
  );
}

function StorageSummary({ overview }: { overview: CacheOverview | null }) {
  const total = overview?.total_bytes ?? 0;
  const segments = [
    {
      key: 'images',
      label: '图片副本',
      count: overview?.image_count ?? 0,
      bytes: overview?.image_bytes ?? 0,
      color: 'bg-sky-400',
      tint: 'bg-sky-50',
      ring: 'ring-sky-200',
    },
    {
      key: 'previews',
      label: '预览缓存',
      count: overview?.preview_count ?? 0,
      bytes: overview?.preview_bytes ?? 0,
      color: 'bg-emerald-400',
      tint: 'bg-emerald-50',
      ring: 'ring-emerald-200',
    },
    {
      key: 'thumbnails',
      label: '缩略图缓存',
      count: overview?.thumbnail_count ?? 0,
      bytes: overview?.thumbnail_bytes ?? 0,
      color: 'bg-amber-400',
      tint: 'bg-amber-50',
      ring: 'ring-amber-200',
    },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
      <div className="overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/70">
        <div className="flex h-4 w-full">
          {segments.map((segment) => {
            const width =
              total > 0 ? Math.max((segment.bytes / total) * 100, segment.bytes > 0 ? 6 : 0) : 0;
            return (
              <div
                key={segment.key}
                className={cn('h-full transition-[width] duration-300', segment.color)}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn(
              'rounded-2xl px-4 py-3 ring-1 shadow-sm transition-colors xl:px-4 xl:py-3',
              'sm:px-3.5 sm:py-2.5 xl:sm:px-4 xl:sm:py-3',
              segment.tint,
              segment.ring,
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('size-2.5 rounded-full', segment.color)} />
              <p className="text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
                {segment.label}
              </p>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3 xl:mt-3 xl:block">
              <p className="text-lg font-semibold text-foreground sm:text-xl xl:text-2xl">
                {formatBytes(segment.bytes)}
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-xs xl:mt-1">
                {segment.count} 个文件
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>总占用</span>
        <span className="font-medium text-foreground">{formatBytes(total)}</span>
      </div>
    </div>
  );
}

/** 默认档位一行的摘要：尺寸 + 倍率（JPEG 才带质量）。 */
function describeOutputPreset(preset: OutputPreset): string {
  const parts = [`${preset.width} × ${preset.height}`, `倍率 ${preset.scale.toFixed(1)}x`];
  if (preset.type === 'jpeg') {
    parts.push(`质量 ${Math.round(preset.quality)}`);
  }

  return parts.join(' · ');
}

function GeneralTab({
  config,
  onSelectWorkspaceDirectory,
  onOpenWorkspaceDirectory,
}: {
  config: AppConfig;
  onSelectWorkspaceDirectory: () => Promise<void>;
  onOpenWorkspaceDirectory: () => Promise<void>;
}) {
  const { frameMode, frameModePending, setFrameMode } = useWindowStyle();

  return (
    <div className="space-y-4">
      <FieldGroup title="通用" description="控制应用的全局行为与默认保存位置。">
        <SettingField
          label="窗口边框"
          description="切换使用系统边框或无边框窗口，修改后会立即生效。"
        >
          <div className="space-y-2">
            <RadioGroup
              value={frameMode}
              className="flex flex-wrap gap-3"
              orientation="horizontal"
              onValueChange={(value) =>
                void setFrameMode(value === 'native' ? 'native' : 'frameless')
              }
            >
              {[
                { value: 'native', label: '系统边框' },
                { value: 'frameless', label: '无边框' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  htmlFor={`window-frame-${value}`}
                  className="flex items-center gap-2"
                >
                  <RadioGroupItem
                    value={value}
                    id={`window-frame-${value}`}
                    disabled={frameModePending}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs leading-5 text-muted-foreground">
              {frameModePending
                ? '正在切换窗口样式...'
                : '系统边框模式将使用操作系统自带窗口外框。'}
            </p>
          </div>
        </SettingField>

        <SettingField label="语言" description="当前界面语言来自持久化配置。">
          <Select value={config.language} disabled>
            <SelectTrigger className="w-full max-w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh-CN">简体中文</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField
          label="工作区目录"
          description="应用自己的数据目录，缓存目录默认位于它下面的 Cache 文件夹。修改后如果缓存目录仍是默认值，会一起跟随更新。"
        >
          <CoDirectoryField
            directory={config.save_directory}
            onOpen={() => void onOpenWorkspaceDirectory()}
            onSelect={() => void onSelectWorkspaceDirectory()}
          />
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function TemplateDefaultsTab({
  font,
  onFontChange,
}: {
  font: string;
  onFontChange: (font: string) => void;
}) {
  const library = useFontLibrary();

  // 只列已引入的字体；重复族名去重
  const options = useMemo(
    () =>
      [...new Set(library.entries.map((entry) => entry.family))].map((family) => ({
        family,
        postscript_name: null,
      })),
    [library.entries],
  );

  return (
    <div className="space-y-4">
      <FieldGroup
        title="边框水印默认项"
        description="新导入的图片默认使用的样式；已经单独调过的图片不受影响。"
      >
        <SettingField
          id="template-default-font"
          label="全局字体"
          description="只列出已引入的字体：在「字体」里从在线、本机或字体文件三种来源引入。"
        >
          <CoFontField
            value={font}
            onChange={onFontChange}
            fonts={options}
            loading={library.loading}
            noteOf={(family) => library.notes[family]}
          />
          {options.length === 0 ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              还没有引入字体，去「字体」里引入后这里就能选了。
            </p>
          ) : null}
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function TemplatePresetsTab({ onGoToTemplate }: { onGoToTemplate: () => void }) {
  const { presets, removePreset, renamePreset, movePreset } = useTemplatePresets();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setNameDraft(name);
  };

  const commitRename = async () => {
    if (!editingId) {
      return;
    }

    const id = editingId;
    setEditingId(null);
    await renamePreset(id, nameDraft);
  };

  return (
    <div className="space-y-4">
      <FieldGroup
        title="模板预设"
        description="只对边框水印生效。在模板页属性面板的「模板预设」里保存，这里可以改名、排序与删除。"
      >
        <SettingField
          id="template-presets"
          label="已保存的配置"
          description={`最多 ${MAX_TEMPLATE_PRESETS} 条。应用配置只改模板、参数、背景与字体，各张图片自己的导出档位保持不动。`}
        >
          {presets.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              还没有保存的配置，新导入的图片会从模板自带的默认样式开始。
            </p>
          ) : (
            <ul className="space-y-2">
              {presets.map((preset, index) => {
                const editing = editingId === preset.id;
                const expanded = expandedId === preset.id;
                const templateLabel = preset.templateName ?? '模板已失效';

                return (
                  <li key={preset.id} className="border border-border/70 bg-background/60">
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <Button
                        type="button"
                        variant="plain"
                        size="icon-sm"
                        aria-label={expanded ? `收起 ${preset.name}` : `展开 ${preset.name}`}
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : preset.id)}
                      >
                        <ChevronRight
                          className={cn('transition-transform', expanded && 'rotate-90')}
                        />
                      </Button>

                      {editing ? (
                        <Input
                          autoFocus
                          value={nameDraft}
                          maxLength={TEMPLATE_PRESET_NAME_MAX}
                          className="h-6 flex-1 text-xs"
                          aria-label="配置名称"
                          onChange={(event) => setNameDraft(event.target.value)}
                          onBlur={() => void commitRename()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              void commitRename();
                            }
                            if (event.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                        />
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                          {preset.name}
                        </span>
                      )}

                      <span
                        className={cn(
                          'shrink-0 text-[10px]',
                          preset.templateName ? 'text-muted-foreground' : 'text-destructive',
                        )}
                      >
                        {templateLabel}
                      </span>

                      <Button
                        type="button"
                        variant="plain"
                        size="icon-sm"
                        aria-label={`上移 ${preset.name}`}
                        disabled={index === 0}
                        onClick={() => void movePreset(preset.id, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="plain"
                        size="icon-sm"
                        aria-label={`下移 ${preset.name}`}
                        disabled={index === presets.length - 1}
                        onClick={() => void movePreset(preset.id, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="plain"
                        size="icon-sm"
                        aria-label={`重命名 ${preset.name}`}
                        onClick={() => startRename(preset.id, preset.name)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="plain"
                        size="icon-sm"
                        aria-label={`删除 ${preset.name}`}
                        onClick={() => {
                          void removePreset(preset.id);
                          toast.success(`已删除配置「${preset.name}」`);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    {expanded ? (
                      <pre className="border-t border-border/60 px-3 py-2 font-sans text-[10px] leading-5 whitespace-pre-wrap text-muted-foreground">
                        {preset.description || '这条配置没有摘要。'}
                      </pre>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={onGoToTemplate}>
              <LayoutTemplate data-icon="inline-start" />
              去模板页保存新配置
            </Button>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function TemplateExportDefaultsTab({
  presets,
  onRemovePreset,
  sizes,
  onChangeSizes,
  onGoToTemplate,
}: {
  presets: OutputPreset[];
  onRemovePreset: (index: number) => void;
  sizes: OutputSize[];
  onChangeSizes: (next: OutputSize[]) => void;
  onGoToTemplate: () => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup
        title="边框水印导出"
        description="只对边框水印生效。在模板页导出面板点「存为默认档位」写入，新导入的图片自动套用。"
      >
        <SettingField
          id="template-export-presets"
          label="默认档位"
          description="每档一组格式、尺寸、倍率与质量，导出时逐档输出一份文件。"
        >
          {presets.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              还没有默认档位，新图片会从 2000 × 2000 的 PNG 开始。
            </p>
          ) : (
            <ul className="space-y-2">
              {presets.map((preset, index) => {
                const presetLabel = `${preset.type.toUpperCase()} ${describeOutputPreset(preset)}`;

                return (
                  <li
                    key={preset.id ?? `${preset.type}-${preset.width}x${preset.height}`}
                    className="flex items-center gap-3 border border-border/70 bg-background/60 px-3 py-1.5"
                  >
                    <span className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {preset.type.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {describeOutputPreset(preset)}
                    </span>
                    <Button
                      type="button"
                      variant="plain"
                      size="icon-sm"
                      aria-label={`删除 ${presetLabel}`}
                      onClick={() => onRemovePreset(index)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={onGoToTemplate}>
              <LayoutTemplate data-icon="inline-start" />
              去模板页设置档位
            </Button>
          </div>
        </SettingField>
      </FieldGroup>

      <FieldGroup
        title="常用尺寸"
        description="模板页导出面板里「添加档位」右侧下拉显示的快捷尺寸，点一下即按该尺寸新建档位。"
      >
        <SettingField
          id="template-export-sizes"
          label="尺寸清单"
          description="写成一组名字与像素尺寸即可；只影响这个下拉，不改变已有档位。"
        >
          {sizes.length === 0 ? (
            <p className="text-xs leading-5 text-muted-foreground">
              还没有常用尺寸，下拉里只会显示「原始尺寸」。
            </p>
          ) : (
            <ul className="space-y-2">
              {sizes.map((size, index) => (
                <li key={size.id ?? `${size.label}-${index}`} className="flex items-center gap-2">
                  <Input
                    value={size.label}
                    aria-label={`第 ${index + 1} 个常用尺寸的名称`}
                    placeholder="名称"
                    className="h-7 min-w-0 flex-1 text-xs"
                    onChange={(event) =>
                      onChangeSizes(
                        sizes.map((item, i) =>
                          i === index ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={1}
                    value={size.width}
                    aria-label={`${size.label} 的宽度`}
                    className="h-7 w-20 text-xs"
                    onChange={(event) =>
                      onChangeSizes(
                        sizes.map((item, i) =>
                          i === index ? { ...item, width: Number(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">×</span>
                  <Input
                    type="number"
                    min={1}
                    value={size.height}
                    aria-label={`${size.label} 的高度`}
                    className="h-7 w-20 text-xs"
                    onChange={(event) =>
                      onChangeSizes(
                        sizes.map((item, i) =>
                          i === index ? { ...item, height: Number(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="plain"
                    size="icon-sm"
                    aria-label={`删除常用尺寸 ${size.label}`}
                    onClick={() => onChangeSizes(sizes.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChangeSizes([...sizes, { label: '自定义', width: 1920, height: 1080 }])
              }
            >
              <Plus data-icon="inline-start" />
              添加尺寸
            </Button>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

/** 设置里的小档位按钮：与拼图面板同款选中态。 */
function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

const COLLAGE_MODE_OPTIONS = [
  { id: 'grid' as const, label: '网格' },
  { id: 'long' as const, label: '长图' },
  { id: 'free' as const, label: '自由' },
];

const COLLAGE_LONG_ALIGN: Record<
  'vertical' | 'horizontal',
  Array<{ id: 'start' | 'center' | 'end'; label: string }>
> = {
  vertical: [
    { id: 'start', label: '左对齐' },
    { id: 'center', label: '居中' },
    { id: 'end', label: '右对齐' },
  ],
  horizontal: [
    { id: 'start', label: '上对齐' },
    { id: 'center', label: '居中' },
    { id: 'end', label: '下对齐' },
  ],
};

/** 拼图默认项：新建拼图用什么布局与画布样式。 */
function CollageDefaultsTab({
  config,
  onChange,
  onGoToCollage,
}: {
  config: CollageConfig;
  onChange: (patch: Partial<CollageConfig>) => void;
  onGoToCollage: () => void;
}) {
  const isVertical = config.long_direction !== 'horizontal';

  return (
    <div className="space-y-4">
      <FieldGroup
        title="拼图默认项"
        description="新建拼图时使用的布局与画布样式。已经摆在画布上的拼图不受影响——在拼图页对应分区点「恢复默认」即可套用这里的值。"
      >
        <SettingField
          id="collage-default-mode"
          label="默认布局模式"
          description="打开拼图页时默认停在哪个模式。"
        >
          <div className="flex flex-wrap gap-1.5">
            {COLLAGE_MODE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.id}
                active={config.layout_mode === option.id}
                onClick={() => onChange({ layout_mode: option.id })}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </div>
        </SettingField>

        <SettingField
          id="collage-default-layout"
          label="默认网格布局"
          description="网格模式下默认选中的布局；选「跟随布局库」则用布局库里的第一个。"
        >
          <Select
            value={config.layout_id || '__default__'}
            onValueChange={(value) => onChange({ layout_id: value === '__default__' ? '' : value })}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* 下拉项的 4px 内边距来自 SelectGroup（SelectContent 自身没有 p-1），
                  裸 item 的高亮会铺满整个弹层 */}
              <SelectGroup>
                <SelectItem value="__default__">跟随布局库</SelectItem>
              </SelectGroup>
              {COLLAGE_LAYOUT_GROUPS.map((group) => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{group.group}</SelectLabel>
                  {group.layouts.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      {layout.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField
          id="collage-default-ratio"
          label="画布比例"
          description="网格与自由模式的画布比例，也可以留「自定义」。"
        >
          <div className="flex flex-wrap gap-1.5">
            {COLLAGE_RATIO_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.label}
                active={config.aspect_preset === option.label}
                onClick={() => onChange({ aspect_preset: option.label })}
              >
                {option.label}
              </ChoiceChip>
            ))}
            <ChoiceChip
              active={config.aspect_preset === 'custom'}
              onClick={() => onChange({ aspect_preset: 'custom' })}
            >
              自定义
            </ChoiceChip>
          </div>
          {config.aspect_preset === 'custom' ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                className="h-8 w-20"
                inputMode="numeric"
                value={String(config.custom_ratio_width)}
                onChange={(event) =>
                  onChange({ custom_ratio_width: Number(event.target.value) || 1 })
                }
              />
              <span className="text-xs text-muted-foreground">:</span>
              <Input
                className="h-8 w-20"
                inputMode="numeric"
                value={String(config.custom_ratio_height)}
                onChange={(event) =>
                  onChange({ custom_ratio_height: Number(event.target.value) || 1 })
                }
              />
            </div>
          ) : null}
        </SettingField>

        <SettingField
          id="collage-default-canvas"
          label="画布样式"
          description="间距、边距、圆角与阴影，按设计基准像素计。"
        >
          <div className="grid max-w-2xl gap-4 md:grid-cols-2">
            {(
              [
                { key: 'gap', label: '间距', min: 0, max: 120 },
                { key: 'padding', label: '边距', min: 0, max: 160 },
                { key: 'border_radius', label: '圆角', min: 0, max: 96 },
                { key: 'shadow', label: '阴影', min: 0, max: 40 },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span className="tabular-nums">{config[item.key]}px</span>
                </div>
                <Slider
                  value={[config[item.key]]}
                  min={item.min}
                  max={item.max}
                  step={1}
                  onValueChange={([value]) => onChange({ [item.key]: value })}
                />
              </div>
            ))}
          </div>
        </SettingField>

        <SettingField
          id="collage-default-background"
          label="背景色"
          description="画布底色，透明区域会露出它。"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.background_color}
              onChange={(event) => onChange({ background_color: event.target.value })}
              className="h-9 w-12 border border-border bg-background p-1"
            />
            <Input
              className="max-w-40"
              value={config.background_color}
              onChange={(event) => onChange({ background_color: event.target.value })}
            />
          </div>
        </SettingField>

        <SettingField
          id="collage-default-long"
          label="长图默认值"
          description="切到长图模式时的拼接方向、对齐方式与横轴尺寸。"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <ChoiceChip
                active={isVertical}
                onClick={() => onChange({ long_direction: 'vertical' })}
              >
                竖向拼接
              </ChoiceChip>
              <ChoiceChip
                active={!isVertical}
                onClick={() => onChange({ long_direction: 'horizontal' })}
              >
                横向拼接
              </ChoiceChip>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLLAGE_LONG_ALIGN[isVertical ? 'vertical' : 'horizontal'].map((option) => (
                <ChoiceChip
                  key={option.id}
                  active={config.long_align === option.id}
                  onClick={() => onChange({ long_align: option.id })}
                >
                  {option.label}
                </ChoiceChip>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 w-24"
                inputMode="numeric"
                value={String(config.long_size)}
                onChange={(event) => onChange({ long_size: Number(event.target.value) || 720 })}
              />
              <span className="text-xs text-muted-foreground">
                {isVertical ? '画布宽度' : '画布高度'}（px）
              </span>
            </div>
          </div>
        </SettingField>
      </FieldGroup>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onGoToCollage}>
          到拼图页看看
        </Button>
        <p className="text-xs text-muted-foreground">
          已保存的拼图不会自动跟随，可在拼图页点「恢复默认」。
        </p>
      </div>
    </div>
  );
}

/** 拼图导出默认值：新建拼图时导出面板的初始参数。 */
function CollageExportDefaultsTab({
  config,
  onChange,
  onGoToCollage,
}: {
  config: CollageConfig;
  onChange: (patch: Partial<CollageConfig>) => void;
  onGoToCollage: () => void;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup
        title="拼图导出"
        description="新建拼图时导出面板的初始参数。已经摆在画布上的拼图不受影响——在拼图页「导出」分区点「恢复默认」即可套用这里的值。"
      >
        <SettingField
          id="collage-export-format"
          label="默认格式"
          description="JPG 体积更小，PNG 无损。"
        >
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'png' as const, label: 'PNG' },
              { id: 'jpeg' as const, label: 'JPG' },
            ].map((option) => (
              <ChoiceChip
                key={option.id}
                active={config.export_format === option.id}
                onClick={() => onChange({ export_format: option.id })}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </div>
        </SettingField>

        <SettingField id="collage-export-quality" label="默认质量" description="只有 JPG 会用到。">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'standard' as const, label: '标准' },
              { id: 'high' as const, label: '高清' },
              { id: 'ultra' as const, label: '超清' },
            ].map((option) => (
              <ChoiceChip
                key={option.id}
                active={config.export_quality === option.id}
                onClick={() => onChange({ export_quality: option.id })}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </div>
        </SettingField>

        <SettingField
          id="collage-export-scale"
          label="默认倍率"
          description="在目标尺寸之上做位图超采样，2x 就是长宽各翻一倍。"
        >
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3].map((value) => (
              <ChoiceChip
                key={value}
                active={config.export_scale === value}
                onClick={() => onChange({ export_scale: value })}
              >
                {value}x
              </ChoiceChip>
            ))}
          </div>
        </SettingField>

        <SettingField
          id="collage-export-size"
          label="默认尺寸"
          description="导出面板里的目标宽高；锁定比例时改宽度会自动推高度。"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">宽度</span>
              <Input
                aria-label="默认导出宽度"
                className="h-8 w-28"
                inputMode="numeric"
                value={String(config.export_width)}
                onChange={(event) => onChange({ export_width: Number(event.target.value) || 2048 })}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">高度</span>
              <Input
                aria-label="默认导出高度"
                className="h-8 w-28"
                inputMode="numeric"
                value={String(config.export_height)}
                onChange={(event) =>
                  onChange({ export_height: Number(event.target.value) || 2048 })
                }
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch
                checked={config.export_lock_ratio}
                onCheckedChange={(checked) => onChange({ export_lock_ratio: checked })}
              />
              <span className="text-xs text-muted-foreground">锁定画布比例</span>
            </div>
          </div>
        </SettingField>
      </FieldGroup>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onGoToCollage}>
          到拼图页看看
        </Button>
        <p className="text-xs text-muted-foreground">
          「常用尺寸」在「导出」页维护，拼图导出面板与边框水印共用同一份。
        </p>
      </div>
    </div>
  );
}

function ExportTab({
  config,
  onSelectExportDirectory,
  onOpenExportDirectory,
}: {
  config: AppConfig;
  onSelectExportDirectory: () => Promise<void>;
  onOpenExportDirectory: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <FieldGroup
        title="导出"
        description="边框水印与拼图共用这个目录，导出过程不会再弹保存对话框。"
      >
        <SettingField
          id="export-directory"
          label="文件导出目录"
          description="导出的图片直接写到这个目录，文件名由导出面板里的档位决定。"
        >
          <CoDirectoryField
            directory={config.output.default_path}
            onOpen={() => void onOpenExportDirectory()}
            onSelect={() => void onSelectExportDirectory()}
          />
        </SettingField>
      </FieldGroup>
    </div>
  );
}

function CacheTab({
  config,
  overview,
  loading,
  onSelectCacheDirectory,
  onOpenCacheDirectory,
  onToggleAutoCleanup,
  onChangeMaxAgeDays,
  onCleanupExpired,
  onClearThumbnails,
  onClearAll,
}: {
  config: AppConfig;
  overview: CacheOverview | null;
  loading: boolean;
  onSelectCacheDirectory: () => Promise<void>;
  onOpenCacheDirectory: () => Promise<void>;
  onToggleAutoCleanup: (checked: boolean) => Promise<void>;
  onChangeMaxAgeDays: (days: number) => Promise<void>;
  onCleanupExpired: () => Promise<void>;
  onClearThumbnails: () => Promise<void>;
  onClearAll: () => Promise<void>;
}) {
  const [draftMaxAgeDays, setDraftMaxAgeDays] = useState(config.cache.max_age_days);

  useEffect(() => {
    setDraftMaxAgeDays(config.cache.max_age_days);
  }, [config.cache.max_age_days]);

  return (
    <div className="space-y-4">
      <FieldGroup title="缓存" description="管理导入图片副本、缩略图与自动清理策略。">
        <SettingField
          label="缓存目录"
          description="导入后的图片副本、预览文件与缩略图都会保存在这里。"
        >
          <CoDirectoryField
            directory={config.cache.directory}
            onOpen={() => void onOpenCacheDirectory()}
            onSelect={() => void onSelectCacheDirectory()}
          />
        </SettingField>

        <SettingField
          label="缓存摘要"
          description="从当前缓存目录实时扫描图片副本、预览副本和缩略图占用。"
        >
          <StorageSummary overview={overview} />
        </SettingField>

        <SettingField label="自动清理" description="应用启动时自动清理超过保留天数的缓存文件。">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={config.cache.auto_cleanup_on_startup}
                onCheckedChange={(checked) => void onToggleAutoCleanup(checked)}
              />
              <span className="text-sm">
                {config.cache.auto_cleanup_on_startup ? '已开启自动清理' : '已关闭自动清理'}
              </span>
            </div>
            <div className="max-w-md">
              <Slider
                key={config.cache.max_age_days}
                defaultValue={[config.cache.max_age_days]}
                onValueChange={([days]) => setDraftMaxAgeDays(days)}
                onValueCommit={([days]) => void onChangeMaxAgeDays(days)}
                min={1}
                max={90}
                step={1}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                当前保留时长 {draftMaxAgeDays} 天
              </p>
            </div>
          </div>
        </SettingField>

        <SettingField
          label="清理缓存"
          description="可单独清理缩略图，或清理过期/全部缓存；正在使用的图片副本会保留。"
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={loading} onClick={() => void onCleanupExpired()}>
              <RefreshCw data-icon="inline-start" className={cn(loading && 'animate-spin')} />
              清理过期缓存
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => void onClearThumbnails()}>
              <Trash2 data-icon="inline-start" />
              清理缩略图
            </Button>
            <Button variant="outline" disabled={loading} onClick={() => void onClearAll()}>
              <Trash2 data-icon="inline-start" />
              清理全部缓存
            </Button>
          </div>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

/**
 * 关于页。
 *
 * 结构参考旧版的「关于」弹窗：品牌与版本在最上面，然后是简介、更新入口、
 * 社区链接与商标免责声明。链接一律交给系统浏览器打开（见 `openExternal`），
 * 不在应用窗口里加载外部页面。
 */
function AboutTab() {
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [info, setInfo] = useState<AppVersion | null>(null);

  useEffect(() => {
    let cancelled = false;
    void platformRuntime
      .getAppInfo()
      .then((next) => {
        if (!cancelled) {
          setInfo(next);
        }
      })
      .catch((error) => console.warn('读取应用信息失败:', error));

    return () => {
      cancelled = true;
    };
  }, []);

  const openLink = (url: string) => {
    void platformRuntime.openExternal(url).catch((error) => {
      console.error('打开链接失败:', error);
      toast.error('打开链接失败，请手动访问');
    });
  };

  const handleCheckUpdate = async () => {
    setChecking(true);
    setStatus(null);
    setUpdate(null);

    try {
      const next = await checkForUpdate();
      setUpdate(next);
      setStatus(next ? `发现新版本 ${next.version}` : '已是最新版本');
    } catch {
      setStatus('检查更新失败');
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    setInstalling(true);
    setProgress(null);

    try {
      await installUpdate({ onProgress: (next) => setProgress(next.percent) });
      // Windows 上安装阶段会由安装器结束进程并重新拉起应用，这里主要覆盖 macOS。
      setUpdate(null);
      toast.success('更新已安装，请重新启动应用');
      setStatus('更新已安装，请重新启动应用');
    } catch {
      toast.error('更新安装失败，请稍后重试');
      setStatus('更新安装失败');
    } finally {
      setInstalling(false);
      setProgress(null);
    }
  };

  const version = info ? `v${info.version}` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border border-border/80 bg-card px-5 py-4 shadow-sm">
        <img
          src={appLogoUrl}
          alt=""
          className="size-12 shrink-0 rounded-2xl border border-border/80 bg-background shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-baseline gap-2 text-sm font-semibold">
            <span>可图匠 Copicseal</span>
            {version ? (
              <span className="text-[11px] font-normal text-muted-foreground">{version}</span>
            ) : null}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            图片加边框水印工具：读取 EXIF 信息，按模板为照片加上机型、光圈、快门等相机参数，
            支持自定义字体、背景与导出档位，可批量导出。
          </p>
        </div>
      </div>

      <FieldGroup title="版本" description="检查新版本，或在发现更新时直接下载安装。">
        <SettingField label="版本更新" description="从发布渠道读取最新版本，安装后需重新启动应用。">
          {platformCapabilities.system.autoUpdate ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => void handleCheckUpdate()}
                  variant="outline"
                  disabled={checking || installing}
                >
                  <RefreshCw className={cn('size-3.5', checking && 'animate-spin')} />
                  {checking ? '检查中...' : '检查更新'}
                </Button>
                {update ? (
                  <Button onClick={() => void handleInstallUpdate()} disabled={installing}>
                    <Download className="size-3.5" />
                    {installing ? '安装中...' : `下载并安装 ${update.version}`}
                  </Button>
                ) : null}
                {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
              </div>
              {update?.notes ? (
                <p className="whitespace-pre-line text-xs text-muted-foreground">{update.notes}</p>
              ) : null}
              {installing && progress !== null ? (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">已下载 {progress}%</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">当前环境不支持应用内更新。</p>
          )}
        </SettingField>
      </FieldGroup>

      <FieldGroup title="社区" description="问题反馈与更新动态都在这些地方。">
        <SettingField label="相关链接" description="用系统默认浏览器打开。">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openLink('https://github.com/copicseal/copicseal')}
            >
              <Code2 data-icon="inline-start" />
              开源仓库
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openLink('https://github.com/copicseal/copicseal/issues')}
            >
              <MessageSquare data-icon="inline-start" />
              问题反馈
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openLink('https://github.com/kohaiy')}
            >
              <User data-icon="inline-start" />
              作者主页
            </Button>
          </div>
        </SettingField>

        <div className="border border-border/80 bg-muted/40 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
          ⚠️ 本工具展示的相机 / 手机品牌商标版权归各自公司所有，仅用于展示 EXIF
          信息，不构成商业关联或侵权。若您认为相关内容侵犯了您的合法权益，请通过上方「问题反馈」联系我们删除。
        </div>
      </FieldGroup>

      <FieldGroup title="开源许可" description="本软件使用了下列开源项目，感谢它们的作者与社区。">
        <SettingField
          id="about-third-party"
          label="第三方依赖"
          description="只列随应用一起分发的运行时依赖；版本与完整依赖树见仓库的 Cargo.lock 与 pnpm-lock.yaml。"
        >
          <ScrollArea viewportClassName="max-h-56 [&>div]:!block">
            <div className="space-y-3 pr-1">
              {THIRD_PARTY_NOTICES.map((group) => (
                <div key={group.title}>
                  <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                    {group.title}
                  </p>
                  <ul className="grid gap-x-4 gap-y-0.5 md:grid-cols-2">
                    {group.items.map((item) => (
                      <li
                        key={`${group.title}-${item.name}`}
                        className="flex items-baseline justify-between gap-2 text-[11px]"
                      >
                        <span className="min-w-0 truncate text-foreground">{item.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {item.license}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SettingField>
      </FieldGroup>
    </div>
  );
}

export function SettingsPage() {
  const pageActive = usePageActive();
  const navigate = useAppNavigation();
  const setDefaultPresets = useTemplateStore((state) => state.setDefaultPresets);
  const setDefaultFont = useTemplateStore((state) => state.setDefaultFont);
  const [tab, setTab] = useState('general');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [overview, setOverview] = useState<CacheOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheActionPending, setCacheActionPending] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const nextConfig = await getConfig();
      setConfig(nextConfig);
      const nextOverview = await getCacheOverview(nextConfig.cache.directory);
      setOverview(nextOverview);
    } catch (error) {
      console.error('Load settings failed:', error);
      toast.error('读取设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  /**
   * 切回设置页时静默重读一次配置。
   *
   * 「存为默认档位」这类写入发生在模板页，本页 keep-alive 挂着不会重挂载；
   * 这里只回填配置，不动 loading，避免每次切页都闪一下「正在加载设置」。
   */
  useEffect(() => {
    if (!pageActive) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const nextConfig = await getConfig();
        if (!cancelled) {
          setConfig(nextConfig);
        }
      } catch (error) {
        console.error('Refresh settings failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageActive]);

  const saveConfig = useCallback(async (nextConfig: AppConfig) => {
    setConfig(nextConfig);
    await updateConfig(nextConfig);
    const nextOverview = await getCacheOverview(nextConfig.cache.directory);
    setOverview(nextOverview);
  }, []);

  /**
   * 最近一次写入的配置。
   *
   * 连点档位、拖滑杆时回调闭包里的 `config` 还是旧值，逐次保存会互相覆盖
   * （后一次把前一次的改动写回旧值）。所有「改一块」的操作都以这份最新值为基准。
   */
  const configRef = useRef<AppConfig | null>(null);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const patchConfig = useCallback(
    async (patch: (current: AppConfig) => AppConfig) => {
      const current = configRef.current;
      if (!current) {
        return;
      }

      const next = patch(current);
      // 先更新 ref：连续调用时下一次就能看到这一次的结果
      configRef.current = next;
      await saveConfig(next);
    },
    [saveConfig],
  );

  const withCacheAction = useCallback(async (runner: () => Promise<void>) => {
    setCacheActionPending(true);
    try {
      await runner();
    } catch (error) {
      console.error('Cache settings action failed:', error);
      toast.error('缓存设置操作失败');
    } finally {
      setCacheActionPending(false);
    }
  }, []);

  // 从别处跳进来时（例如导出完成提示里的「更改」）滚到目标设置项并闪一下，
  // 让用户一眼看到该改哪里。地址栏 hash 由导航写入，读完即清掉。
  useEffect(() => {
    if (!pageActive || loading) {
      return;
    }

    const targetId = window.location.hash.replace(/^#/, '');
    if (!targetId) {
      return;
    }

    // 目标可能在别的 tab 里：Radix 不会渲染未激活的 TabsContent，
    // 不先切过去就找不到元素。切完 tab 后这次 effect 会重跑。
    const targetTab = ANCHOR_TABS[targetId];
    if (targetTab && targetTab !== tab) {
      setTab(targetTab);
      return;
    }

    const element = document.getElementById(targetId);
    if (!element) {
      // 目标尚未渲染时不消费 hash，等内容就绪后这次 effect 会重跑
      return;
    }

    window.history.replaceState({}, '', window.location.pathname);
    element.scrollIntoView({ block: 'center' });
    element.classList.add('co-anchor-flash');
    const timer = window.setTimeout(() => element.classList.remove('co-anchor-flash'), 1600);

    return () => window.clearTimeout(timer);
  }, [pageActive, loading, tab]);

  const handleSelectWorkspaceDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await openDirectoryDialog();
    if (!selected || Array.isArray(selected)) {
      return;
    }

    // 缓存目录默认跟着工作区目录走，但只在这个值还是默认值时才跟随
    const followsDefaultCache =
      config.cache.directory === defaultCacheDirectory(config.save_directory);

    await withCacheAction(async () => {
      await saveConfig({
        ...config,
        save_directory: selected,
        cache: followsDefaultCache
          ? {
              ...config.cache,
              directory: defaultCacheDirectory(selected),
            }
          : config.cache,
      });
      toast.success('工作区目录已更新');
    });
  }, [config, saveConfig, withCacheAction]);

  const handleOpenWorkspaceDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    try {
      await openDirectory(config.save_directory);
    } catch (error) {
      console.error('Open workspace directory failed:', error);
      toast.error('打开工作区目录失败');
    }
  }, [config]);

  const handleSelectExportDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await openDirectoryDialog();
    if (!selected || Array.isArray(selected)) {
      return;
    }

    try {
      await saveConfig({
        ...config,
        output: { ...config.output, default_path: selected },
      });
      toast.success('文件导出目录已更新');
    } catch (error) {
      console.error('Update export directory failed:', error);
      toast.error('更新文件导出目录失败');
    }
  }, [config, saveConfig]);

  /**
   * 改写常用尺寸清单。
   *
   * 与默认档位一样只动设置，不影响任何照片已有的档位；导出面板在打开下拉时
   * 会重新读一次，所以这里保存完立刻生效。
   */
  /** 拼图默认值：配置里读不到时用出厂默认兜底（Web 端） */
  const collageConfig = useMemo<CollageConfig>(
    () => ({ ...DEFAULT_COLLAGE_CONFIG, ...(config?.collage ?? {}) }),
    [config?.collage],
  );

  const handleChangeCollage = useCallback(
    (patch: Partial<CollageConfig>) => {
      void patchConfig((current) => ({
        ...current,
        collage: { ...DEFAULT_COLLAGE_CONFIG, ...current.collage, ...patch },
      }));
    },
    [patchConfig],
  );

  const handleChangeExportSizes = useCallback(
    async (sizes: OutputSize[]) => {
      if (!config) {
        return;
      }

      try {
        await saveConfig({ ...config, output: { ...config.output, sizes } });
      } catch (error) {
        console.error('Update export sizes failed:', error);
        toast.error('更新常用尺寸失败');
      }
    },
    [config, saveConfig],
  );

  /**
   * 删掉一个默认档位。
   *
   * 只改设置里的默认清单，不去动任何照片已有的档位；删到空就等于「没存过默认档位」，
   * 新图片回到内置的单档。
   */
  const handleRemoveDefaultPreset = useCallback(
    async (index: number) => {
      if (!config) {
        return;
      }

      const presets = config.output.presets.filter((_, i) => i !== index);

      try {
        await saveConfig({ ...config, output: { ...config.output, presets } });
        // 同一会话里新导入的图片立刻用上剩下的档位，不必重启
        setDefaultPresets(parseDefaultPresets(presets));
        toast.success('已删除默认档位');
      } catch (error) {
        console.error('Remove default export preset failed:', error);
        toast.error('删除默认档位失败');
      }
    },
    [config, saveConfig, setDefaultPresets],
  );

  /**
   * 改全局字体。
   *
   * 不走 `saveConfig`：那个还会顺带重扫一次缓存目录，换个字体没必要扫盘。
   * 与模板页属性面板的区别只有一处——这里没有「当前照片」的语境，
   * 因此不去解开设了预设字体的那张图（预设的字体是故意钉住的）。
   */
  const handleGlobalFontChange = useCallback(
    async (font: string) => {
      if (!config) {
        return;
      }

      const nextConfig = { ...config, fonts: { ...config.fonts, default_font: font } };
      // 本页状态先跟上，下拉立刻显示新值
      setConfig(nextConfig);
      // 同一会话里未调整过的图片与新导入的图片立刻用上新字体，不必重启
      setDefaultFont(font);

      try {
        await updateConfig(nextConfig);
      } catch (error) {
        console.error('Save default font failed:', error);
        toast.error('保存默认字体失败');
      }
    },
    [config, setDefaultFont],
  );

  const handleOpenExportDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    try {
      await openDirectory(config.output.default_path);
    } catch (error) {
      console.error('Open export directory failed:', error);
      toast.error('打开文件导出目录失败');
    }
  }, [config]);

  const handleSelectCacheDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    const selected = await openDirectoryDialog();
    if (!selected || Array.isArray(selected)) {
      return;
    }

    await withCacheAction(async () => {
      await saveConfig({
        ...config,
        cache: {
          ...config.cache,
          directory: selected,
        },
      });
      clearAssetCaches();
      toast.success('缓存目录已更新');
    });
  }, [config, saveConfig, withCacheAction]);

  const handleOpenCacheDirectory = useCallback(async () => {
    if (!config) {
      return;
    }

    try {
      await openDirectory(config.cache.directory);
    } catch (error) {
      console.error('Open cache directory failed:', error);
      toast.error('打开缓存目录失败');
    }
  }, [config]);

  const handleToggleAutoCleanup = useCallback(
    async (checked: boolean) => {
      if (!config) {
        return;
      }

      await withCacheAction(async () => {
        await saveConfig({
          ...config,
          cache: {
            ...config.cache,
            auto_cleanup_on_startup: checked,
          },
        });
      });
    },
    [config, saveConfig, withCacheAction],
  );

  const handleChangeMaxAgeDays = useCallback(
    async (days: number) => {
      if (!config || days === config.cache.max_age_days) {
        return;
      }

      await withCacheAction(async () => {
        await saveConfig({
          ...config,
          cache: {
            ...config.cache,
            max_age_days: days,
          },
        });
      });
    },
    [config, saveConfig, withCacheAction],
  );

  const handleCleanupExpired = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const inUse = getInUseAssetPaths();
      const result = await cleanupCache(config.cache.directory, config.cache.max_age_days, inUse);
      const nextOverview = await getCacheOverview(config.cache.directory);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`已清理 ${result.removed_files} 个过期缓存文件${keepNote(inUse.length)}`);
    });
  }, [config, withCacheAction]);

  const handleClearThumbnails = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const inUse = getInUseAssetPaths();
      const nextOverview = await clearCache(config.cache.directory, 'thumbnails', inUse);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`缩略图缓存已清理${keepNote(inUse.length)}`);
    });
  }, [config, withCacheAction]);

  const handleClearAll = useCallback(async () => {
    if (!config) {
      return;
    }

    await withCacheAction(async () => {
      const inUse = getInUseAssetPaths();
      const nextOverview = await clearCache(config.cache.directory, 'all', inUse);
      setOverview(nextOverview);
      clearAssetCaches();
      toast.success(`全部缓存已清理${keepNote(inUse.length)}`);
    });
  }, [config, withCacheAction]);

  if (loading || !config) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <CoWindowHeader icon={Settings2} title="设置" description="正在读取配置与缓存状态。" />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          正在加载设置...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CoWindowHeader
        icon={Settings2}
        title="设置"
        description="管理软件行为、缓存目录、缩略图生成与自动清理策略。"
      />

      {/* 受控 tab：从提示跳进来时（hash 锚点）需要先切到目标所在的 tab */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        orientation="vertical"
        className="min-h-0 flex-1 p-4"
      >
        <TabsList
          variant="line"
          className="w-56 shrink-0 gap-0 border border-border/80 bg-card p-3"
        >
          {TAB_GROUPS.map((group, index) => {
            const GroupIcon = group.icon;

            return (
              <Fragment key={group.label ?? group.items[0].id}>
                {index > 0 ? (
                  // w-full 不能省：TabsList 是 items-center 的 flex 列，没有宽度的
                  // 元素会被压成 0 宽并居中（分隔线会直接看不见）
                  <span aria-hidden="true" className="my-1.5 h-px w-full bg-border/70" />
                ) : null}
                {group.label ? (
                  // 同理，分组标题也必须铺满，否则会被 TabsList 居中
                  <span
                    aria-hidden="true"
                    className="flex w-full items-center gap-2 px-1.5 pt-1 pb-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {GroupIcon ? <GroupIcon className="size-3.5" /> : null}
                    {group.label}
                  </span>
                ) : null}
                {group.items.map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      // 子项缩进一级，父级图标已表达归属，这里不再重复
                      className={cn(group.label && 'pl-6')}
                      // 分组标题对读屏隐藏，靠可访问名把归属补回去
                      aria-label={group.label ? `${group.label} ${tab.label}` : undefined}
                    >
                      {Icon ? <Icon className="size-3.5" /> : null}
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </Fragment>
            );
          })}
        </TabsList>

        {/*
          「字体」页自成一块：它内部有会滚动的列表，需要确定高度。若和别的 tab 一样放进
          下面的滚动区，就会出现「页面滚动 + 列表滚动」两条滚动条，所以它在滚动区之外，
          且滚动区在该 tab 下隐藏。
        */}
        <TabsContent
          value="fonts"
          className={cn(
            'mt-0 min-h-0 min-w-0 flex-1',
            tab === 'fonts' ? 'flex flex-col' : 'hidden',
          )}
        >
          <div className="mx-auto flex h-full w-full max-w-5xl min-w-0 flex-col overflow-hidden px-4">
            <FontLibraryTab />
          </div>
        </TabsContent>

        {/*
          viewportClassName 覆盖 Radix 给内容包的那层 `display: table`：table 盒会按内容
         的 max-content 撑开，`w-full` 与 `truncate` 全部失效，窗口一窄内容就横着溢出。
          改成 block 后内容才会真正受视口宽度约束。
        */}
        <ScrollArea
          className={cn('min-h-0 min-w-0 flex-1', tab === 'fonts' && 'hidden')}
          viewportClassName="[&>div]:!block"
        >
          <div className="mx-auto w-full max-w-5xl min-w-0 pl-4 pr-4">
            <TabsContent value="general" className="mt-0">
              <GeneralTab
                config={config}
                onSelectWorkspaceDirectory={handleSelectWorkspaceDirectory}
                onOpenWorkspaceDirectory={handleOpenWorkspaceDirectory}
              />
            </TabsContent>
            <TabsContent value="template" className="mt-0">
              <TemplateDefaultsTab
                font={config.fonts.default_font}
                onFontChange={(next) => void handleGlobalFontChange(next)}
              />
            </TabsContent>
            <TabsContent value="template-preset" className="mt-0">
              <TemplatePresetsTab onGoToTemplate={() => navigate('/template')} />
            </TabsContent>
            <TabsContent value="template-export" className="mt-0">
              <TemplateExportDefaultsTab
                presets={config.output.presets}
                onRemovePreset={(index) => void handleRemoveDefaultPreset(index)}
                sizes={config.output.sizes ?? []}
                onChangeSizes={(sizes) => void handleChangeExportSizes(sizes)}
                onGoToTemplate={() => navigate('/template')}
              />
            </TabsContent>
            <TabsContent value="collage" className="mt-0">
              <CollageDefaultsTab
                config={collageConfig}
                onChange={handleChangeCollage}
                onGoToCollage={() => navigate('/collage')}
              />
            </TabsContent>
            <TabsContent value="collage-export" className="mt-0">
              <CollageExportDefaultsTab
                config={collageConfig}
                onChange={handleChangeCollage}
                onGoToCollage={() => navigate('/collage')}
              />
            </TabsContent>
            <TabsContent value="export" className="mt-0">
              <ExportTab
                config={config}
                onSelectExportDirectory={handleSelectExportDirectory}
                onOpenExportDirectory={handleOpenExportDirectory}
              />
            </TabsContent>
            <TabsContent value="cache" className="mt-0">
              <CacheTab
                config={config}
                overview={overview}
                loading={cacheActionPending}
                onSelectCacheDirectory={handleSelectCacheDirectory}
                onOpenCacheDirectory={handleOpenCacheDirectory}
                onToggleAutoCleanup={handleToggleAutoCleanup}
                onChangeMaxAgeDays={handleChangeMaxAgeDays}
                onCleanupExpired={handleCleanupExpired}
                onClearThumbnails={handleClearThumbnails}
                onClearAll={handleClearAll}
              />
            </TabsContent>
            <TabsContent value="about" className="mt-0">
              <AboutTab />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
