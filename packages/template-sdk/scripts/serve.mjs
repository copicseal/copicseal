import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { labRoot } from './lib/esbuild.mjs';

/**
 * 预览页的静态服务器。
 *
 * 必须用 http 而不是 file://：预览页要 fetch 模板包文本再用 Blob URL 动态 import，
 * file:// 下会被浏览器的同源策略挡掉。
 */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

const root = resolve(labRoot, 'preview-dist');
const port = Number(process.env.PORT ?? process.argv[2] ?? 8790);

if (!existsSync(root)) {
  throw new Error('缺少 preview-dist/：请先执行 scripts/build-preview.mjs');
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const target = resolve(join(root, normalize(pathname)));
  if (target !== root && !target.startsWith(root + sep)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('forbidden');
    return;
  }

  if (!existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`not found: ${pathname}`);
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  response.end(readFileSync(target));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`预览：http://127.0.0.1:${port}/`);
  console.log('按 Ctrl+C 结束');
});
