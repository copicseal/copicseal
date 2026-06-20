import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COLLAGE_LAYOUTS } from '../layouts';
import { createAnnotation, createEmptySlotState, getDefaultCanvasState } from '../lib';
import type {
  CollageAnnotation,
  CollageCanvasState,
  CollageExportState,
  CollagePresentState,
  CollageSlotState,
} from '../types';

const DEFAULT_LAYOUT = COLLAGE_LAYOUTS[0];

function clonePresentState(state: CollagePresentState): CollagePresentState {
  return structuredClone(state);
}

function getDefaultPresentState(): CollagePresentState {
  return {
    layoutId: DEFAULT_LAYOUT.id,
    canvas: getDefaultCanvasState(),
    exportSettings: {
      format: 'png',
      quality: 'high',
    },
    slotItems: Array.from({ length: DEFAULT_LAYOUT.count }, () => createEmptySlotState()),
    annotations: [],
  };
}

function normalizeSlots(layoutId: string, slotItems: CollageSlotState[]): CollageSlotState[] {
  const layout = COLLAGE_LAYOUTS.find((item) => item.id === layoutId) ?? DEFAULT_LAYOUT;
  return Array.from({ length: layout.count }, (_, index) => {
    const existing = slotItems[index];
    return existing
      ? {
          ...createEmptySlotState(),
          ...existing,
        }
      : createEmptySlotState();
  });
}

function normalizeAnnotations(annotations: CollageAnnotation[]): CollageAnnotation[] {
  return annotations.map((annotation) => {
    if (annotation.type === 'text' && annotation.text === '双击右侧修改文字') {
      return {
        ...annotation,
        text: '文字',
        fontSize: Math.min(annotation.fontSize, 20),
        width: Math.min(annotation.width, 0.22),
        height: Math.min(annotation.height, 0.1),
      };
    }

    return annotation;
  });
}

interface CollageStoreState {
  past: CollagePresentState[];
  future: CollagePresentState[];
  present: CollagePresentState;
  selectedSlotIndex: number | null;
  selectedAnnotationId: string | null;
  commit: (updater: (draft: CollagePresentState) => void) => void;
  undo: () => void;
  redo: () => void;
  selectSlot: (index: number | null) => void;
  selectAnnotation: (id: string | null) => void;
  setLayout: (layoutId: string) => void;
  updateCanvas: (patch: Partial<CollageCanvasState>) => void;
  updateExportSettings: (patch: Partial<CollageExportState>) => void;
  assignPhotoToSlot: (index: number, photoId: string) => void;
  clearSlot: (index: number) => void;
  swapSlots: (from: number, to: number) => void;
  updateSlot: (index: number, patch: Partial<CollageSlotState>) => void;
  resetSlot: (index: number) => void;
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
      selectedSlotIndex: null,
      selectedAnnotationId: null,
      commit: (updater) => {
        set((state) => {
          const previous = clonePresentState(state.present);
          const next = clonePresentState(state.present);
          updater(next);
          next.slotItems = normalizeSlots(next.layoutId, next.slotItems);
          next.annotations = normalizeAnnotations(next.annotations);

          if (JSON.stringify(previous) === JSON.stringify(next)) {
            return state;
          }

          return {
            past: [...state.past.slice(-59), previous],
            present: next,
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
      setLayout: (layoutId) => {
        get().commit((draft) => {
          draft.layoutId = layoutId;
          draft.slotItems = normalizeSlots(layoutId, draft.slotItems);
        });
        set((state) => ({
          selectedSlotIndex:
            state.selectedSlotIndex !== null &&
            state.selectedSlotIndex < normalizeSlots(layoutId, state.present.slotItems).length
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
            ...draft.slotItems[index],
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
          draft.slotItems[index] = createEmptySlotState();
        });
      },
      swapSlots: (from, to) => {
        if (from === to) {
          return;
        }

        get().commit((draft) => {
          const current = draft.slotItems[from];
          draft.slotItems[from] = draft.slotItems[to];
          draft.slotItems[to] = current;
        });
      },
      updateSlot: (index, patch) => {
        get().commit((draft) => {
          draft.slotItems[index] = {
            ...draft.slotItems[index],
            ...patch,
          };
        });
      },
      resetSlot: (index) => {
        get().commit((draft) => {
          draft.slotItems[index] = {
            ...createEmptySlotState(),
            photoId: draft.slotItems[index]?.photoId ?? null,
          };
        });
      },
      removePhotoReferences: (photoId) => {
        get().commit((draft) => {
          draft.slotItems = draft.slotItems.map((item) =>
            item.photoId === photoId
              ? {
                  ...createEmptySlotState(),
                }
              : item,
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
            item.id !== id
              ? item
              : item.type === 'text'
                ? {
                    ...item,
                    ...(patch as Partial<typeof item>),
                  }
                : item.type === 'arrow'
                  ? {
                      ...item,
                      ...(patch as Partial<typeof item>),
                    }
                  : {
                      ...item,
                      ...(patch as Partial<typeof item>),
                    },
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
      partialize: (state) => ({
        present: state.present,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CollageStoreState> | undefined;
        if (!persisted?.present) {
          return currentState;
        }

        return {
          ...currentState,
          present: {
            ...currentState.present,
            ...persisted.present,
            slotItems: normalizeSlots(
              persisted.present.layoutId ?? currentState.present.layoutId,
              persisted.present.slotItems ?? currentState.present.slotItems,
            ),
            annotations: normalizeAnnotations(
              persisted.present.annotations ?? currentState.present.annotations,
            ),
          },
        };
      },
    },
  ),
);
