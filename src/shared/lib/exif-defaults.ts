import type { ExifFieldMapping } from '@/platform';

/**
 * EXIF 默认值：
 *
 * 放在 shared 而不是 feature 里，是因为它同时被两处需要——`features/template` 的渲染侧
 * （格式化、设置页）与 `platform/providers` 的 Web 端默认配置。平台层不能反向依赖功能层。
 */

/** 拍摄时间的默认格式串。 */
export const EXIF_DATE_DEFAULT = 'YYYY-MM-DD HH:mm:ss';

/**
 * 内置显示映射 = 旧版内置规则的逐条搬运，也是新装用户 `exif.mappings` 的默认值。
 *
 * 与 Rust 侧 `config::default_exif_mappings()` 必须保持一致（两边改动要同步）。
 */
export const DEFAULT_EXIF_MAPPINGS: readonly ExifFieldMapping[] = [
  // 机型：把厂商标记换成惯用符号，或剥掉冗余前缀（`ILCE-7M4` → `α7M4`）
  { field: 'model', match: 'ILCE-', replace: 'α' },
  { field: 'model', match: 'NIKON Z ', replace: 'ℤ' },
  // 先按你说的写「共享的那段 → 想要的那段」：所有 EOS 机型都走这条
  //（`Canon EOS R5` → `EOS R5`，配合 logo 那行的品牌名不会出现「Canon Canon」）
  { field: 'model', match: 'Canon EOS', replace: 'EOS' },
  // 兜底：非 EOS 的佳能机型（PowerShot / IXUS 等）照样把品牌词删掉
  { field: 'model', match: 'Canon', replace: '' },
  { field: 'model', match: 'Digital Camera', replace: '' },
  { field: 'model', match: 'PENTAX', replace: '' },
  // 品牌：统一展示名（Logo 选图另有内置表 + 用户自定义表，不受这里影响）
  { field: 'make', match: 'SONY', replace: 'Sony' },
  { field: 'make', match: 'LEICA', replace: 'Leica' },
  { field: 'make', match: 'OLYMPUS', replace: 'Olympus' },
  { field: 'make', match: 'OM', replace: 'Olympus' },
  { field: 'make', match: 'NIKON', replace: 'Nikon' },
  { field: 'make', match: 'PANASONIC', replace: 'Lumix' },
  { field: 'make', match: 'PENTAX', replace: 'PENTAX' },
  { field: 'make', match: 'RICOH', replace: 'RICOH' },
];
