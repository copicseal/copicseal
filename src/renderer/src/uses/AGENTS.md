# 组合式函数目录

**OVERVIEW**: 渲染进程组合式函数模块，5个 composable 驱动图像处理任务。

**WHERE TO LOOK**:
- `co-pic.ts` — 图像处理核心 composable
- `common.ts` — 共享工具函数
- `config.ts` — 配置管理
- `export.ts` — 桶文件导出
- `progress.ts` — 进度追踪

**CONVENTIONS**:
- use- 前缀命名
- 显式返回类型
- 最小化公共 API
- 无导入时副作用

**ANTI-PATTERNS**:
- ❌ 顶层副作用（I/O、计时器）
- ❌ 逻辑重复
- ❌ 内部 helper 错误导出
- ❌ 全局可变状态耦合