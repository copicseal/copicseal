import { Check, Download, FolderInput, Pencil, Search, Type, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GOOGLE_FONTS } from '@/features/fonts/google-fonts';
import {
  type FontLibraryEntry,
  fontsDirectory,
  useFontLibrary,
} from '@/features/fonts/use-font-library';
import { isNativeWindowAvailable } from '@/platform';
import { useSystemFonts } from '@/shared/hooks/use-system-fonts';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';

/** 默认预览文案：拉丁 + 数字 + 中文，基本能看出字体的字形与字宽。 */
const PREVIEW_TEXT = 'Sony ILCE-7M4 122mm f/5.0 ISO 320 中文示例 Aa';

/** 每页渲染多少个族：近两千个族一次铺出来会卡，分页 + 分类收窄。 */
const PAGE_SIZE = 48;

/** 分类筛选项；空值表示不过滤。 */
const CATEGORY_FILTERS = ['无衬线', '衬线', '展示', '手写', '等宽'] as const;

/** 一个 Google CSS 请求里最多拼几个族（接口支持多 family，拼太多 URL 会过长）。 */
const PREVIEW_CHUNK = 15;

function formatSize(bytes?: number): string {
  if (!bytes) {
    return '';
  }
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/** 拉取某个 Google 字体的 CSS（里面是它的文件地址）。 */
async function fetchGoogleFontCss(family: string): Promise<string> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}&display=swap`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

/** 从 CSS 里取出所有字体文件地址；条数即子集数。 */
function parseFontFaceUrls(css: string): string[] {
  return [...css.matchAll(/url\((https:[^)]+)\)/g)].map((match) => match[1] as string);
}

/** 字体预览行：标题 + 用该字体渲染的样例，右侧是操作。 */
function FontRow({
  title,
  family,
  note,
  meta,
  text = PREVIEW_TEXT,
  children,
}: {
  title: string;
  family: string;
  /** 用户备注，显示在字体名后面，方便按用途挑 */
  note?: string;
  meta?: string;
  /** 预览文案，可由用户改（比如换成自己的文案/水印文字） */
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      data-font-family={family}
      className="flex items-center gap-3 border border-border/70 bg-background/60 px-3 py-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-xs font-medium text-foreground">{title}</span>
          {note ? (
            <span className="shrink-0 border border-border bg-muted/60 px-1 text-[10px] text-foreground">
              {note}
            </span>
          ) : null}
          {meta ? <span className="shrink-0 text-[10px] text-muted-foreground">{meta}</span> : null}
        </div>
        <p
          className="mt-1 truncate text-sm text-foreground/90"
          style={{ fontFamily: `"${family}"` }}
        >
          {text}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

/** Google Fonts：内置常用字体清单，预览按需拉 CSS，点「引入」才下载到工作区。 */
/** 把数组切成若干块。 */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * 批量注入 Google 的字体 CSS。
 *
 * 用 `<link>` 而不是逐条 `fetch` 再解析：一个请求能带多个 `family=`，而且浏览器只在
 * 真正用到某个族时才下载字体文件——预览因此能覆盖「当前看得见的行」，没看到的行
 * 不产生流量。
 */
function useGooglePreviewLinks(families: readonly string[]): void {
  const injected = useRef(new Map<string, HTMLLinkElement>());

  useEffect(() => {
    for (const group of chunk(families, PREVIEW_CHUNK)) {
      const params = group
        .map((family) => `family=${family.trim().replace(/\s+/g, '+')}`)
        .join('&');
      const href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
      if (injected.current.has(href)) {
        continue;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.copicsealFontPreview = 'true';
      link.href = href;
      // 失败时留一条告警：多半是 CSP 拦了外部样式表，或该来源不可达
      link.onerror = () => {
        console.warn('[fonts] Google 字体样式加载失败:', href);
      };
      document.head.appendChild(link);
      injected.current.set(href, link);
    }
  }, [families]);

  // 卸载时统一摘掉（这里没有 React 树，只能自己管）
  useEffect(
    () => () => {
      for (const link of injected.current.values()) {
        link.remove();
      }
      injected.current.clear();
    },
    [],
  );
}

/**
 * Google Fonts：内置清单（见 `features/fonts/google-fonts.ts`），点「引入」才下载到工作区。
 *
 * 预览按**可见行**加载：列表滚到哪，就把那几行对应的族拼进一次 CSS 请求；看不到的行
 * 不加载，也就不会出现「后面几行全是一个样」的情况。
 */
function GoogleSource({
  library,
  previewText,
}: {
  library: ReturnType<typeof useFontLibrary>;
  previewText: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [visible, setVisible] = useState<string[]>([]);
  const listRef = useRef<HTMLUListElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(new Set<string>());

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return GOOGLE_FONTS.filter(
      (entry) =>
        (!keyword || entry.family.toLowerCase().includes(keyword)) &&
        (!category || entry.category === category),
    );
  }, [query, category]);

  const introduced = useMemo(
    () => new Set(library.entries.map((entry) => entry.family)),
    [library.entries],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // 换了关键词/分类后页码可能越界，这里夹一次，渲染时不会拿到空页
  const currentPage = Math.min(page, pageCount - 1);
  const rendered = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage],
  );

  useGooglePreviewLinks(visible);

  // 换页 / 换筛选后把列表滚回顶部，否则会停在上一页的滚动位置
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖就是「列表内容变了」这件事，值本身不参与计算
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, [currentPage, category, query]);

  // 行进入视野（含提前 160px）就登记它的族名，攒够一批再注入 CSS
  // biome-ignore lint/correctness/useExhaustiveDependencies: 行是通过 DOM 查出来的，换页/换筛选后必须重新观察（依赖即渲染出来的那批行）
  useEffect(() => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-font-family]');
    if (!rows || rows.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let added = false;
        for (const entry of entries) {
          const family = (entry.target as HTMLElement).dataset.fontFamily;
          if (entry.isIntersecting && family && !visibleRef.current.has(family)) {
            visibleRef.current.add(family);
            added = true;
          }
        }
        if (added) {
          setVisible([...visibleRef.current]);
        }
      },
      { rootMargin: '160px' },
    );

    for (const row of rows) {
      observer.observe(row);
    }

    return () => observer.disconnect();
  }, [rendered]);

  const handleImport = async (family: string) => {
    setBusy(family);
    try {
      const css = await fetchGoogleFontCss(family);
      const fileUrls = parseFontFaceUrls(css);
      if (fileUrls.length === 0) {
        throw new Error('没有解析到字体文件');
      }
      if (fileUrls.length > 4) {
        // CJK 字体在 Google Fonts 上会被拆成上百个 unicode-range 子集
        throw new Error('该字体被拆成多个子集，请改用「自定义导入」');
      }

      // 按真实地址取扩展名：UA 不同时 Google 会给 woff2 或 ttf，后缀写错会让
      // asset 协议按错误 MIME 返回，浏览器可能拒绝加载
      const fileUrl = fileUrls[0] as string;
      const ext = fileUrl.split('?')[0]?.split('.').pop() ?? 'woff2';
      await library.importFromUrl(fileUrl, `${family.replace(/\s+/g, '')}.${ext}`);
    } catch (error) {
      console.error('引入 Google 字体失败:', error);
      toast.error(error instanceof Error ? error.message : '引入失败，请稍后重试');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder="搜索 Google Fonts"
          className="pl-7"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </div>

      {/* 分类分组：近两千个族先按类别收窄，再翻页 */}
      <div className="flex shrink-0 flex-wrap gap-1">
        {[null, ...CATEGORY_FILTERS].map((item) => {
          const active = category === item;
          const label = item ?? '全部';
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                setCategory(item);
                setPage(0);
              }}
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-[10px] transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <ScrollArea
        viewportRef={viewportRef}
        className="min-h-0 flex-1"
        viewportClassName="[&>div]:!block"
      >
        <ul ref={listRef} className="space-y-2 pr-1">
          {rendered.map((entry) => (
            <FontRow
              key={entry.family}
              title={entry.family}
              family={entry.family}
              meta={entry.category}
              text={previewText}
            >
              {introduced.has(entry.family) ? (
                // 已经引入过的不再给按钮：重复点只会被去重，这里直接表明状态
                <Button type="button" variant="plain" size="sm" disabled>
                  <Check data-icon="inline-start" />
                  已引入
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy === entry.family}
                  onClick={() => void handleImport(entry.family)}
                >
                  <Download data-icon="inline-start" />
                  引入
                </Button>
              )}
            </FontRow>
          ))}
        </ul>
      </ScrollArea>

      <div className="flex shrink-0 items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>
          共 {GOOGLE_FONTS.length} 个族
          {filtered.length !== GOOGLE_FONTS.length ? `，匹配 ${filtered.length} 个` : ''}
        </span>
        {pageCount > 1 ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="plain"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage(Math.max(0, currentPage - 1))}
            >
              上一页
            </Button>
            <span className="tabular-nums">
              {currentPage + 1} / {pageCount}
            </span>
            <Button
              type="button"
              variant="plain"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            >
              下一页
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 本机字体：只记引用，不复制系统字体文件。 */
function SystemSource({
  library,
  previewText,
}: {
  library: ReturnType<typeof useFontLibrary>;
  previewText: string;
}) {
  const { fonts, loading } = useSystemFonts();
  const [query, setQuery] = useState('');
  const introduced = useMemo(() => new Set(library.favorites), [library.favorites]);

  // 系统字体动辄几百个，先按关键词收窄，再截断；列表本身限高滚动
  const matched = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const list = keyword
      ? fonts.filter((item) => item.family.toLowerCase().includes(keyword))
      : fonts;
    return list.slice(0, 80);
  }, [fonts, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="搜索本机字体"
            className="pl-7"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {loading ? '读取中…' : `共 ${fonts.length} 个`}
        </span>
      </div>

      {matched.length === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">没有匹配的本机字体。</p>
      ) : (
        <ScrollArea className="min-h-0 flex-1" viewportClassName="[&>div]:!block">
          <ul className="space-y-2 pr-1">
            {matched.map((item) => (
              <FontRow
                key={item.family}
                title={item.family}
                family={item.family}
                meta="本机"
                text={previewText}
              >
                {introduced.has(item.family) ? (
                  <Button
                    type="button"
                    variant="plain"
                    size="sm"
                    onClick={() => void library.removeFavorite(item.family)}
                  >
                    <X data-icon="inline-start" />
                    移出
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void library.addFavorite(item.family)}
                  >
                    引入
                  </Button>
                )}
              </FontRow>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}

/** 自定义导入：文件复制进工作区 `Fonts/`。 */
function FileSource({ library }: { library: ReturnType<typeof useFontLibrary> }) {
  const canImport = isNativeWindowAvailable();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canImport}
          onClick={() => void library.importFromFile()}
        >
          <FolderInput data-icon="inline-start" />
          选择字体文件
        </Button>
        <span className="text-[10px] text-muted-foreground">支持 ttf / otf / woff / woff2</span>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        文件会被复制到工作区的 <code>{fontsDirectory('…')}</code> 下，跟着工作区一起备份。
        集合字体（ttc / otc）请先在字体工具里导出单字重再导入。
      </p>
    </div>
  );
}

/** 已引入列表：三种来源统一展示，可逐条移除。 */
function IntroducedList({
  library,
  previewText,
}: {
  library: ReturnType<typeof useFontLibrary>;
  previewText: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (library.entries.length === 0) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        还没有引入任何字体。引入后才会出现在模板页的「全局字体」下拉里。
      </p>
    );
  }

  const sourceLabel: Record<FontLibraryEntry['source'], string> = {
    online: 'Google',
    file: '导入',
    system: '本机',
  };

  const startEditing = (family: string, note?: string) => {
    setEditing(family);
    setDraft(note ?? '');
  };

  const commit = async (family: string) => {
    setEditing(null);
    await library.setNote(family, draft);
  };

  return (
    <ul className="space-y-2">
      {library.entries.map((entry) => (
        <FontRow
          key={entry.id}
          title={entry.label}
          family={entry.family}
          note={entry.note}
          meta={[sourceLabel[entry.source], formatSize(entry.size)].filter(Boolean).join(' · ')}
          text={previewText}
        >
          {editing === entry.family ? (
            <Input
              autoFocus
              value={draft}
              placeholder="备注，如「手写」"
              className="h-6 w-32 text-xs"
              aria-label={`${entry.label} 的备注`}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void commit(entry.family)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void commit(entry.family);
                }
                if (event.key === 'Escape') {
                  setEditing(null);
                }
              }}
            />
          ) : (
            <Button
              type="button"
              variant="plain"
              size="sm"
              aria-label={`给 ${entry.label} 写备注`}
              onClick={() => startEditing(entry.family, entry.note)}
            >
              <Pencil data-icon="inline-start" />
              {entry.note ? '改备注' : '写备注'}
            </Button>
          )}

          {entry.source === 'system' ? (
            <Button
              type="button"
              variant="plain"
              size="sm"
              onClick={() => void library.removeFavorite(entry.family)}
            >
              <X data-icon="inline-start" />
              移除
            </Button>
          ) : (
            <Button
              type="button"
              variant="plain"
              size="sm"
              onClick={() => void library.removeImported(entry.id)}
            >
              <X data-icon="inline-start" />
              移除
            </Button>
          )}
        </FontRow>
      ))}
    </ul>
  );
}

/** 「待引入」下面的三种来源。 */
const SOURCE_TABS = [
  { id: 'google', label: 'Google Fonts' },
  { id: 'system', label: '本机字体' },
  { id: 'file', label: '自定义导入' },
] as const;

type SourceTabId = (typeof SOURCE_TABS)[number]['id'];

/**
 * 设置里的「字体」一级 tab。
 *
 * 结构：待引入 / 已引入 两个分段，各自是一个**占满内容区高度**的卡片——列表在卡片
 * 内部滚动，页面本身不滚动，因此同一屏只会出现一条滚动条。
 * 「待引入」下面再分三种来源：Google Fonts、本机字体、自定义导入。
 */
export function FontLibraryTab() {
  const library = useFontLibrary();
  const [mode, setMode] = useState<'available' | 'introduced'>('available');
  const [source, setSource] = useState<SourceTabId>('google');
  // 预览文本跟着页面走：换一段自己常用的文案（比如水印文字）就能直接看效果
  const [previewText, setPreviewText] = useState(PREVIEW_TEXT);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/*
        这里不用 shared 的 Tabs：设置页外层已经是竖向 Tabs，而外层与内层共用
        `group/tabs` 这个命名 group，Tailwind 的 `group-data-vertical/tabs:*`
        会匹配到外层祖先，把内层也压成竖排。分段控件自己画更稳。
      */}
      <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg bg-muted p-[3px]">
        <button
          type="button"
          onClick={() => setMode('available')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
            mode === 'available'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground',
          )}
        >
          待引入
        </button>
        <button
          type="button"
          onClick={() => setMode('introduced')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
            mode === 'introduced'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/60 hover:text-foreground',
          )}
        >
          已引入（{library.entries.length}）
        </button>
      </div>

      {mode === 'available' ? (
        <section className="flex min-h-0 flex-1 flex-col border border-border/80 bg-card px-5 py-4 shadow-sm">
          <div className="shrink-0">
            <h3 className="text-sm font-semibold">引入字体</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              只有引入过的字体会出现在模板页的「全局字体」下拉里；导入的字体文件保存在工作区 的{' '}
              <code>{fontsDirectory('…')}</code> 下，跟着工作区一起备份。
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="shrink-0 text-[10px] text-muted-foreground">预览文本</span>
              <Input
                value={previewText}
                placeholder={PREVIEW_TEXT}
                aria-label="预览文本"
                onChange={(event) => setPreviewText(event.target.value)}
              />
              {previewText !== PREVIEW_TEXT ? (
                <Button
                  type="button"
                  variant="plain"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setPreviewText(PREVIEW_TEXT)}
                >
                  重置
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSource(tab.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                    source === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/60 hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col">
            {source === 'google' ? (
              <GoogleSource library={library} previewText={previewText} />
            ) : null}
            {source === 'system' ? (
              <SystemSource library={library} previewText={previewText} />
            ) : null}
            {source === 'file' ? <FileSource library={library} /> : null}
          </div>
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col border border-border/80 bg-card px-5 py-4 shadow-sm">
          <h3 className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <Type className="size-4" />
            已引入（{library.entries.length}）
          </h3>
          <ScrollArea className="mt-3 min-h-0 flex-1" viewportClassName="[&>div]:!block">
            <div className="pr-1">
              <IntroducedList library={library} previewText={previewText} />
            </div>
          </ScrollArea>
        </section>
      )}
    </div>
  );
}
