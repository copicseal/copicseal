import type { CollageLayout, CollageLayoutSlot } from './types';

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

/** 手工挑选的布局；7 张以上由 `buildAutoLayouts` 生成后合并。 */
const CURATED_LAYOUTS: CollageLayout[] = [
  {
    id: 'solo-full',
    name: '单图铺满',
    nameKey: 'collage.layouts.names.soloFull',
    count: 1,
    group: '1 张图',
    slots: [slot(0, 0, 12, 12)],
  },

  {
    id: 'two-columns',
    name: '左右均分',
    nameKey: 'collage.layouts.names.twoColumns',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 6, 12), slot(6, 0, 6, 12)],
  },
  {
    id: 'two-rows',
    name: '上下均分',
    nameKey: 'collage.layouts.names.twoRows',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 12, 6), slot(0, 6, 12, 6)],
  },
  {
    id: 'two-left-hero',
    name: '左大右小',
    nameKey: 'collage.layouts.names.twoLeftHero',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 8, 12), slot(8, 0, 4, 12)],
  },
  {
    id: 'two-right-hero',
    name: '左小右大',
    nameKey: 'collage.layouts.names.twoRightHero',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 4, 12), slot(4, 0, 8, 12)],
  },
  {
    id: 'two-top-hero',
    name: '上大下小',
    nameKey: 'collage.layouts.names.twoTopHero',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 12, 8), slot(0, 8, 12, 4)],
  },
  {
    id: 'two-bottom-hero',
    name: '上小下大',
    nameKey: 'collage.layouts.names.twoBottomHero',
    count: 2,
    group: '2 张图',
    slots: [slot(0, 0, 12, 4), slot(0, 4, 12, 8)],
  },

  {
    id: 'three-columns',
    name: '三列均分',
    nameKey: 'collage.layouts.names.threeColumns',
    count: 3,
    group: '3 张图',
    slots: gridSlots(3, 1),
  },
  {
    id: 'three-rows',
    name: '三行均分',
    nameKey: 'collage.layouts.names.threeRows',
    count: 3,
    group: '3 张图',
    slots: gridSlots(1, 3),
  },
  {
    id: 'three-top-hero',
    name: '上大下双',
    nameKey: 'collage.layouts.names.threeTopHero',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 12, 7), slot(0, 7, 6, 5), slot(6, 7, 6, 5)],
  },
  {
    id: 'three-bottom-hero',
    name: '上双下大',
    nameKey: 'collage.layouts.names.threeBottomHero',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 6, 5), slot(6, 0, 6, 5), slot(0, 5, 12, 7)],
  },
  {
    id: 'three-left-hero',
    name: '左大右双',
    nameKey: 'collage.layouts.names.threeLeftHero',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 7, 12), slot(7, 0, 5, 6), slot(7, 6, 5, 6)],
  },
  {
    id: 'three-right-hero',
    name: '左双右大',
    nameKey: 'collage.layouts.names.threeRightHero',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 5, 6), slot(0, 6, 5, 6), slot(5, 0, 7, 12)],
  },
  {
    id: 'three-step',
    name: '阶梯拼接',
    nameKey: 'collage.layouts.names.threeStep',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 8, 7), slot(8, 0, 4, 7), slot(0, 7, 12, 5)],
  },
  {
    id: 'three-window',
    name: '橱窗拼接',
    nameKey: 'collage.layouts.names.threeWindow',
    count: 3,
    group: '3 张图',
    slots: [slot(0, 0, 8, 7), slot(8, 0, 4, 12), slot(0, 7, 8, 5)],
  },

  {
    id: 'four-grid',
    name: '2x2 网格',
    nameKey: 'collage.layouts.names.fourGrid',
    count: 4,
    group: '4 张图',
    slots: gridSlots(2, 2),
  },
  {
    id: 'four-columns',
    name: '四列长条',
    nameKey: 'collage.layouts.names.fourColumns',
    count: 4,
    group: '4 张图',
    slots: gridSlots(4, 1),
  },
  {
    id: 'four-rows',
    name: '四行长条',
    nameKey: 'collage.layouts.names.fourRows',
    count: 4,
    group: '4 张图',
    slots: gridSlots(1, 4),
  },
  {
    id: 'four-top-hero',
    name: '上大下三',
    nameKey: 'collage.layouts.names.fourTopHero',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 12, 6), slot(0, 6, 4, 6), slot(4, 6, 4, 6), slot(8, 6, 4, 6)],
  },
  {
    id: 'four-bottom-hero',
    name: '上三下大',
    nameKey: 'collage.layouts.names.fourBottomHero',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 4, 6), slot(4, 0, 4, 6), slot(8, 0, 4, 6), slot(0, 6, 12, 6)],
  },
  {
    id: 'four-left-hero',
    name: '左大右三',
    nameKey: 'collage.layouts.names.fourLeftHero',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 7, 12), slot(7, 0, 5, 4), slot(7, 4, 5, 4), slot(7, 8, 5, 4)],
  },
  {
    id: 'four-right-hero',
    name: '左三右大',
    nameKey: 'collage.layouts.names.fourRightHero',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 5, 4), slot(0, 4, 5, 4), slot(0, 8, 5, 4), slot(5, 0, 7, 12)],
  },
  {
    id: 'four-center-stage',
    name: '中心海报',
    nameKey: 'collage.layouts.names.fourCenterStage',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 4, 12), slot(4, 0, 8, 6), slot(4, 6, 4, 6), slot(8, 6, 4, 6)],
  },
  {
    id: 'four-strip-top',
    name: '头图拼条',
    nameKey: 'collage.layouts.names.fourStripTop',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 8, 8), slot(8, 0, 4, 4), slot(8, 4, 4, 4), slot(0, 8, 12, 4)],
  },
  {
    id: 'four-strip-left',
    name: '侧栏拼条',
    nameKey: 'collage.layouts.names.fourStripLeft',
    count: 4,
    group: '4 张图',
    slots: [slot(0, 0, 8, 8), slot(0, 8, 4, 4), slot(4, 8, 4, 4), slot(8, 0, 4, 12)],
  },

  {
    id: 'five-columns',
    name: '五列均分',
    nameKey: 'collage.layouts.names.fiveColumns',
    count: 5,
    group: '5 张图',
    slots: gridSlots(5, 1),
  },
  {
    id: 'five-rows',
    name: '五行均分',
    nameKey: 'collage.layouts.names.fiveRows',
    count: 5,
    group: '5 张图',
    slots: gridSlots(1, 5),
  },
  {
    id: 'five-top-two-bottom-three',
    name: '上二下三',
    nameKey: 'collage.layouts.names.fiveTopTwoBottomThree',
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
    nameKey: 'collage.layouts.names.fiveTopThreeBottomTwo',
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
    nameKey: 'collage.layouts.names.fiveLeftHero',
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
    nameKey: 'collage.layouts.names.fiveRightHero',
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
    nameKey: 'collage.layouts.names.fiveCenterHero',
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
    nameKey: 'collage.layouts.names.fivePoster',
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

  {
    id: 'six-grid',
    name: '3x2 网格',
    nameKey: 'collage.layouts.names.sixGrid',
    count: 6,
    group: '6 张图',
    slots: gridSlots(3, 2),
  },
  {
    id: 'six-grid-tall',
    name: '2x3 网格',
    nameKey: 'collage.layouts.names.sixGridTall',
    count: 6,
    group: '6 张图',
    slots: gridSlots(2, 3),
  },
  {
    id: 'six-columns',
    name: '六列均分',
    nameKey: 'collage.layouts.names.sixColumns',
    count: 6,
    group: '6 张图',
    slots: gridSlots(6, 1),
  },
  {
    id: 'six-rows',
    name: '六行均分',
    nameKey: 'collage.layouts.names.sixRows',
    count: 6,
    group: '6 张图',
    slots: gridSlots(1, 6),
  },
  {
    id: 'six-top-hero',
    name: '上大下五',
    nameKey: 'collage.layouts.names.sixTopHero',
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
    nameKey: 'collage.layouts.names.sixBottomHero',
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
    nameKey: 'collage.layouts.names.sixLeftStrip',
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
    nameKey: 'collage.layouts.names.sixRightStrip',
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

  {
    id: 'nine-grid',
    name: '3x3 网格',
    nameKey: 'collage.layouts.names.nineGrid',
    count: 9,
    group: '9 张图',
    slots: gridSlots(3, 3),
  },
  {
    id: 'nine-columns',
    name: '九列长条',
    nameKey: 'collage.layouts.names.nineColumns',
    count: 9,
    group: '9 张图',
    slots: gridSlots(9, 1),
  },
  {
    id: 'nine-rows',
    name: '九行长条',
    nameKey: 'collage.layouts.names.nineRows',
    count: 9,
    group: '9 张图',
    slots: gridSlots(1, 9),
  },
  {
    id: 'nine-top-banner',
    name: '头图九宫',
    nameKey: 'collage.layouts.names.nineTopBanner',
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
    nameKey: 'collage.layouts.names.nineFocusCenter',
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

  {
    id: 'twelve-grid',
    name: '4x3 网格',
    nameKey: 'collage.layouts.names.twelveGrid',
    count: 12,
    group: '12 张图',
    slots: gridSlots(4, 3),
  },
  {
    id: 'twelve-grid-tall',
    name: '3x4 网格',
    nameKey: 'collage.layouts.names.twelveGridTall',
    count: 12,
    group: '12 张图',
    slots: gridSlots(3, 4),
  },
  {
    id: 'twelve-columns',
    name: '十二列长条',
    nameKey: 'collage.layouts.names.twelveColumns',
    count: 12,
    group: '12 张图',
    slots: gridSlots(6, 2),
  },
  {
    id: 'twelve-rows',
    name: '十二行长条',
    nameKey: 'collage.layouts.names.twelveRows',
    count: 12,
    group: '12 张图',
    slots: gridSlots(2, 6),
  },

  {
    id: 'sixteen-grid',
    name: '4x4 网格',
    nameKey: 'collage.layouts.names.sixteenGrid',
    count: 16,
    group: '16 张图',
    slots: gridSlots(4, 4),
  },
  {
    id: 'sixteen-wide',
    name: '8x2 网格',
    nameKey: 'collage.layouts.names.sixteenWide',
    count: 16,
    group: '16 张图',
    slots: gridSlots(8, 2),
  },
  {
    id: 'sixteen-tall',
    name: '2x8 网格',
    nameKey: 'collage.layouts.names.sixteenTall',
    count: 16,
    group: '16 张图',
    slots: gridSlots(2, 8),
  },

  ...buildAutoLayouts(),
];

/**
 * 把若干张图分成几行。
 *
 * 每行 2–4 张、行数取 1/2/3/4/6（都能整除 12，槽位坐标才是整数），
 * 同时避免出现只放一张图的尾行——那种布局在缩略图里很难看。
 */
/** 穷举出「和为 count、最均匀」的一组分行方案。 */
function findRows(count: number, rowCount: number): number[] | null {
  // 每行允许的张数：都能整除 12，槽位坐标才是整数
  const rowSizes = [2, 3, 4, 6];
  let best: number[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  const walk = (sizes: number[]) => {
    if (sizes.length === rowCount) {
      const total = sizes.reduce((sum, size) => sum + size, 0);
      if (total !== count) {
        return;
      }

      const average = count / rowCount;
      const variance = sizes.reduce((sum, size) => sum + (size - average) ** 2, 0);
      // 先看均匀程度，同样均匀时偏好大小行差别更小的那种
      const score = variance * 100 + (Math.max(...sizes) - Math.min(...sizes));
      if (score < bestScore) {
        bestScore = score;
        best = sizes;
      }
      return;
    }

    for (const size of rowSizes) {
      walk([...sizes, size]);
    }
  };

  walk([]);
  return best;
}

/**
 * 在若干种分行方案里挑最优的一种。
 *
 * 判据是「格子长宽比有多接近照片」：行数为 R、某行放 N 张时，格子宽高比是 R / N，
 * 越接近 1 越不容易出现又扁又长的格子。同样接近时行数少的优先。
 */
function splitRows(count: number): number[] {
  let best: number[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const rowCount of [1, 2, 3, 4, 6]) {
    if (rowCount > count || 12 % rowCount !== 0) {
      continue;
    }

    const rows = findRows(count, rowCount);
    if (!rows) {
      continue;
    }

    const score =
      rows.reduce((sum, size) => sum + Math.abs(Math.log(rowCount / size)), 0) + rowCount * 0.001;
    if (score < bestScore) {
      bestScore = score;
      best = rows;
    }
  }

  return best ?? [count];
}

/** 首行通栏时的行高分配：返回 null 表示这一行数没法用整数格子表达通栏。 */
function heroWeights(rowCount: number): number[] | null {
  if (rowCount < 2) {
    return null;
  }

  for (const hero of [6, 5, 4, 3, 2]) {
    const rest = 12 - hero;
    if (rest % (rowCount - 1) !== 0) {
      continue;
    }

    const restHeight = rest / (rowCount - 1);
    if (restHeight >= 1) {
      return [hero, ...Array.from({ length: rowCount - 1 }, () => restHeight)];
    }
  }

  return null;
}

function rowsToSlots(sizes: number[], weights?: number[]): CollageLayoutSlot[] {
  const height = 12 / sizes.length;
  const rowHeights = weights ?? sizes.map(() => height);
  const slots: CollageLayoutSlot[] = [];
  let y = 0;

  sizes.forEach((size, rowIndex) => {
    const width = 12 / size;
    for (let col = 0; col < size; col += 1) {
      slots.push(slot(col * width, y, width, rowHeights[rowIndex]));
    }
    y += rowHeights[rowIndex];
  });

  return slots;
}

/**
 * 7–20 张的布局：每个张数补「均分网格」与「主图 + 副图」两种。
 *
 * 手工枚举到这个量级不现实，这里按张数生成，槽位落在同一套 12×12 单位网格上。
 */
function buildAutoLayouts(): CollageLayout[] {
  const layouts: CollageLayout[] = [];

  for (let count = 7; count <= 20; count += 1) {
    const group = `${count} 张图`;
    const rows = splitRows(count);

    layouts.push({
      id: `auto-${count}-even`,
      name: `${count} 图均分`,
      nameKey: 'collage.layouts.names.autoEven',
      count,
      group,
      slots: rowsToSlots(rows),
    });

    const heroRows = [1, ...splitRows(count - 1)];
    const weights = heroWeights(heroRows.length);
    if (weights) {
      layouts.push({
        id: `auto-${count}-hero`,
        name: '主图 + 副图',
        nameKey: 'collage.layouts.names.autoHero',
        count,
        group,
        slots: rowsToSlots(heroRows, weights),
      });
    }
  }

  return layouts;
}

/** 按张数升序的布局库；同张数内保持手工布局在前。 */
export const COLLAGE_LAYOUTS = [...CURATED_LAYOUTS].sort((left, right) => left.count - right.count);

export const COLLAGE_LAYOUT_GROUPS = Array.from(
  COLLAGE_LAYOUTS.reduce(
    (map, layout) => map.set(layout.group, [...(map.get(layout.group) ?? []), layout]),
    new Map<string, CollageLayout[]>(),
  ),
)
  .map(([group, layouts]) => ({
    group,
    count: layouts[0]?.count ?? 0,
    layouts,
  }))
  .sort((left, right) => left.count - right.count);

export function findCollageLayout(layoutId: string): CollageLayout {
  return (
    COLLAGE_LAYOUTS.find((layout) => layout.id === layoutId) ??
    COLLAGE_LAYOUTS.find((layout) => layout.count >= 1) ??
    COLLAGE_LAYOUTS[0]
  );
}
