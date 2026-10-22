import { Grid3x3, LayoutTemplate, type LucideIcon } from 'lucide-react';
import { type AppRoute, toolRoute } from '@/app/routes';
import { TOOLS } from '@/features/tools/registry';
import type { MessageKey } from '@/shared/i18n';

/**
 * 侧栏与「更多功能」面板共用的入口模型。
 *
 * 一级页面（边框水印、拼图）和小功能工具都收敛成同一种形状，两个界面才不用各写一份
 * 「哪些入口存在、叫什么、点去哪儿」——侧栏只负责渲染可见项，面板只负责开关。
 */
export interface NavEntry {
  /** 稳定 id：写进配置（小功能进 `tools.enabled`，可隐藏页面进 `tools.hidden`） */
  id: string;
  route: AppRoute;
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  icon: LucideIcon;
  /**
   * - `page`：一级页面，由 `app.tsx` 直接渲染
   * - `tool`：小功能，页面按需懒加载（`/tools/<id>`）
   */
  kind: 'page' | 'tool';
  /** 能否从侧栏隐藏：边框水印是主界面，固定显示 */
  hideable: boolean;
}

/**
 * 常驻页面入口。
 *
 * 顺序即侧栏顺序：边框水印在最上（主界面），拼图其次。
 * 「边框水印」`hideable: false`——它是应用的主界面，隐藏后就没有默认落地页了。
 */
export const CORE_NAV_ENTRIES: readonly NavEntry[] = [
  {
    id: 'template',
    route: '/template',
    nameKey: 'common.nav.template',
    descriptionKey: 'common.nav.templateDescription',
    icon: LayoutTemplate,
    kind: 'page',
    hideable: false,
  },
  {
    id: 'collage',
    route: '/collage',
    nameKey: 'common.nav.collage',
    descriptionKey: 'common.nav.collageDescription',
    icon: Grid3x3,
    kind: 'page',
    hideable: true,
  },
];

/**
 * 全部入口：常驻页面在前、小功能按注册表顺序在后。
 *
 * 面板的「未显示入口」按这个顺序列出；侧栏只渲染其中可见的那部分。
 */
export const NAV_ENTRIES: readonly NavEntry[] = [
  ...CORE_NAV_ENTRIES,
  ...TOOLS.map(
    (tool): NavEntry => ({
      id: tool.id,
      route: toolRoute(tool.id),
      nameKey: tool.nameKey,
      descriptionKey: tool.descriptionKey,
      icon: tool.icon,
      kind: 'tool',
      hideable: true,
    }),
  ),
];

/** 侧栏 / 面板的显隐设置，存储落在 `config.tools`。 */
export interface NavSettings {
  /** 已启用的小功能 id，顺序即侧栏顺序（`config.tools.enabled`） */
  enabledTools: string[];
  /** 被隐藏的可隐藏入口 id（`config.tools.hidden`，目前只有 `collage`） */
  hiddenEntries: string[];
}

/**
 * 配置里还没有 `tools` 段时套用的默认值。
 *
 * 常驻页面**默认全部显示**（隐藏列表为空），小功能按注册表自带的 `defaultEnabled`；
 * 这样老配置升级上来也不会突然少一个入口。
 */
export const DEFAULT_NAV_SETTINGS: NavSettings = {
  enabledTools: TOOLS.filter((tool) => tool.defaultEnabled).map((tool) => tool.id),
  hiddenEntries: [],
};

/** 按 id 取入口；配置里残留的旧 id 会拿到 undefined（忽略而不是报错）。 */
export function findNavEntry(id: string): NavEntry | undefined {
  return NAV_ENTRIES.find((entry) => entry.id === id);
}

/**
 * 侧栏实际显示的入口。
 *
 * 顺序固定为「边框水印 → 拼图（未隐藏时）→ 已启用的小功能」：
 * 小功能的顺序听配置，常驻页面的顺序听 `CORE_NAV_ENTRIES`，用户隐藏再恢复不会把它挪到最后。
 */
export function visibleNavEntries({ enabledTools, hiddenEntries }: NavSettings): NavEntry[] {
  // 不可隐藏的入口（边框水印）连配置里写了也要无视：手改配置不该把主界面弄丢
  const core = CORE_NAV_ENTRIES.filter(
    (entry) => !entry.hideable || !hiddenEntries.includes(entry.id),
  );
  const tools = enabledTools
    .map((id) => findNavEntry(id))
    .filter((entry): entry is NavEntry => entry?.kind === 'tool');

  return [...core, ...tools];
}
