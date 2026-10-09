/**
 * JSX 运行时出口。
 *
 * 打包时 `jsxImportSource` 指向 `@copicseal/template-sdk`，编译器于是把
 * `<div/>` 编译成 `import { jsx } from '@copicseal/template-sdk/jsx-runtime'`。
 * 这里只做转发，实现全在 runtime.mjs（转发给宿主那份 React）。
 */
export { Fragment, jsx, jsxs } from './runtime.mjs';
