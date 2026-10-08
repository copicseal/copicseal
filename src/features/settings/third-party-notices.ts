/**
 * 第三方依赖声明。
 *
 * 只列**运行时**依赖：开发工具（构建、Lint、类型定义等）不会随应用分发，因此不出现在
 * 面向用户的声明里。license 字段取自各包元数据里的 SPDX 表达式（`cargo metadata` /
 * 各 npm 包的 `package.json`），不是手写推断的结果。
 *
 * 版本号与完整依赖树见仓库中的 `src-tauri/Cargo.lock` 与 `pnpm-lock.yaml`；
 * 依赖升级后这里只需要核对有没有新增/移除的条目。
 */

import type { MessageKey } from '@/shared/i18n';

export interface ThirdPartyNotice {
  name: string;
  license: string;
}

export interface ThirdPartyNoticeGroup {
  /** 分组标题的文案 key：软件名与许可证名不翻译，标题由调用方翻译后显示 */
  titleKey: MessageKey;
  items: ThirdPartyNotice[];
}

export const THIRD_PARTY_NOTICES: readonly ThirdPartyNoticeGroup[] = [
  {
    titleKey: 'settings.about.licenses.groups.runtimeRust',
    items: [
      { name: 'tauri', license: 'Apache-2.0 OR MIT' },
      { name: 'tauri-plugin-opener', license: 'Apache-2.0 OR MIT' },
      { name: 'tauri-plugin-updater', license: 'Apache-2.0 OR MIT' },
      { name: 'tauri-plugin-dialog', license: 'Apache-2.0 OR MIT' },
      { name: 'tauri-plugin-sql', license: 'Apache-2.0 OR MIT' },
      { name: 'serde', license: 'MIT OR Apache-2.0' },
      { name: 'serde_json', license: 'MIT OR Apache-2.0' },
      { name: 'dirs', license: 'MIT OR Apache-2.0' },
      { name: 'uuid', license: 'Apache-2.0 OR MIT' },
      { name: 'base64', license: 'MIT OR Apache-2.0' },
      { name: 'image', license: 'MIT OR Apache-2.0' },
      { name: 'zune-core', license: 'MIT OR Apache-2.0 OR Zlib' },
      { name: 'zune-jpeg', license: 'MIT OR Apache-2.0 OR Zlib' },
      { name: 'fast_image_resize', license: 'MIT OR Apache-2.0' },
      { name: 'kamadak-exif', license: 'BSD-2-Clause' },
      { name: 'rusqlite', license: 'MIT' },
      { name: 'font-kit', license: 'MIT OR Apache-2.0' },
      { name: 'allsorts', license: 'Apache-2.0' },
    ],
  },
  {
    titleKey: 'settings.about.licenses.groups.uiJavaScript',
    items: [
      { name: 'react', license: 'MIT' },
      { name: 'react-dom', license: 'MIT' },
      { name: 'radix-ui', license: 'MIT' },
      { name: '@tauri-apps/api', license: 'Apache-2.0 OR MIT' },
      { name: '@tauri-apps/plugin-dialog', license: 'MIT OR Apache-2.0' },
      { name: '@tauri-apps/plugin-opener', license: 'MIT OR Apache-2.0' },
      { name: '@tauri-apps/plugin-updater', license: 'MIT OR Apache-2.0' },
      { name: 'zustand', license: 'MIT' },
      { name: 'sonner', license: 'MIT' },
      { name: 'lucide-react', license: 'ISC' },
      { name: 'clsx', license: 'MIT' },
      { name: 'tailwind-merge', license: 'MIT' },
      { name: 'class-variance-authority', license: 'Apache-2.0' },
      { name: 'framer-motion', license: 'MIT' },
      { name: 'react-resizable-panels', license: 'MIT' },
      { name: 'react-rnd', license: 'MIT' },
      { name: '@dnd-kit/core', license: 'MIT' },
      { name: '@dnd-kit/sortable', license: 'MIT' },
      { name: '@dnd-kit/utilities', license: 'MIT' },
      { name: '@zumer/snapdom', license: 'MIT' },
      { name: '@fontsource-variable/inter', license: 'OFL-1.1' },
    ],
  },
  {
    titleKey: 'settings.about.licenses.groups.metadataWasm',
    items: [
      { name: '@uswriting/exiftool', license: 'Apache-2.0' },
      { name: '@6over3/zeroperl-ts', license: 'Apache-2.0' },
    ],
  },
];
