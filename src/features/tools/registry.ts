import { Gauge, type LucideIcon, Tags } from 'lucide-react';
import type { ComponentType } from 'react';
import type { MessageKey } from '@/shared/i18n';

/**
 * 小功能的统一入参。
 *
 * 功能现在是**独立页面**（侧栏图标进入），所以没有必填入参；`onBack` 只留给将来可能的
 * 内嵌场景（嵌进面板或别的页面时才有「返回」）。
 * 以后把某个功能换成插件实现（宿主与插件分属不同打包产物）时，这层接口不用变。
 */
export interface ToolViewProps {
  onBack?: () => void;
}

export interface ToolDefinition {
  /** 稳定 id：写进 `config.tools.enabled`，改名等于用户要重新添加一次 */
  id: string;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  icon: LucideIcon;
  /** 配置里还没有这个 id 时的默认状态 */
  defaultEnabled: boolean;
  /**
   * 懒加载边界：WASM 这类大依赖只在实际打开时才拉进来，主包与启动不受影响。
   * 未来换成插件实现时，这里改成「向插件宿主请求组件」即可。
   */
  load: () => Promise<{ default: ComponentType<ToolViewProps> }>;
  /**
   * 视图布局：
   * - `center`（默认）：内容整体上下居中，内容变高时从顶部排（适合「空态 + 一张结果卡」）
   * - `fill`：内容撑满可视高度，视图内部用 `flex-1` 分区（适合「列表/预览占剩余空间」，
   *   这样行数变化不会让页面高度跳动）
   */
  layout?: 'center' | 'fill';
}

/** 小功能注册表：面板按这里的顺序展示「未添加功能」。 */
export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'shutter-count',
    nameKey: 'common.tools.shutterCount.name',
    descriptionKey: 'common.tools.shutterCount.description',
    icon: Gauge,
    defaultEnabled: true,
    load: () => import('./shutter-count/shutter-count-view'),
  },
  {
    id: 'batch-rename',
    nameKey: 'common.tools.batchRename.name',
    descriptionKey: 'common.tools.batchRename.description',
    icon: Tags,
    defaultEnabled: true,
    load: () => import('./batch-rename/batch-rename-view'),
    // 预览列表吃满剩余高度：行数变化（筛扩展名）时不希望整页跟着跳
    layout: 'fill',
  },
];

/** 按 id 取功能定义；配置里残留的旧 id 会拿到 undefined（忽略而不是报错）。 */
export function findTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
