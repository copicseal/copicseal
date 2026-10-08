import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import {
  getConfig,
  importFontBytes,
  importFontFile,
  openFontDialog,
  removeFontFile,
  resolveFontConfig,
  saveFontConfig,
} from '@/platform';
import type { FontConfig, ImportedFont } from '@/platform/contracts';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { translate } from '@/shared/i18n';
import { findImportedFont, setImportedFontRegistry } from '@/shared/lib/inline-font-registry';

/** 字体来源：在线下载 / 自定义导入 / 本机引用。 */
export type FontSource = 'online' | 'file' | 'system';

export interface FontLibraryEntry {
  id: string;
  family: string;
  label: string;
  /** 用户备注，如「手写」；没有就是 undefined */
  note?: string;
  source: FontSource;
  /** 导入字体的文件大小；本机引用没有 */
  size?: number;
  origin?: string;
}

export interface FontLibrary {
  entries: FontLibraryEntry[];
  /** 族名 → 备注 */
  notes: Record<string, string>;
  imported: ImportedFont[];
  favorites: string[];
  defaultFont: string;
  loading: boolean;
  /** 自定义导入：走系统文件选择器，文件由 Rust 侧复制进工作区 */
  importFromFile: () => Promise<void>;
  /** 在线字体源：前端下载字节后交给 Rust 落盘 */
  importFromUrl: (url: string, fileName?: string) => Promise<ImportedFont | null>;
  removeImported: (id: string) => Promise<void>;
  removeFavorite: (family: string) => Promise<void>;
  addFavorite: (family: string) => Promise<void>;
  /** 写字体备注；传空串等于删除该条备注 */
  setNote: (family: string, note: string) => Promise<void>;
}

/** 工作区里的字体目录：`<工作区>/Fonts`。 */
export function fontsDirectory(workspace: string): string {
  return `${workspace.replace(/[\\/]+$/, '')}/Fonts`;
}

const EMPTY_FONTS: FontConfig = {
  favorites: [],
  default_font: '',
  imported: [],
  notes: [],
};

/**
 * 字体库的共享状态。
 *
 * 必须是模块级 store：设置页写、模板页的字体下拉读，两个页面各自持有一份局部 state
 * 时，在设置里引入的字体不会实时出现在模板页（这正是之前那个 bug）。
 */
interface FontLibraryStore {
  workspace: string;
  fonts: FontConfig;
  loading: boolean;
  /** 只读一次配置；之后所有变更都经由下面的动作写回这里 */
  loaded: boolean;
}

const useFontLibraryStore = create<FontLibraryStore>()(() => ({
  workspace: '',
  fonts: EMPTY_FONTS,
  loading: true,
  loaded: false,
}));

/** 已注册的 FontFace：族名 → face，避免重复注册；移除字体时用来卸载。 */
const registeredFaces = new Map<string, FontFace>();

/**
 * 把导入的字体注册成文档字体。
 *
 * 预览与画布都靠它才能用上导入字体；注册失败（文件被删、格式不支持）只警告，
 * 界面仍会列出该字体，由用户决定是否删掉。
 */
async function registerImportedFonts(
  workspace: string,
  fonts: readonly ImportedFont[],
): Promise<void> {
  const wanted = new Set(fonts.map((font) => font.family));

  for (const [family, face] of registeredFaces) {
    if (!wanted.has(family)) {
      document.fonts.delete(face);
      registeredFaces.delete(family);
    }
  }

  for (const font of fonts) {
    if (registeredFaces.has(font.family)) {
      continue;
    }

    try {
      const url = platformRuntime.toNativeFileUrl(`${fontsDirectory(workspace)}/${font.file_name}`);
      const face = new FontFace(font.family, `url("${url}")`);
      await face.load();
      document.fonts.add(face);
      registeredFaces.set(font.family, face);
    } catch (error) {
      console.warn(`注册字体失败（${font.family}）:`, error);
    }
  }
}

/** 首次挂载时读一次配置；并发调用只会读一次。 */
async function ensureFontLibraryLoaded(): Promise<void> {
  if (useFontLibraryStore.getState().loaded) {
    return;
  }
  useFontLibraryStore.setState({ loaded: true, loading: true });

  try {
    const appConfig = await getConfig();
    const fonts = await resolveFontConfig();
    const workspace = appConfig.save_directory ?? '';

    useFontLibraryStore.setState({ workspace, fonts, loading: false });
    setImportedFontRegistry(workspace, fonts.imported);
    await registerImportedFonts(workspace, fonts.imported);
  } catch (error) {
    console.error('读取字体库失败:', error);
    useFontLibraryStore.setState({ loading: false });
  }
}

/** 落库 + 更新 store + 同步导出用的登记表。 */
async function persistFonts(next: FontConfig): Promise<void> {
  const { workspace } = useFontLibraryStore.getState();
  useFontLibraryStore.setState({ fonts: next });
  setImportedFontRegistry(workspace, next.imported);

  try {
    await saveFontConfig(next);
  } catch (error) {
    console.error('保存字体设置失败:', error);
    toast.error(translate('fonts.error.saveFailed'));
  }
}

async function addImportedFont(font: ImportedFont): Promise<void> {
  const { workspace, fonts } = useFontLibraryStore.getState();

  // 去重按族名：同一个字体反复引入不该在工作区里堆出多份文件
  if (fonts.imported.some((item) => item.family === font.family)) {
    try {
      await removeFontFile(workspace, font.file_name);
    } catch (error) {
      console.warn('清理重复字体文件失败:', error);
    }
    toast.info(translate('fonts.toast.alreadyImported', { family: font.family }));
    return;
  }

  const next = { ...fonts, imported: [...fonts.imported, font] };
  await persistFonts(next);
  await registerImportedFonts(workspace, next.imported);
}

async function importFontFromFile(): Promise<void> {
  const { workspace } = useFontLibraryStore.getState();

  try {
    const picked = await openFontDialog();
    const sourcePath = Array.isArray(picked) ? picked[0] : picked;
    if (!sourcePath) {
      return;
    }

    const font = await importFontFile(workspace, sourcePath);
    await addImportedFont(font);
    toast.success(translate('fonts.toast.imported', { family: font.family }));
  } catch (error) {
    console.error('导入字体失败:', error);
    toast.error(translate('fonts.error.importFailed'));
  }
}

async function importFontFromUrl(url: string, fileName?: string): Promise<ImportedFont | null> {
  const { workspace } = useFontLibraryStore.getState();

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // IPC 走 JSON，传普通数组最稳（中文字体这类大文件建议用「自定义导入」）
    const bytes = Array.from(new Uint8Array(await response.arrayBuffer()));
    const font = await importFontBytes(workspace, fileName ?? null, bytes);
    await addImportedFont(font);
    toast.success(translate('fonts.toast.onlineImported', { family: font.family }));
    return font;
  } catch (error) {
    console.error('下载字体失败:', error);
    toast.error(translate('fonts.error.downloadFailed'));
    return null;
  }
}

async function removeImportedFont(id: string): Promise<void> {
  const { workspace, fonts } = useFontLibraryStore.getState();
  const font = fonts.imported.find((item) => item.id === id);
  if (!font) {
    return;
  }

  await persistFonts({
    ...fonts,
    imported: fonts.imported.filter((item) => item.id !== id),
  });

  const face = registeredFaces.get(font.family);
  if (face) {
    document.fonts.delete(face);
    registeredFaces.delete(font.family);
  }

  try {
    await removeFontFile(workspace, font.file_name);
  } catch (error) {
    console.warn('删除字体文件失败:', error);
  }
  toast.success(translate('fonts.toast.removed', { family: font.family }));
}

async function addFavoriteFont(family: string): Promise<void> {
  const { fonts } = useFontLibraryStore.getState();
  if (fonts.favorites.includes(family)) {
    return;
  }

  await persistFonts({ ...fonts, favorites: [...fonts.favorites, family] });
}

async function removeFavoriteFont(family: string): Promise<void> {
  const { fonts } = useFontLibraryStore.getState();
  await persistFonts({
    ...fonts,
    favorites: fonts.favorites.filter((item) => item !== family),
  });
}

async function setFontNote(family: string, note: string): Promise<void> {
  const { fonts } = useFontLibraryStore.getState();
  const trimmed = note.trim();
  const others = fonts.notes.filter((item) => item.family !== family);

  await persistFonts({
    ...fonts,
    notes: trimmed ? [...others, { family, note: trimmed }] : others,
  });
}

/**
 * 字体库：引入本机字体（引用）、自定义导入与在线下载（都落成工作区文件）。
 *
 * 只有进过这个库的字体才会出现在模板页的「全局字体」下拉里——不会把系统里
 * 几百个字体一股脑铺出来。数据放在模块级 store，所以设置页改完，模板页立刻能看到。
 */
export function useFontLibrary(): FontLibrary {
  const fonts = useFontLibraryStore((state) => state.fonts);
  const loading = useFontLibraryStore((state) => state.loading);

  useEffect(() => {
    void ensureFontLibraryLoaded();
  }, []);

  const notes = useMemo(
    () => Object.fromEntries(fonts.notes.map((item) => [item.family, item.note])),
    [fonts.notes],
  );

  const entries = useMemo<FontLibraryEntry[]>(
    () => [
      ...fonts.imported.map((font) => ({
        id: font.id,
        family: font.family,
        label: font.family,
        note: fonts.notes.find((item) => item.family === font.family)?.note,
        source: (font.source === 'online' ? 'online' : 'file') as FontSource,
        size: font.size,
        origin: font.origin,
      })),
      ...fonts.favorites.map((family) => ({
        id: `system:${family}`,
        family,
        label: family,
        note: fonts.notes.find((item) => item.family === family)?.note,
        source: 'system' as FontSource,
      })),
    ],
    [fonts.favorites, fonts.imported, fonts.notes],
  );

  return {
    entries,
    notes,
    imported: fonts.imported,
    favorites: fonts.favorites,
    defaultFont: fonts.default_font,
    loading,
    importFromFile: importFontFromFile,
    importFromUrl: importFontFromUrl,
    removeImported: removeImportedFont,
    removeFavorite: removeFavoriteFont,
    addFavorite: addFavoriteFont,
    setNote: setFontNote,
  };
}

export { findImportedFont };
