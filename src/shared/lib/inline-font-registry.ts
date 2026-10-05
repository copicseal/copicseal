import type { ImportedFont } from '@/platform/contracts';

/**
 * 「已引入的字体文件」登记表：族名 → 它在工作区里的文件。
 *
 * 导出时要把画布上的字体内联进快照，而快照只认族名；平台层的导出服务需要据此找回
 * 文件去做子集化。放在 shared 是为了让 feature（字体库）写、platform（导出）读，
 * 两边都不必反向依赖对方。
 */
const importedFamilies = new Map<string, { workspace: string; fileName: string }>();

export interface ImportedFontLocation {
  workspace: string;
  fileName: string;
}

/** 全量替换登记表；字体库每次读到配置后调用一次。 */
export function setImportedFontRegistry(workspace: string, fonts: readonly ImportedFont[]): void {
  importedFamilies.clear();

  if (!workspace) {
    return;
  }

  for (const font of fonts) {
    importedFamilies.set(font.family, { workspace, fileName: font.file_name });
  }
}

/** 按族名查导入字体的位置；不是导入字体时返回 null。 */
export function findImportedFont(family: string): ImportedFontLocation | null {
  return importedFamilies.get(family) ?? null;
}
