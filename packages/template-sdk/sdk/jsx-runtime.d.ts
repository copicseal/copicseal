/**
 * JSX 运行时类型。
 *
 * 打包（esbuild / Vite）时 `jsxImportSource` 指向 `@copicseal/template-sdk`，
 * 于是 JSX 编译成对本模块的 `jsx` / `jsxs` / `Fragment` 的引用。
 *
 * 类型检查时 tsconfig 里的 `jsxImportSource` 用的是 `react`（其 JSX 类型最完整），
 * 两者运行的是同一份 JSX 运行时，因此不冲突。这里仍做一次再导出，
 * 保证显式 `import ... from '@copicseal/template-sdk/jsx-runtime'` 也有类型。
 */
export { Fragment, jsx, jsxs } from 'react/jsx-runtime';
