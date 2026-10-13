// 经由包 exports 暴露的 "./zeroperl.wasm" 子路径解析 WASM 资产（深层 dist 路径未导出，无法直接导入）。
import zeroperlWasmUrl from '@6over3/zeroperl-ts/zeroperl.wasm?url';

/**
 * zeroperl 在浏览器中用页面相对路径 `fetch("./zeroperl.wasm")` 加载 WASM 引擎，
 * 该路径在 Vite（dev 与 build）下并不存在：dev 时根路径没有该文件、打包后资源名还带 hash，
 * 结果是 404 拿到 index.html，报成
 * `CompileError: WebAssembly.instantiate(): expected magic word 00 61 73 6d, found 3c 21 64 6f`（`<!do`）。
 *
 * 它的加载函数接受外部注入的 fetch（`@uswriting/exiftool` 的 `fetch` 选项一路透传），
 * 所以把那次请求改指到由 Vite 资源管线处理的 `?url` 资产地址即可。
 *
 * web 端的 EXIF 适配器（`platform/providers/web/web-exif-adapter.ts`）与「快门数查询」
 * （`features/tools/shutter-count`）共用这一份，避免两处各写一遍、日后只修一处。
 */
export function fetchZeroperlWasm(input: unknown, init?: unknown): Promise<Response> {
  const url =
    typeof input === 'string' && input.endsWith('zeroperl.wasm')
      ? zeroperlWasmUrl
      : (input as string | URL | Request);

  return fetch(url, init as RequestInit | undefined);
}
