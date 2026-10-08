# i18n（多语言）

目前支持 **简体中文（zh-CN，真相来源）** 与 **English（en-US）**，另外可把语言偏好设成
**跟随系统**（`system`），启动时按 `navigator.language` 解析，认不出就回落简中。

## 目录

```
src/shared/i18n/
├── types.ts            语言类型、语言下拉取值、system → 实际语言的解析
├── translate.ts        字典类型（Messages / MessageKey）、translate() 与插值
├── i18n-provider.tsx   I18nProvider、useI18n()、useTranslate()
├── README.md           本文件
└── messages/
    ├── zh-CN/index.ts  聚合各命名空间
    ├── zh-CN/<ns>.ts   中文文案（真相来源）
    ├── en-US/index.ts  聚合 + 就地标注 `Messages`（漏翻/结构不一致直接编译报错）
    └── en-US/<ns>.ts   英文文案（必须与中文同型）
```

## 命名空间与归属

| 命名空间 | 覆盖范围 |
|---|---|
| `common` | `src/shared/**`（跨模块复用的按钮、字段、空状态等） |
| `app` | `src/app/**`：窗口外壳、路由、更新提示、全局错误 |
| `settings` | `src/features/settings/**` |
| `collage` | `src/features/collage/**` |
| `template` | `src/features/template/**`（导出面板与预设菜单除外） |
| `templateExport` | 模板导出面板、导出档位与预设菜单 |
| `fonts` | `src/features/fonts/**` |

## 怎么写

```tsx
const t = useTranslate();

<Button>{t('collage.toolbar.select')}</Button>
<span>{t('collage.assets.selected', { count: photos.length })}</span>
```

- **key 由字典推导**（`MessageKey`）：写错 key、漏翻、结构与中文不一致，`tsc` 都会报错
- **插值**用 `{name}`，参数名与模板里的名字对应：`'已放入 {count} 张'` → `t(key, { count: 3 })`
- **英文自己写通顺句子**，不要逐字直译；复数直接写成 `{count} photos`，本项目不做复数变形
- **不翻译**：代码注释、`console.*`、测试 id、CSS 类名、用户数据（文件名、字体名、用户起的预设名）
- **模板元数据**（模板名、参数选项标签）走 `nameKey` / `labelKey` 这类可选字段：有 key 时用 `t(key)`，
  没有就回落到字面量，这样模板作者仍可直接写死中文
- **日期与数字**：用 `Intl` 并传当前语言（`useI18n().resolved`），不要手动拼本地化格式
- 非组件代码（工具函数、导出命名）用 `translate()` / `getCurrentLanguage()`

## 切换语言

语言偏好存在配置的 `language` 字段（`system` / `zh-CN` / `en-US`）：

- 启动时 `I18nProvider` 读一次配置；读不到（Web 端、首次运行）按系统语言
- 设置 → 通用 →「语言」写配置（沿用设置页的 `patchConfig`，避免与其它设置互相覆盖）后调用
  `setLanguage()` 立即切换，同时更新 `document.documentElement.lang`

## 已知边界（有意保留中文的地方）

- **数据里的回落字面量**：`collage/layouts.ts` 的布局名、`template/templates/*.tsx` 与 `background.ts` 的
  元数据（name / description / label）都保留中文原文，旁边带 `*Key`。展示一律走 key，
  字面量只在「模板作者没写 key」时兜底，所以运行时不会露出中文
- **字体分类**：`fonts/google-fonts.ts` 的 `CATEGORY_LABELS` 是「稳定 code → 中文标签」的内部映射，
  它同时被设置页当作筛选身份（所以值本身没有本地化）。展示侧由 `settings/font-tab.tsx` 的
  `CATEGORY_LABEL_KEYS` 把中文标签映射到 `settings.fonts.category.*`，界面不会露出中文。
  **耦合提醒**：这张映射表的 key 是中文标签本身，改 `google-fonts.ts` 的分类值时要同步改它
- **字体预览的示例文本**（`Sony ILCE-7M4 … 中文示例 Aa`）：它是示例内容而不是界面文案，
  用来体现字体对中英混排的覆盖，两种语言下都保持不变
- **预设摘要**：模板预设的 `description` 是「生成那一刻」按当时语言写入配置的，
  之后切换语言不会回改历史预设（持久化结构的必然结果）
- **用户数据**：文件名、用户起的预设名、目录路径、字体族名一律不翻译

## 还没做

- Rust 侧的用户可见文案（`Result<T, String>` 错误串、窗口标题）仍是中文：需要改成错误码 + 前端映射
