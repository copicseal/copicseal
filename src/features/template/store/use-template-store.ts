import { create } from 'zustand';
import type { OutputSize } from '@/platform/contracts';
import type { ExportPreset } from '@/shared/types/export';
import { resolveTemplateBackground, type TemplateBackground } from '../background';
import { createExportPreset } from '../lib/export-preset';
import type { TemplatePresetContent, TemplatePresetRecord } from '../lib/template-preset';
import {
  getBuiltinTemplateById,
  getDefaultParams,
  normalizeParams,
  resolveBuiltinTemplate,
} from '../runtime/template-registry';
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
  /** 字体族名；空串表示跟随模板自带的字体栈 */
  font: string;
  presets: ExportPreset[];
}

/** 一键应用的范围：参数脱离所属模板没有意义，因此模板与参数必须一起复制。 */
export type TemplateApplyScope = 'template' | 'background' | 'presets';

function createDefaultConfig(presets?: ExportPreset[], font?: string): TemplatePhotoConfig {
  const template = resolveBuiltinTemplate(DEFAULT_TEMPLATE_ID);

  return {
    templateId: template.meta.id,
    params: getDefaultParams(template.schema),
    background: resolveTemplateBackground(template.backgroundDefaults),
    font: font ?? '',
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
  /** 设置某张照片的字体；空串表示回到模板自带的字体栈。 */
  setFont: (photoId: string, font: string) => void;
  /**
   * 用一组档位替换默认档位。
   *
   * 只影响没有自己配置的照片（已导入但没动过、以及之后新导入的），
   * 已经调过档位的照片保持原样。
   */
  setDefaultPresets: (presets: ExportPreset[]) => void;
  /** 换掉默认字体；同样只影响没有自己配置的照片。 */
  setDefaultFont: (font: string) => void;
  /** 导出面板「常用尺寸」下拉的数据；打开下拉时会重新读一次设置 */
  exportSizes: OutputSize[];
  setExportSizes: (sizes: OutputSize[]) => void;
  /**
   * 把一条模板预设应用到若干张照片。
   *
   * 模板、参数、背景与字体一次性写入：它们共同构成「一套样式」，
   * 分开应用会短暂出现参数与新模板不匹配的中间态。导出档位不动。
   */
  applyPreset: (photoIds: readonly string[], content: TemplatePresetContent) => void;
  /** 设置里保存的模板预设；由页面从配置读出后写入。 */
  templatePresets: TemplatePresetRecord[];
  setTemplatePresets: (presets: TemplatePresetRecord[]) => void;
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
 * （见 docs/05 存储原则）。来自设置、并在启动时由页面写入的有两样：
 * `defaultConfig` 里的档位与字体（「默认档位」「全局字体」），以及模板预设清单。
 * 字体库（引入的字体）由 `features/fonts` 自己维护。
 */
export const useTemplateStore = create<TemplateStoreState>()((set) => ({
  configs: {},
  defaultConfig: createDefaultConfig(),
  templatePresets: [],

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

  setFont: (photoId, font) => {
    set((state) => ({
      configs: {
        ...state.configs,
        [photoId]: {
          ...configFor(state.configs, state.defaultConfig, photoId),
          font,
        },
      },
    }));
  },

  exportSizes: [],

  setExportSizes: (sizes) => {
    set({ exportSizes: structuredClone(sizes) });
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

  setDefaultFont: (font) => {
    set((state) => ({
      defaultConfig: { ...state.defaultConfig, font },
    }));
  },

  applyPreset: (photoIds, content) => {
    const template = getBuiltinTemplateById(content.templateId);
    // 模板已被移除时调用方就该拦下；这里再兜一层，避免写进一个渲染不出的模板
    if (!template) {
      return;
    }

    set((state) => {
      const params = normalizeParams(template.schema, content.params);
      const background = resolveTemplateBackground(content.background);
      const configs = { ...state.configs };

      for (const photoId of photoIds) {
        configs[photoId] = {
          ...configFor(state.configs, state.defaultConfig, photoId),
          templateId: template.meta.id,
          params: structuredClone(params),
          background: structuredClone(background),
          font: content.font,
        };
      }

      return { configs };
    });
  },

  setTemplatePresets: (templatePresets) => {
    set({ templatePresets });
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
