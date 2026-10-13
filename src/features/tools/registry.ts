import { Gauge, type LucideIcon } from 'lucide-react';
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
];

/** 按 id 取功能定义；配置里残留的旧 id 会拿到 undefined（忽略而不是报错）。 */
export function findTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
