# Copicseal Tauri — AI Agent 知识库

**项目**：Copicseal 摄影后期批处理工具（Electron+Vue3 → Tauri+React 重构）

## 文档入口

所有业务需求、架构设计和待办清单均在 `docs/` 目录：

| 文件 | 用途 |
|------|------|
| [docs/README.md](docs/README.md) | 架构设计书主索引 |
| [docs/01-product-vision.md](docs/01-product-vision.md) | 产品定位与设计原则 |
| [docs/02-workflow.md](docs/02-workflow.md) | 核心工作流 |
| [docs/03-template-system.md](docs/03-template-system.md) | 模板系统需求 |
| [docs/04-export-system.md](docs/04-export-system.md) | 导出系统需求 |
| [docs/05-data-models.md](docs/05-data-models.md) | 数据模型与配置 |
| [docs/06-system-integration.md](docs/06-system-integration.md) | 系统集成与存储 |
| [docs/07-exif-metadata.md](docs/07-exif-metadata.md) | EXIF 元数据处理 |
| [docs/08-product-requirements.md](docs/08-product-requirements.md) | 产品需求规格 |
| [docs/TODO.md](docs/TODO.md) | 开发待办清单 |

## 项目结构

```
src/              # React 前端
src-tauri/        # Tauri Rust 后端
docs/             # 架构与需求文档
biome.json        # Lint/Format 配置
commitlint.config.js  # Commit 规范
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 |
| 前端 | React 19 + TypeScript |
| UI | shadcn/ui + Radix + Tailwind CSS 4 |
| Lint/Format | Biome + rustfmt + Clippy |
| 构建 | Vite 7 |
| 包管理 | pnpm |

## 工作原则

1. 任何代码改动前先查阅 `docs/` 中相关业务需求文档
2. 遵循 `biome.json` 中的代码风格（单引号、分号、2空格缩进）
3. 提交格式遵循 Conventional Commits（`chore:`, `feat:`, `fix:`, `docs:` 等）
4. 提交前自动执行 `biome check` + `rustfmt` + `clippy`
5. **不要自动提交代码**：除非用户明确要求，否则只修改不提交
6. **需求文档规范**：只描述新产品需要实现的功能，不提及旧项目（Electron/Vue3）的实现细节
7. **大型改动前先让用户审阅**：涉及架构、需求文档、TODO 的变更，先交给用户审阅再执行

## 代码编写规范

### React / TypeScript

| 规则 | 说明 |
|------|------|
| 组件 | 函数组件 + Hooks，不写 class 组件 |
| 类型导入 | `import type` 导入仅用作类型的模块 |
| 路径别名 | 使用 `@/` 引用 `src/` 目录 |
| 组件命名 | PascalCase（如 `CoButton`、`CoImageView`） |
| 文件名 | 一般文件统一使用小写中横线命名；导出的组件符号仍使用 PascalCase |
| Props 接口 | 以组件名 + `Props` 命名（如 `CoButtonProps`） |
| className 合并 | 使用 `@/shared/lib/utils` 中的 `cn()` 工具函数 |
| any 类型 | 尽量避免，优先使用具体类型或 `unknown` |
| const/let | 优先 `const`，确需重新赋值才用 `let` |
| 状态管理 | 全局状态用 React Context，就近提供 |
| 副作用 | 用 `useEffect`，注意清理函数 |

### Tauri / Rust

| 规则 | 说明 |
|------|------|
| 命令模块 | 每个功能域独立模块（如 `fs`, `exif`, `template`, `config`） |
| 序列化 | 前后端数据交换用 `serde` 的 `Serialize` / `Deserialize` |
| 错误处理 | Tauri command 返回 `Result<T, String>` 或自定义错误类型 |
| 命名 | 函数用 `snake_case`，Tauri command 禁止重名 |
| 状态 | 多命令共享状态用 `tauri::Manager` 管理 |

### Tailwind CSS

| 规则 | 说明 |
|------|------|
| className 排序 | 保存时由 Tailwind CSS IntelliSense 自动排序 |
| 自定义样式 | 优先用 Tailwind 原子类，避免内联 `style` |
| 主题变量 | 使用 Tailwind CSS 4 的 `@theme` 定义设计 Token |

### 通用

| 规则 | 说明 |
|------|------|
| TypeScript | 开启 strict 模式，关闭 `noUnusedLocals` / `noUnusedParameters` |
| 注释 | 复杂逻辑必加注释，公共函数必须有 JSDoc |
| 错误处理 | 不吞错误，用户可见错误需友好提示 |
| 日志 | 关键操作用 `console.log`（前端）/ `println!`（Rust）输出日志 |

## 待办：预览与导出源分离

- 当前 HEIC/HIF 导入使用 JPEG preview 以提升素材加载速度；该 preview 不应作为最终导出的唯一像素源。
- 后续优化导出链路时，导出应按需从原始素材生成临时高质量源：无损导出使用临时 PNG，JPEG 导出可使用高质量 JPEG。
- 预览与导出源分离后，清理或短期缓存临时导出源，避免长期占用缓存空间。
