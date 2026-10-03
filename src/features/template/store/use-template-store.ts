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
export type TemplateApplyScope = 'template' | 'background' | 'presets';

function createDefaultConfig(presets?: ExportPreset[]): TemplatePhotoConfig {
  const template = resolveBuiltinTemplate(DEFAULT_TEMPLATE_ID);

  return {
    templateId: template.meta.id,
    params: getDefaultParams(template.schema),
    background: resolveTemplateBackground(template.backgroundDefaults),
    presets: presets ?? [createExportPreset()],
  };
}

function configFor(
  configs: Record<string, TemplatePhotoConfig>,
  defaultConfig: TemplatePhotoConfig,
  photoId: string,
): TemplatePhotoConfig {
  return configs[photoId] ?? defaultConfig;
}

interface TemplateStoreState {
  configs: Record<string, TemplatePhotoConfig>;
  /**
   * 未编辑过的照片共用的默认配置，也是新导入照片的起点。
   *
   * 放进 state 而不是模块常量：从设置里读到「默认档位」后要换掉它，
   * 订阅方才能跟着重渲染；同时保持稳定引用，读取端可以安全地按引用比较。
   */
  defaultConfig: TemplatePhotoConfig;
  /** 切换模板：参数与背景一起重置为新模板的默认值，导出档位保持不变。 */
  setTemplate: (photoId: string, templateId: string) => void;
  setParams: (photoId: string, params: Record<string, unknown>) => void;
  setBackground: (photoId: string, background: TemplateBackground) => void;
  setPresets: (photoId: string, presets: ExportPreset[]) => void;
  /**
   * 用一组档位替换默认档位。
   *
   * 只影响没有自己配置的照片（已导入但没动过、以及之后新导入的），
   * 已经调过档位的照片保持原样。
   */
  setDefaultPresets: (presets: ExportPreset[]) => void;
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
 * 每张照片的配置不做持久化：照片 id 是会话级的，跨会话恢复没有意义
 * （见 docs/05 存储原则）。只有 `defaultConfig` 里的档位来自设置中的
 * 「默认档位」，并在启动时由页面写入。
 */
export const useTemplateStore = create<TemplateStoreState>()((set) => ({
  configs: {},
  defaultConfig: createDefaultConfig(),

  setTemplate: (photoId, templateId) => {
    const template = resolveBuiltinTemplate(templateId);

    set((state) => ({
      configs: {
        ...state.configs,
        [photoId]: {
          ...configFor(state.configs, state.defaultConfig, photoId),
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
          ...configFor(state.configs, state.defaultConfig, photoId),
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
          ...configFor(state.configs, state.defaultConfig, photoId),
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
          ...configFor(state.configs, state.defaultConfig, photoId),
          presets,
        },
      },
    }));
  },

  setDefaultPresets: (presets) => {
    set((state) => ({
      defaultConfig: {
        ...state.defaultConfig,
        // 空清单兜底回内置单档：一个档位都没有时导出按钮看着可用却什么也不输出
        presets: presets.length > 0 ? structuredClone(presets) : [createExportPreset()],
      },
    }));
  },

  applyToOthers: (photoIds, sourcePhotoId, scope) => {
    set((state) => {
      const source = configFor(state.configs, state.defaultConfig, sourcePhotoId);
      const configs = { ...state.configs };
      let changed = false;

      for (const photoId of photoIds) {
        if (photoId === sourcePhotoId) {
          continue;
        }

        const target = configFor(state.configs, state.defaultConfig, photoId);
        // 模板与参数必须一起复制；背景、导出档位各自独立
        const patch: Partial<TemplatePhotoConfig> =
          scope === 'template'
            ? { templateId: source.templateId, params: structuredClone(source.params) }
            : scope === 'background'
              ? { background: structuredClone(source.background) }
              : { presets: structuredClone(source.presets) };

        configs[photoId] = { ...target, ...patch };
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
  const state = useTemplateStore.getState();
  return photoId ? configFor(state.configs, state.defaultConfig, photoId) : state.defaultConfig;
}

/** 响应式读取某张照片的配置；未编辑过的照片返回框架默认值，且不会落库。 */
export function useTemplatePhotoConfig(photoId?: string | null): TemplatePhotoConfig {
  return useTemplateStore(
    (state) => (photoId ? state.configs[photoId] : undefined) ?? state.defaultConfig,
  );
}
