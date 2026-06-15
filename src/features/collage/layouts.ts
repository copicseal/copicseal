import type { CollageLayout, CollageLayoutSlot } from '@/features/collage/types';

function slot(x: number, y: number, w: number, h: number): CollageLayoutSlot {
  return { x, y, w, h };
}

function gridSlots(cols: number, rows: number): CollageLayoutSlot[] {
  const width = 12 / cols;
  const height = 12 / rows;
  const slots: CollageLayoutSlot[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      slots.push(slot(col * width, row * height, width, height));
    }
  }

  return slots;
}

export const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id: 'solo-full', name: '单图铺满', count: 1, group: '1 张图', slots: [slot(0, 0, 12, 12)] },

  {
    id: 'two-columns',
    name: '左右均分',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 6, 12), slot(6, 0, 6, 12)],
  },
  {
    id: 'two-rows',
    name: '上下均分',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 12, 6), slot(0, 6, 12, 6)],
  },
  {
    id: 'two-left-hero',
    name: '左大右小',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 8, 12), slot(8, 0, 4, 12)],
  },
  {
    id: 'two-right-hero',
    name: '左小右大',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 4, 12), slot(4, 0, 8, 12)],
  },
  {
    id: 'two-top-hero',
    name: '上大下小',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 12, 8), slot(0, 8, 12, 4)],
  },
  {
    id: 'two-bottom-hero',
    name: '上小下大',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 12, 4), slot(0, 4, 12, 8)],
  },

  { id: 'three-columns', name: '三列均分', count: 3, group: '3 张图', slots: gridSlots(3, 1) },
  { id: 'three-rows', name: '三行均分', count: 3, group: '3 张图', slots: gridSlots(1, 3) },
  {
    id: 'three-top-hero',
    name: '上大下双',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 12, 7), slot(0, 7, 6, 5), slot(6, 7, 6, 5)],
  },
  {
    id: 'three-bottom-hero',
    name: '上双下大',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 6, 5), slot(6, 0, 6, 5), slot(0, 5, 12, 7)],
  },
  {
    id: 'three-left-hero',
    name: '左大右双',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 7, 12), slot(7, 0, 5, 6), slot(7, 6, 5, 6)],
  },
  {
    id: 'three-right-hero',
    name: '左双右大',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 5, 6), slot(0, 6, 5, 6), slot(5, 0, 7, 12)],
  },
  {
    id: 'three-step',
    name: '阶梯拼接',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 8, 7), slot(8, 0, 4, 6), slot(0, 7, 12, 5)],
  },
  {
    id: 'three-window',
    name: '橱窗拼接',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 4, 12), slot(4, 0, 4, 6), slot(8, 0, 4, 12)],
  },

  { id: 'four-grid', name: '2×2 网格', count: 4, group: '4 张图', slots: gridSlots(2, 2) },
  { id: 'four-columns', name: '四列长条', count: 4, group: '4 张图', slots: gridSlots(4, 1) },
  { id: 'four-rows', name: '四行长条', count: 4, group: '4 张图', slots: gridSlots(1, 4) },
  {
    id: 'four-top-hero',
    name: '上大下三',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 12, 6), slot(0, 6, 4, 6), slot(4, 6, 4, 6), slot(8, 6, 4, 6)],
  },
  {
    id: 'four-bottom-hero',
    name: '上三下大',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 4, 6), slot(4, 0, 4, 6), slot(8, 0, 4, 6), slot(0, 6, 12, 6)],
  },
  {
    id: 'four-left-hero',
    name: '左大右三',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 7, 12), slot(7, 0, 5, 4), slot(7, 4, 5, 4), slot(7, 8, 5, 4)],
  },
  {
    id: 'four-right-hero',
    name: '左三右大',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 5, 4), slot(0, 4, 5, 4), slot(0, 8, 5, 4), slot(5, 0, 7, 12)],
  },
  {
    id: 'four-center-stage',
    name: '中心海报',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 4, 6), slot(4, 0, 4, 12), slot(8, 0, 4, 6), slot(0, 6, 4, 6)],
  },
  {
    id: 'four-strip-top',
    name: '头图拼条',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 8, 8), slot(8, 0, 4, 4), slot(8, 4, 4, 4), slot(0, 8, 12, 4)],
  },
  {
    id: 'four-strip-left',
    name: '侧栏拼条',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 8, 8), slot(0, 8, 4, 4), slot(4, 8, 4, 4), slot(8, 0, 4, 12)],
  },

  { id: 'five-columns', name: '五列均分', count: 5, group: '5 张图', slots: gridSlots(5, 1) },
  { id: 'five-rows', name: '五行均分', count: 5, group: '5 张图', slots: gridSlots(1, 5) },
  {
    id: 'five-top-two-bottom-three',
    name: '上二下三',
    count: 5,
    group: '5 张图',
    slots: [
      slot(0, 0, 6, 6),
      slot(6, 0, 6, 6),
      slot(0, 6, 4, 6),
      slot(4, 6, 4, 6),
      slot(8, 6, 4, 6),
    ],
  },
  {
    id: 'five-top-three-bottom-two',
    name: '上三下二',
    count: 5,
    group: '5 张图',
    slots: [
      slot(0, 0, 4, 6),
      slot(4, 0, 4, 6),
      slot(8, 0, 4, 6),
      slot(0, 6, 6, 6),
      slot(6, 6, 6, 6),
    ],
  },
  {
    id: 'five-left-hero',
    name: '左大四宫',
    count: 5,
    group: '5 张图',
    slots: [
      slot(0, 0, 7, 12),
      slot(7, 0, 5, 3),
      slot(7, 3, 5, 3),
      slot(7, 6, 5, 3),
      slot(7, 9, 5, 3),
    ],
  },
  {
    id: 'five-right-hero',
    name: '右大四宫',
    count: 5,
    group: '5 张图',
    slots: [
      slot(0, 0, 5, 3),
      slot(0, 3, 5, 3),
      slot(0, 6, 5, 3),
      slot(0, 9, 5, 3),
      slot(5, 0, 7, 12),
    ],
  },
  {
    id: 'five-center-hero',
    name: '中心主图',
    count: 5,
    group: '5 张图',
    slots: [
      slot(0, 0, 4, 6),
      slot(4, 0, 4, 12),
      slot(8, 0, 4, 6),
      slot(0, 6, 4, 6),
      slot(8, 6, 4, 6),
    ],
  },
  {
    id: 'five-poster',
    name: '海报式',
    count: 5,
    group: '5 张图',
    slots: [
      slot(0, 0, 8, 7),
      slot(8, 0, 4, 4),
      slot(8, 4, 4, 3),
      slot(0, 7, 4, 5),
      slot(4, 7, 8, 5),
    ],
  },

  { id: 'six-grid', name: '3×2 网格', count: 6, group: '6 张图', slots: gridSlots(3, 2) },
  { id: 'six-grid-tall', name: '2×3 网格', count: 6, group: '6 张图', slots: gridSlots(2, 3) },
  { id: 'six-columns', name: '六列均分', count: 6, group: '6 张图', slots: gridSlots(6, 1) },
  { id: 'six-rows', name: '六行均分', count: 6, group: '6 张图', slots: gridSlots(1, 6) },
  {
    id: 'six-top-hero',
    name: '上大下五',
    count: 6,
    group: '6 张图',
    slots: [
      slot(0, 0, 12, 5),
      slot(0, 5, 3, 7),
      slot(3, 5, 3, 7),
      slot(6, 5, 2, 7),
      slot(8, 5, 2, 7),
      slot(10, 5, 2, 7),
    ],
  },
  {
    id: 'six-bottom-hero',
    name: '上五下大',
    count: 6,
    group: '6 张图',
    slots: [
      slot(0, 0, 2, 7),
      slot(2, 0, 2, 7),
      slot(4, 0, 2, 7),
      slot(6, 0, 2, 7),
      slot(8, 0, 4, 7),
      slot(0, 7, 12, 5),
    ],
  },
  {
    id: 'six-left-strip',
    name: '左栏拼接',
    count: 6,
    group: '6 张图',
    slots: [
      slot(0, 0, 4, 12),
      slot(4, 0, 4, 4),
      slot(8, 0, 4, 4),
      slot(4, 4, 4, 4),
      slot(8, 4, 4, 4),
      slot(4, 8, 8, 4),
    ],
  },
  {
    id: 'six-right-strip',
    name: '右栏拼接',
    count: 6,
    group: '6 张图',
    slots: [
      slot(8, 0, 4, 12),
      slot(0, 0, 4, 4),
      slot(4, 0, 4, 4),
      slot(0, 4, 4, 4),
      slot(4, 4, 4, 4),
      slot(0, 8, 8, 4),
    ],
  },

  { id: 'nine-grid', name: '3×3 网格', count: 9, group: '9 张图', slots: gridSlots(3, 3) },
  { id: 'nine-columns', name: '九列长条', count: 9, group: '9 张图', slots: gridSlots(9, 1) },
  { id: 'nine-rows', name: '九行长条', count: 9, group: '9 张图', slots: gridSlots(1, 9) },
  {
    id: 'nine-top-banner',
    name: '头图九宫',
    count: 9,
    group: '9 张图',
    slots: [
      slot(0, 0, 12, 3),
      slot(0, 3, 4, 3),
      slot(4, 3, 4, 3),
      slot(8, 3, 4, 3),
      slot(0, 6, 3, 3),
      slot(3, 6, 3, 3),
      slot(6, 6, 3, 3),
      slot(9, 6, 3, 3),
      slot(0, 9, 12, 3),
    ],
  },
  {
    id: 'nine-focus-center',
    name: '中心焦点',
    count: 9,
    group: '9 张图',
    slots: [
      slot(0, 0, 3, 3),
      slot(3, 0, 3, 3),
      slot(6, 0, 3, 3),
      slot(9, 0, 3, 3),
      slot(0, 3, 3, 6),
      slot(3, 3, 6, 6),
      slot(9, 3, 3, 6),
      slot(0, 9, 6, 3),
      slot(6, 9, 6, 3),
    ],
  },

  { id: 'twelve-grid', name: '4×3 网格', count: 12, group: '12 张图', slots: gridSlots(4, 3) },
  { id: 'twelve-grid-tall', name: '3×4 网格', count: 12, group: '12 张图', slots: gridSlots(3, 4) },
  { id: 'twelve-columns', name: '十二列长条', count: 12, group: '12 张图', slots: gridSlots(6, 2) },
  { id: 'twelve-rows', name: '十二行长条', count: 12, group: '12 张图', slots: gridSlots(2, 6) },

  { id: 'sixteen-grid', name: '4×4 网格', count: 16, group: '16 张图', slots: gridSlots(4, 4) },
  { id: 'sixteen-wide', name: '8×2 网格', count: 16, group: '16 张图', slots: gridSlots(8, 2) },
  { id: 'sixteen-tall', name: '2×8 网格', count: 16, group: '16 张图', slots: gridSlots(2, 8) },
  { id: 'sixteen-banner', name: '横向照片墙', count: 16, group: '16 张图', slots: gridSlots(8, 2) },
];

export const COLLAGE_LAYOUT_GROUPS = Array.from(
  COLLAGE_LAYOUTS.reduce(
    (map, layout) => map.set(layout.group, [...(map.get(layout.group) ?? []), layout]),
    new Map<string, CollageLayout[]>(),
  ),
).map(([group, layouts]) => ({ group, layouts }));

export const COLLAGE_LAYOUT_COUNT = COLLAGE_LAYOUTS.length;
