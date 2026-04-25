# 工具函数目录

**OVERVIEW**: 渲染进程工具函数模块，7个文件提供图片处理、EXIF解析等辅助功能。

**WHERE TO LOOK**:
- `co-pic.tsx` — 图片处理核心逻辑
- `common.ts` — 通用帮助函数
- `element.ts` — Element Plus 相关工具
- `exif.ts` — EXIF 元数据解析
- `render.ts` — 渲染相关工具
- `sfc.ts` — 单文件组件工具
- `storage.ts` — 本地存储工具

**CONVENTIONS**:
- TypeScript 类型显式声明
- Named exports 优先
- 无副作用导入
- 纯函数设计

**ANTI-PATTERNS**:
- ❌ 导入时执行 I/O 操作
- ❌ 循环依赖
- ❌ 全局状态耦合
- ❌ 同步 I/O 在热路径