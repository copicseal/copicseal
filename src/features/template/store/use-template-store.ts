import { create } from 'zustand';
import type { ExportPreset } from '@/shared/types/export';
import { resolveTemplateBackground, type TemplateBackground } from '../background';
import { createExportPreset } from '../lib/export-preset';
import { getDefaultParams, resolveBuiltinTemplate } from '../runtime/template-registry';
import { DEFAULT_TEMPLATE_ID } from '../templates';

/**
 * 单张照片的模板配置。
 *
 * 模板、参数、背景与导出档位都跟着照片走：批量处理时每张图可以有自己的
 * 边框样式与输出尺寸，互不干扰。
 */
export interface TemplatePhotoConfig {
  templateId: string;
  params: Record<string, unknown>;
  background: TemplateBackground;
  presets: ExportPreset[];
}

/** 一键应用的范围：参数脱离所属模板没有意义，因此模板与参数必须一起复制。 */
export type TemplateApplyScope = 'template' | 'background';

function createDefaultConfig(): TemplatePhotoConfig {
  const template = resolveBuiltinTemplate(DEFAULT_TEMPLATE_ID);

  return {
    templateId: template.meta.id,
    params: getDefaultParams(template.schema),
    background: resolveTemplateBackground(template.backgroundDefaults),
    presets: [createExportPreset()],
  };
}

/**
 * 未编辑过的照片共用的默认配置。
 *
 * 保持同一个对象引用，读取端才能稳定比较（不会每次渲染都产出新对象）；
 * 所有写入都产出新对象，因此多张照片共享它也互不影响。
 */
const DEFAULT_PHOTO_CONFIG = createDefaultConfig();

function configFor(
  configs: Record<string, TemplatePhotoConfig>,
  photoId: string,
): TemplatePhotoConfig {
  return configs[photoId] ?? DEFAULT_PHOTO_CONFIG;
}

interface TemplateStoreState {
  configs: Record<string, TemplatePhotoConfig>;
  /** 切换模板：参数与背景一起重置为新模板的默认值，导出档位保持不变。 */
  setTemplate: (photoId: string, templateId: string) => void;
  setParams: (photoId: string, params: Record<string, unknown>) => void;
  setBackground: (photoId: string, background: TemplateBackground) => void;
  setPresets: (photoId: string, presets: ExportPreset[]) => void;
  /** 把某张照片的配置复制给其他照片，源照片本身不变。 */
  applyToOthers: (
    photoIds: readonly string[],
    sourcePhotoId: string,
    scope: TemplateApplyScope,
  ) => void;
  /** 素材被移除后回收其配置。 */
  prune: (activePhotoIds: readonly string[]) => void;
}

/**
 * Template 页的每图配置表。
 *
 * 不做持久化：照片 id 是会话级的，跨会话恢复没有意义（见 docs/05 存储原则）。
 */
export const useTemplateStore = create<TemplateStoreState>()((set) => ({
  configs: {},

  setTemplate: (photoId, templateId) => {
    const template = resolveBuiltinTemplate(templateId);

    set((state) => ({
      configs: {
        ...state.configs,
        [photoId]: {
          ...configFor(state.configs, photoId),
          templateId: template.meta.id,
          params: getDefaultParams(template.schema),
          background: resolveTemplateBackground(template.backgroundDefaults),
        },
      },
    }));
  },

  setParams: (photoId, params) => {
    set((state) => ({
      configs: {
        ...state.configs,
        [photoId]: {
          ...configFor(state.configs, photoId),
          // 存原始输入：数值框清空、只敲到「0.」的中间态都要能保留，
          // 归一化交给渲染前（TemplateRuntime）与失焦时（属性面板）各自处理
          params,
        },
      },
    }));
  },

  setBackground: (photoId, background) => {
    set((state) => ({
      configs: {
        ...state.configs,
        [photoId]: {
          ...configFor(state.configs, photoId),
          background,
        },
      },
    }));
  },

  setPresets: (photoId, presets) => {
    set((state) => ({
      configs: {
        ...state.configs,
        [photoId]: {
          ...configFor(state.configs, photoId),
          presets,
        },
      },
    }));
  },

  applyToOthers: (photoIds, sourcePhotoId, scope) => {
    set((state) => {
      const source = configFor(state.configs, sourcePhotoId);
      const configs = { ...state.configs };
      let changed = false;

      for (const photoId of photoIds) {
        if (photoId === sourcePhotoId) {
          continue;
        }

        const target = configFor(state.configs, photoId);
        configs[photoId] =
          scope === 'template'
            ? {
                ...target,
                templateId: source.templateId,
                params: structuredClone(source.params),
              }
            : {
                ...target,
                background: structuredClone(source.background),
              };
        changed = true;
      }

      return changed ? { configs } : state;
    });
  },

  prune: (activePhotoIds) => {
    set((state) => {
      const active = new Set(activePhotoIds);
      const configs: Record<string, TemplatePhotoConfig> = {};
      let changed = false;

      for (const [photoId, config] of Object.entries(state.configs)) {
        if (active.has(photoId)) {
          configs[photoId] = config;
        } else {
          changed = true;
        }
      }

      // 没有变化时必须返回原 state，否则订阅方会陷入重渲染
      return changed ? { configs } : state;
    });
  },
}));

/** 命令式读取某张照片的配置：导出等非渲染流程使用。 */
export function getTemplatePhotoConfig(photoId?: string | null): TemplatePhotoConfig {
  return photoId ? configFor(useTemplateStore.getState().configs, photoId) : DEFAULT_PHOTO_CONFIG;
}

/** 响应式读取某张照片的配置；未编辑过的照片返回框架默认值，且不会落库。 */
export function useTemplatePhotoConfig(photoId?: string | null): TemplatePhotoConfig {
  return (
    useTemplateStore((state) => (photoId ? state.configs[photoId] : undefined)) ??
    DEFAULT_PHOTO_CONFIG
  );
}
