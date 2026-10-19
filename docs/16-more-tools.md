# 更多功能（小工具面板）

## 1. 定位

左侧导航栏的 **更多功能** 图标打开一个面板，用来收纳「不值得占一个一级入口、但偶尔要用」的小工具。
面板结构参考常见客户端：

```txt
更多功能                                    [管理]
已添加功能
  ┌──────┐ ┌──────┐
  │ 快门数 │ │  …   │
  └──────┘ └──────┘
未添加功能
  ┌──────┐ ┌──────┐
  │  …   │ │  …   │
  └──────┘ └──────┘
```

- **管理** 切换管理态：管理态下点格子就在两边来回移动（启用 / 停用），格子右上角显示 `+` / `−`
- **已添加的功能会出现在左侧导航栏**（与「边框」「拼图」同级），点进去是**独立页面** `/tools/<id>`
  （`tool-page.tsx`，带自己的窗口头与滚动容器）；面板非管理态点格子＝直接进入该页面，
  面板本身只做「加 / 减」，不在这里展开功能内容

## 2. 数据与状态

| 位置 | 内容 |
|------|------|
| `config.tools.enabled` | 已添加（启用）的功能 id 数组，**顺序即展示顺序** |
| `src/features/tools/registry.ts` | 功能注册表（静态）：id、名称/说明文案 key、图标、默认启用状态、懒加载入口 |
| `useTemplateStore` | `enabledTools` / `setEnabledTools`：面板与侧栏共享的镜像 |

约定：

- 配置里**没有** `tools` 段（老配置）→ 按注册表里的 `defaultEnabled` 渲染，且**不写回配置**；只有用户真的动过开关才落盘
- 配置里出现注册表已不存在的 id → 前端忽略（不报错、不丢数据）
- Rust 侧只存字符串数组（`ToolConfig`），不认识具体功能，因此新增功能**不需要改 Rust**

## 3. 新增一个功能

1. 在 `src/features/tools/registry.ts` 里加一条：`id`、`nameKey` / `descriptionKey`（i18n）、`icon`、`defaultEnabled`、`load`
2. 实现 `load()` 指向的组件，签名是 `({ onBack }: ToolViewProps) => ReactNode`
3. `load()` 必须**动态 import** 重依赖；主包不能带上它们
4. 需要新的配置项时，走 `config.<section>` + Rust 镜像（照 `devices` / `logos` / `tools` 的写法）

## 4. 快门数查询（第一个功能）

### 4.1 解析器抽象

```ts
interface ShutterCountProvider {
  id: string;
  label: string;                                  // 展示在结果里的「解析器」
  isAvailable(): Promise<boolean>;
  read(input: { bytes?: Uint8Array; path?: string; fileName: string }): Promise<ShutterCountResult>;
}
```

- 目前只有一个实现：`providers/native-exiftool.ts`，调用 Rust 的 `exiftool.rs`
- 「用哪一份 ExifTool」由 Rust 侧统一决定：**插件目录里装了的优先，没装才用系统自带的**
- 结果是结构化的：相机型号、快门数、取自哪个标签、其它字段、以及实际使用的解析器名

> 这里曾经内置一份 ExifTool **WASM** 版作为兜底（不依赖系统是否装了 exiftool），
> 但它给应用带来约 24 MB 的 wasm 资源，而桌面端本就有原生替代 —— 已移除。
> 网页端因此暂时没有 EXIF 读取能力（`web-exif-adapter.ts` 返回空 EXIF），当前以桌面端为主。

### 4.2 取值口径

候选标签按「语义最准确 → 最次」排序，取第一个有值的（`tags.ts`，两个入口共用同一套口径）：

```txt
ShutterCount → ShutterCount2 → ShutterCount3 → MechanicalShutterCount
             → ShutterActuations → ImageNumber
```

- 传给 ExifTool 的参数是 `-json -n -<标签>…`（`-n` 保证数值不被格式化成「1,234」这种字符串）
- 读不到时 `shutterCount` 为 `null`：界面显示「这个文件里没有快门数字段」并解释常见原因，
  **不允许用 0 顶替**

### 4.3 文件的两种入口

| 入口 | 拿到的东西 | 走哪条路 |
|------|------------|----------|
| 原生「选择相机文件」对话框（桌面端） | **磁盘路径** | 原生 ExifTool（也能读 RAW） |
| 拖放 / 网页文件选择 | 只有 `File` 字节 | 网页端回落到文件选择；桌面端的拖放走 Tauri 原生事件拿路径 |

> 拖放必须用 Tauri 的 `onDragDropEvent`：webview 里的 HTML5 drag/drop 会被原生拖放截走
> （见 `use-asset-drag-store` 的注释与 parity 清单）。`CoDropZone` 的 `onPathsDrop` 就是这条通道，
> 两端的拖放高亮共用同一份状态。

### 4.4 失败语义

| 情况 | 行为 |
|------|------|
| 照片被编辑 / 二次导出 / 手机拍摄 | 提示「没有快门数字段」+ 常见原因，不报错 |
| 没有可用的 ExifTool（系统与插件都没有） | 提示去「设置 → 插件」安装；网页端则是「不可用」 |
| 文件超过 100 MB | 直接拒绝（整份文件要进 JS 内存） |
| 解析抛错 | 显示可读错误 + 保留「换一个文件」入口 |

## 5. 批量改文件名

把目录里的文件按某个依据排好序，再重排成连续编号（`a1, a3, a6` → `b1, b2, b3`）。

### 5.1 排序依据

| 依据 | 口径 | 备注 |
|------|------|------|
| 修改时间 | 文件系统的 `modified` | 最通用 |
| 创建时间 | `created`，取不到时回落到修改时间 | 部分文件系统没有创建时间 |
| 文件名 | 字典序（`a1, a10, a3` → `a1, a10, a3`） | 想按"自然序"排时应该用这个再手工调规则 |
| 拍摄时间 | EXIF 的 `DateTimeOriginal` | 读不到的**统一排在后面**，组内按修改时间 |

> 拍摄时间的比较用规范化串 `YYYYMMDDHHMMSS`（字典序即时间序），**不与毫秒时间戳混比**：
> 有 EXIF 的按拍摄时间排，没有的另成一组，否则两种单位混在一个键里会整体错位。

升序 / 降序对分组同样生效（降序时"没有拍摄时间"的组会排到最前）。

### 5.2 命名规则

模板支持四个变量，渲染在前端完成（日期要用**本地时区**，文件修改时间靠 JS 的 `Date` 格式化）：

```txt
{n}      序号（位数用界面上的「位数」字段）
{n:3}    序号，至少 3 位、不足补零 → 001（最主流的写法；{n:03} 等价，前导零按 C 习惯忽略）
{00n}    同样意思的所见即所得写法：写几个 0 就是几位（{00n} → 001，{000n} → 0001）
{name}   原文件名（不含扩展名）
{date}   YYYYMMDD（优先拍摄时间，回退修改时间）
{time}   HHMMSS
```

不采用 `%03d`（printf 风格）：和 `{…}` 模板混在一起容易看错，且不像同一套语法。

内置「常用规则」（只读，代码里维护，见 `batch-rename/naming.ts`）：顺序编号、IMG_ 编号、
DSC_ 编号、日期_编号、日期_时间_编号、原名_编号。

用户可以把当前规则和排序一起**保存**成自己的规则（`config.rename.presets`），也能删除；
内置规则不占配置，也不可改。

### 5.3 安全边界（Rust `rename.rs`）

| 环节 | 做法 |
|------|------|
| 预览 | 前端生成 `旧名 → 新名`；能看出的问题（空名字、含路径分隔符、目标重复）当场标红 |
| 执行前校验 | Rust 侧再查一遍：目标重复、目标被**集合外**的文件占用（大小写不敏感）→ 有冲突就**一个都不改** |
| 环状改名 | `a→b, b→c` 用**临时名两阶段**，不会互相覆盖 |
| 单条失败 | 收集到 `failed`（文件名 + 原因），其余继续，并在提示里点名 |
| 撤销 | 保留本次成功的 `(from, to)`，反向执行；**只在本次会话内有效** |
| 范围 | 只处理**当前目录一层**，不递归；只改名，不改内容、不改扩展名 |

网页端没有本地文件权限，整条链路不可用（`platformRuntime` 的 web 实现直接报错）。

## 6. 相关文件

| 区域 | 文件 |
|------|------|
| 注册表 | `src/features/tools/registry.ts` |
| 功能页面 | `src/features/tools/tool-page.tsx`；路由 `src/app/routes.ts`（`/tools/<id>`）与 `src/app/app.tsx` 的 `renderPage` |
| 面板（管理入口） | `src/features/tools/more-tools-dialog.tsx` |
| 开关持久化 | `src/features/tools/lib/tool-settings.ts`、`config.tools`（Rust `ToolConfig`） |
| 快门数 | `src/features/tools/shutter-count/{provider.ts,tags.ts,shutter-count-view.tsx}`、`providers/native-exiftool.ts` |
| 批量改名 | `src/features/tools/batch-rename/{naming.ts,batch-rename-view.tsx}`、Rust `rename.rs`、`config.rename`（`RenameConfig`） |
| 组件（插件）能力 | `src/shared/lib/components.ts`（`findComponent` / `isComponentReady`）、Rust `plugin.rs` + `exiftool.rs` |
| 入口 | `src/shared/components/co-sidebar.tsx` |
