import * as fs from 'node:fs';
import * as path from 'node:path';
import { shell } from 'electron';

/**
 * 自动判断并打开文件或文件夹：
 * - 文件：在资源管理器中高亮显示
 * - 文件夹：直接打开
 * @param targetPath 文件或文件夹的绝对路径
 */
export function openTargetPath(targetPath: string): void {
  try {
    const stat = fs.statSync(targetPath);

    if (stat.isFile()) {
      shell.showItemInFolder(path.resolve(targetPath));
    }
    else if (stat.isDirectory()) {
      shell.openPath(path.resolve(targetPath));
    }
    else {
      console.warn('路径不是文件也不是文件夹：', targetPath);
    }
  }
  catch (err) {
    console.error('路径无效或无法访问：', targetPath, err);
  }
}
