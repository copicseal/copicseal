import { create } from 'zustand';

interface DragPayload {
  photoId: string;
  name: string;
  previewUrl: string;
}

interface CollageAssetDragState {
  /** 正在被拖动的素材；null 表示没有拖拽会话 */
  payload: DragPayload | null;
  /** 光标位置（视口坐标），用于跟随拖动的浮层 */
  x: number;
  y: number;
  /** 当前悬停的槽位序号，画布据此高亮 */
  overSlotIndex: number | null;
  begin: (payload: DragPayload, x: number, y: number) => void;
  move: (x: number, y: number, overSlotIndex: number | null) => void;
  end: () => void;
}

/**
 * 素材区 → 画布的拖拽会话。
 *
 * 这里刻意不用 HTML5 拖放：桌面端的原生拖放（Tauri 的 `onDragDropEvent`，用于把系统
 * 文件拖进素材区）会截走 webview 内的拖放事件，`dragstart` / `drop` 根本送不到 DOM，
 * 表现就是「拖不动」。改成指针事件自绘拖拽后，各平台 webview 行为一致。
 */
export const useCollageAssetDrag = create<CollageAssetDragState>((set) => ({
  payload: null,
  x: 0,
  y: 0,
  overSlotIndex: null,
  begin: (payload, x, y) => set({ payload, x, y, overSlotIndex: null }),
  move: (x, y, overSlotIndex) => set({ x, y, overSlotIndex }),
  end: () => set({ payload: null, overSlotIndex: null }),
}));
