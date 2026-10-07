import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CollageConfig } from '@/platform/contracts';
import { findCollageLayout } from '../layouts';
import {
  canvasStateFromConfig,
  clamp,
  createAnnotation,
  createEmptySlotState,
  exportStateFromConfig,
  getAspectRatioValue,
  getDefaultCanvasState,
  getDefaultExportSettings,
  heightFromRatio,
} from '../lib';
import type {
  CollageAnnotation,
  CollageCanvasState,
  CollageExportState,
  CollageLayoutMode,
  CollagePresentState,
  CollageSlotState,
  CollageTool,
} from '../types';

/** fit = 自动适应窗口；数字 = 相对设计基准的缩放倍率。 */
export type CollageZoom = 'fit' | number;

function clonePresentState(state: CollagePresentState): CollagePresentState {
  return structuredClone(state);
}

/**
 * 由「设置 → 拼图」的默认值生成一份干净的拼图状态。
 *
 * `config` 为 null 时就是出厂默认（Web 端或读不到配置时）。
 */
function presentFromConfig(config: CollageConfig | null): CollagePresentState {
  const layout = findCollageLayout(config?.layout_id?.trim() || 'solo-full');

  return {
    layoutId: layout.id,
    canvas: canvasStateFromConfig(config),
    exportSettings: exportStateFromConfig(config),
    slotItems: Array.from({ length: layout.count }, (_, index) => createEmptySlotState(index)),
    annotations: [],
  };
}

function getDefaultPresentState(): CollagePresentState {
  return presentFromConfig(null);
}

/**
 * 槽位数量：网格模式严格跟随布局（多了会渲染到不存在的槽位上），
 * 长图与自由模式跟随素材数量。
 */
function resolveSlotCount(present: CollagePresentState): number {
  if (present.canvas.layoutMode === 'grid') {
    return Math.max(findCollageLayout(present.layoutId).count, 1);
  }

  return Math.max(present.slotItems.length, 1);
}

function normalizeSlots(present: CollagePresentState): CollageSlotState[] {
  return Array.from({ length: resolveSlotCount(present) }, (_, index) => {
    const existing = present.slotItems[index];
    const merged = {
      ...createEmptySlotState(index),
      ...existing,
    };

    // 老版本把 offsetX/offsetY 存成像素，这里统一收敛到百分比区间
    return {
      ...merged,
      scale: clamp(merged.scale, 0.2, 4),
      offsetX: clamp(merged.offsetX, -50, 50),
      offsetY: clamp(merged.offsetY, -50, 50),
      rotation: clamp(merged.rotation, -180, 180),
    };
  });
}

function normalizePresentState(present: CollagePresentState): CollagePresentState {
  const merged: CollagePresentState = {
    ...present,
    canvas: {
      ...getDefaultCanvasState(),
      ...present.canvas,
    },
    exportSettings: {
      ...getDefaultExportSettings(),
      ...present.exportSettings,
    },
    slotItems: present.slotItems ?? [],
    annotations: present.annotations ?? [],
  };

  // 槽位数量取决于合并后的布局模式，所以要在 canvas 补全之后再算
  return { ...merged, slotItems: normalizeSlots(merged) };
}

/** 让槽位里的素材与当前素材列表对齐：删除的补洞，新导入的填空位。 */
function alignSlotsWithPhotos(slots: CollageSlotState[], photoIds: string[]): CollageSlotState[] {
  const valid = new Set(photoIds);
  const hasMissing = slots.some((slot) => slot.photoId && !valid.has(slot.photoId));
  let next = slots;

  if (hasMissing) {
    const kept: string[] = [];
    for (const slot of slots) {
      if (slot.photoId && valid.has(slot.photoId)) {
        kept.push(slot.photoId);
      }
    }

    next = slots.map((slot, index) => ({
      ...slot,
      photoId: kept[index] ?? null,
    }));
  }

  const used = new Set(next.map((slot) => slot.photoId).filter(Boolean));
  const queue = photoIds.filter((photoId) => !used.has(photoId));

  return next.map((slot) => {
    if (slot.photoId || queue.length === 0) {
      return slot;
    }

    return {
      ...slot,
      photoId: queue.shift() ?? null,
    };
  });
}

interface CollageStoreState {
  past: CollagePresentState[];
  future: CollagePresentState[];
  present: CollagePresentState;
  /** 当前素材 id（不持久化）：切换布局时用它把没放进去的图补进空位 */
  photoIds: string[];
  /** 设置里的拼图默认值（不持久化）；「恢复默认」与新建拼图都按它来 */
  configDefaults: CollageConfig | null;
  /** 读入设置里的默认值；用户还没动过时顺手把当前状态也换成这套默认 */
  setConfigDefaults: (config: CollageConfig | null) => void;
  selectedSlotIndex: number | null;
  selectedAnnotationId: string | null;
  tool: CollageTool;
  zoom: CollageZoom;
  commit: (updater: (draft: CollagePresentState) => void) => void;
  undo: () => void;
  redo: () => void;
  selectSlot: (index: number | null) => void;
  selectAnnotation: (id: string | null) => void;
  setTool: (tool: CollageTool) => void;
  setZoom: (zoom: CollageZoom) => void;
  setLayoutMode: (mode: CollageLayoutMode) => void;
  setLayout: (layoutId: string) => void;
  updateCanvas: (patch: Partial<CollageCanvasState>) => void;
  /** 画布参数恢复默认（比例、间距、边距、圆角、阴影、背景、长图参数） */
  resetCanvas: () => void;
  /** 导出参数恢复默认（格式、质量、倍率、尺寸、锁定比例） */
  resetExportSettings: () => void;
  /** 切画布比例：锁定导出比例时顺手把导出高度一起算好，只留一条历史 */
  setAspectPreset: (preset: CollageCanvasState['aspectPreset'], ratio: number) => void;
  setCustomRatio: (width: number, height: number) => void;
  updateExportSettings: (patch: Partial<CollageExportState>) => void;
  assignPhotoToSlot: (index: number, photoId: string) => void;
  clearSlot: (index: number) => void;
  moveSlot: (from: number, to: number) => void;
  updateSlot: (index: number, patch: Partial<CollageSlotState>) => void;
  /** 拖拽/滚轮过程中的实时预览：只改 present，不写历史 */
  previewSlot: (index: number, patch: Partial<CollageSlotState>) => void;
  /** 手势结束时提交：先回到手势起点再落一次结果，撤销栈里只留一条 */
  applySlotDrag: (
    index: number,
    startSlot: CollageSlotState,
    patch: Partial<CollageSlotState>,
  ) => void;
  resetSlot: (index: number) => void;
  resetSlots: () => void;
  /** 只往空位里补素材，已有的格子（含取景、缩放）原样不动 */
  fillEmptySlots: (photoIds: string[]) => void;
  /** 按素材顺序整块重排，会清掉每格的取景与缩放 */
  distributePhotos: (photoIds: string[]) => void;
  syncPhotos: (photoIds: string[], layoutMode: CollageLayoutMode) => void;
  removePhotoReferences: (photoId: string) => void;
  addAnnotation: (kind: CollageAnnotation['type']) => void;
  updateAnnotation: (id: string, patch: Partial<CollageAnnotation>) => void;
  removeAnnotation: (id: string) => void;
}

export const useCollageStore = create<CollageStoreState>()(
  persist(
    (set, get) => ({
      past: [],
      future: [],
      present: getDefaultPresentState(),
      photoIds: [],
      configDefaults: null,
      setConfigDefaults: (config) => {
        set((state) => {
          const present = state.present;
          const factory = presentFromConfig(null);
          const same = (left: unknown, right: unknown) =>
            JSON.stringify(left) === JSON.stringify(right);

          // 逐块判断：用户已经调过的部分保持原样，其余用设置里的默认值。
          // 只按「整个状态是否等于默认」判断太脆——读配置是异步的，期间导入一张素材就会让它失效。
          const canvas = same(present.canvas, factory.canvas)
            ? canvasStateFromConfig(config)
            : present.canvas;
          const exportSettings = same(present.exportSettings, factory.exportSettings)
            ? exportStateFromConfig(config)
            : present.exportSettings;

          // 还没有放任何素材时，连布局也一起用设置里的默认
          const empty = present.slotItems.every((slot) => !slot.photoId);
          const layoutId =
            empty && same(present.layoutId, factory.layoutId)
              ? presentFromConfig(config).layoutId
              : present.layoutId;
          const slotItems =
            layoutId === present.layoutId
              ? present.slotItems
              : normalizeSlots({ ...present, layoutId });

          return {
            configDefaults: config,
            present: { ...present, layoutId, canvas, exportSettings, slotItems },
          };
        });
      },
      selectedSlotIndex: null,
      selectedAnnotationId: null,
      tool: 'select',
      zoom: 'fit',
      commit: (updater) => {
        set((state) => {
          const previous = clonePresentState(state.present);
          const next = clonePresentState(state.present);
          updater(next);
          const normalized = normalizePresentState(next);

          if (JSON.stringify(previous) === JSON.stringify(normalized)) {
            return state;
          }

          return {
            past: [...state.past.slice(-59), previous],
            present: normalized,
            future: [],
          };
        });
      },
      undo: () => {
        set((state) => {
          const previous = state.past[state.past.length - 1];
          if (!previous) {
            return state;
          }

          return {
            past: state.past.slice(0, -1),
            present: previous,
            future: [clonePresentState(state.present), ...state.future].slice(0, 59),
            selectedSlotIndex: null,
            selectedAnnotationId: null,
          };
        });
      },
      redo: () => {
        set((state) => {
          const next = state.future[0];
          if (!next) {
            return state;
          }

          return {
            past: [...state.past, clonePresentState(state.present)].slice(-59),
            present: next,
            future: state.future.slice(1),
            selectedSlotIndex: null,
            selectedAnnotationId: null,
          };
        });
      },
      selectSlot: (index) => {
        set({
          selectedSlotIndex: index,
          selectedAnnotationId: null,
        });
      },
      selectAnnotation: (id) => {
        set({
          selectedSlotIndex: null,
          selectedAnnotationId: id,
        });
      },
      setTool: (tool) => set({ tool }),
      setZoom: (zoom) => set({ zoom }),
      setLayoutMode: (mode) => {
        get().commit((draft) => {
          draft.canvas.layoutMode = mode;
        });
      },
      setLayout: (layoutId) => {
        const photoIds = get().photoIds;

        get().commit((draft) => {
          draft.layoutId = layoutId;
          draft.canvas.layoutMode = 'grid';
          // 缺少的槽位补空位：`commit` 会按新布局数量裁剪
          draft.slotItems = Array.from(
            { length: 24 },
            (_, index) => draft.slotItems[index] ?? createEmptySlotState(index),
          );
          // 换布局时把还没放进去的素材按顺序补进空位，否则切完会发现画布上只剩几张
          draft.slotItems = alignSlotsWithPhotos(draft.slotItems, photoIds);
        });
        set((state) => ({
          selectedSlotIndex:
            state.selectedSlotIndex !== null &&
            state.selectedSlotIndex < state.present.slotItems.length
              ? state.selectedSlotIndex
              : null,
        }));
      },
      updateCanvas: (patch) => {
        get().commit((draft) => {
          draft.canvas = {
            ...draft.canvas,
            ...patch,
          };
        });
      },
      resetCanvas: () => {
        const defaults = canvasStateFromConfig(get().configDefaults);

        get().commit((draft) => {
          draft.canvas = defaults;

          // 锁着比例时，导出高度要跟着回到默认比例，别让尺寸和画布对不上
          if (draft.exportSettings.lockRatio) {
            draft.exportSettings.height = heightFromRatio(
              draft.exportSettings.width,
              getAspectRatioValue(defaults),
            );
          }
        });
      },
      setAspectPreset: (preset, ratio) => {
        get().commit((draft) => {
          draft.canvas.aspectPreset = preset;
          if (draft.exportSettings.lockRatio) {
            draft.exportSettings.height = heightFromRatio(draft.exportSettings.width, ratio);
          }
        });
      },
      setCustomRatio: (width, height) => {
        get().commit((draft) => {
          draft.canvas.aspectPreset = 'custom';
          draft.canvas.customRatioWidth = clamp(Math.round(width), 1, 100);
          draft.canvas.customRatioHeight = clamp(Math.round(height), 1, 100);
          if (draft.exportSettings.lockRatio) {
            draft.exportSettings.height = heightFromRatio(
              draft.exportSettings.width,
              draft.canvas.customRatioWidth / draft.canvas.customRatioHeight,
            );
          }
        });
      },
      resetExportSettings: () => {
        const defaults = exportStateFromConfig(get().configDefaults);

        get().commit((draft) => {
          draft.exportSettings = defaults;
        });
      },
      updateExportSettings: (patch) => {
        get().commit((draft) => {
          draft.exportSettings = {
            ...draft.exportSettings,
            ...patch,
          };
        });
      },
      assignPhotoToSlot: (index, photoId) => {
        get().commit((draft) => {
          draft.slotItems[index] = {
            ...(draft.slotItems[index] ?? createEmptySlotState(index)),
            photoId,
          };
        });
        set({
          selectedSlotIndex: index,
          selectedAnnotationId: null,
        });
      },
      clearSlot: (index) => {
        get().commit((draft) => {
          draft.slotItems[index] = {
            ...createEmptySlotState(index),
            photoId: null,
          };
        });
      },
      moveSlot: (from, to) => {
        if (from === to || from < 0 || to < 0) {
          return;
        }

        get().commit((draft) => {
          if (!draft.slotItems[from] || !draft.slotItems[to]) {
            return;
          }

          const [moved] = draft.slotItems.splice(from, 1);
          draft.slotItems.splice(to, 0, moved);
        });
      },
      updateSlot: (index, patch) => {
        get().commit((draft) => {
          draft.slotItems[index] = {
            ...(draft.slotItems[index] ?? createEmptySlotState(index)),
            ...patch,
          };
        });
      },
      previewSlot: (index, patch) => {
        set((state) => {
          const slot = state.present.slotItems[index];
          if (!slot) {
            return state;
          }

          const slotItems = [...state.present.slotItems];
          slotItems[index] = {
            ...slot,
            ...patch,
          };

          return { present: { ...state.present, slotItems } };
        });
      },
      applySlotDrag: (index, startSlot, patch) => {
        set((state) => {
          const slotItems = [...state.present.slotItems];
          slotItems[index] = startSlot;

          return { present: { ...state.present, slotItems } };
        });
        get().updateSlot(index, patch);
      },
      resetSlot: (index) => {
        get().commit((draft) => {
          draft.slotItems[index] = {
            ...createEmptySlotState(index),
            photoId: draft.slotItems[index]?.photoId ?? null,
          };
        });
      },
      resetSlots: () => {
        get().commit((draft) => {
          draft.slotItems = draft.slotItems.map((slot, index) => ({
            ...createEmptySlotState(index),
            photoId: slot.photoId,
          }));
        });
      },
      fillEmptySlots: (photoIds) => {
        get().commit((draft) => {
          draft.slotItems = alignSlotsWithPhotos(draft.slotItems, photoIds);
        });
      },
      distributePhotos: (photoIds) => {
        get().commit((draft) => {
          draft.slotItems = draft.slotItems.map((_, index) => ({
            ...createEmptySlotState(index),
            photoId: photoIds[index] ?? null,
          }));
        });
      },
      syncPhotos: (photoIds, layoutMode) => {
        set((state) => {
          const next = clonePresentState(state.present);
          // 长图与自由模式的槽位数跟着素材走：新导入要长出来，删素材也要收回去。
          // 兜底用「不同素材数」而不是「已填格数」——同一张图在两格里（例如从网格模式带过来的
          // 重复引用）不该把长图顶出一行多余的空白。
          const distinctUsed = new Set(next.slotItems.map((slot) => slot.photoId).filter(Boolean))
            .size;
          const targetCount =
            layoutMode === 'grid'
              ? next.slotItems.length
              : Math.max(photoIds.length, distinctUsed, 1);

          next.slotItems = Array.from({ length: targetCount }, (_, index) =>
            next.slotItems[index] ? { ...next.slotItems[index] } : createEmptySlotState(index),
          );
          next.slotItems = alignSlotsWithPhotos(next.slotItems, photoIds);

          if (
            JSON.stringify(next) === JSON.stringify(state.present) &&
            JSON.stringify(photoIds) === JSON.stringify(state.photoIds)
          ) {
            return state;
          }

          return { present: normalizePresentState(next), photoIds: [...photoIds] };
        });
      },
      removePhotoReferences: (photoId) => {
        get().commit((draft) => {
          draft.slotItems = draft.slotItems.map((slot, index) =>
            slot.photoId === photoId
              ? {
                  ...createEmptySlotState(index),
                }
              : slot,
          );
        });
      },
      addAnnotation: (kind) => {
        const annotation = createAnnotation(kind);
        get().commit((draft) => {
          draft.annotations.push(annotation);
        });
        set({
          selectedAnnotationId: annotation.id,
          selectedSlotIndex: null,
        });
      },
      updateAnnotation: (id, patch) => {
        get().commit((draft) => {
          draft.annotations = draft.annotations.map((item) =>
            item.id === id ? ({ ...item, ...patch } as CollageAnnotation) : item,
          );
        });
      },
      removeAnnotation: (id) => {
        get().commit((draft) => {
          draft.annotations = draft.annotations.filter((item) => item.id !== id);
        });
        set((state) => ({
          selectedAnnotationId:
            state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
        }));
      },
    }),
    {
      name: 'copicseal-collage-state',
      version: 2,
      // 只留编辑结果：预览缩放是「看」的状态，重启后一律回到「适应」，
      // 否则上次停在 200% 时重开会看到被放大的片段，像是图片没缩放进格子
      partialize: (state) => ({
        present: state.present,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<CollageStoreState> | undefined;
        if (!state?.present) {
          return persisted as CollageStoreState;
        }

        return {
          ...state,
          present:
            version < 2
              ? normalizePresentState({
                  ...state.present,
                  slotItems: state.present.slotItems ?? [],
                })
              : state.present,
        } as CollageStoreState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CollageStoreState> | undefined;
        if (!persisted?.present) {
          return currentState;
        }

        return {
          ...currentState,
          ...persisted,
          present: normalizePresentState(persisted.present),
        };
      },
    },
  ),
);
