/**
 * app 命名空间的文案（en-US）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 覆盖 `src/app/**`：窗口外壳、路由与启动期的全局提示。
 */
import type { Messages } from '../../translate';

export const app: Messages['app'] = {
  update: {
    available: 'Version {version} is available',
    availableHint: 'Download and install it from Settings → About.',
  },
};
