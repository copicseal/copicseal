import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** template-sdk/ 根目录 */
export const labRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
/** 仓库根目录（node_modules / src 都在这里） */
export const repoRoot = resolve(labRoot, '../..');
/** SDK 核心目录 */
export const sdkDir = join(labRoot, 'sdk');
/** 打包产物目录 */
export const distDir = join(labRoot, 'dist');
/** 测试模板目录 */
export const templatesDir = join(labRoot, 'templates');
/** 预览页目录 */
export const previewDir = join(labRoot, 'preview');

/**
 * 定位 esbuild。
 *
 * 仓库用 pnpm，esbuild 是 vite 的间接依赖，因此根 `node_modules/esbuild` 并不存在，
 * 真实位置在 `.pnpm/esbuild@<版本>/node_modules/esbuild`。
 */
export function resolveEsbuildDir() {
  const direct = join(repoRoot, 'node_modules/esbuild');
  if (existsSync(join(direct, 'package.json'))) {
    return direct;
  }

  const store = join(repoRoot, 'node_modules/.pnpm');
  if (existsSync(store)) {
    const hit = readdirSync(store)
      .filter((name) => name.startsWith('esbuild@'))
      .sort()
      .at(-1);
    if (hit) {
      const dir = join(store, hit, 'node_modules/esbuild');
      if (existsSync(join(dir, 'package.json'))) {
        return dir;
      }
    }
  }

  throw new Error('未找到 esbuild：请先在仓库根目录执行 pnpm install');
}

/** 载入 esbuild 的 JS API。 */
export async function loadEsbuild() {
  const dir = resolveEsbuildDir();
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const entry = join(dir, pkg.main ?? 'lib/main.js');
  const mod = await import(pathToFileURL(entry).href);
  return mod.default ?? mod;
}

/**
 * 把 SDK 说明符指向本仓库的垫片。
 *
 * 不这么做的话，打包产物会留下 `import ... from '@copicseal/template-sdk'` 这样的
 * 裸说明符 —— 宿主用 Blob URL 载入时无法解析，模板直接加载失败。
 */
export function sdkAliasPlugin() {
  const map = {
    '@copicseal/template-sdk': join(sdkDir, 'runtime.mjs'),
    '@copicseal/template-sdk/jsx-runtime': join(sdkDir, 'jsx-runtime.mjs'),
  };

  return {
    name: 'copicseal-template-sdk-alias',
    setup(build) {
      build.onResolve({ filter: /^@copicseal\/template-sdk(\/jsx-runtime)?$/ }, (args) => ({
        path: map[args.path],
      }));
    },
  };
}

/** 把 `@/x` 解析到仓库 `src/x`（仅 Node 侧工具链需要，预览页用 Vite 的 alias）。 */
export function repoAliasPlugin() {
  return {
    name: 'copicseal-repo-alias',
    setup(build) {
      build.onResolve({ filter: /^@\// }, (args) => ({
        path: resolveRepoFile(join(repoRoot, 'src', args.path.slice(2))),
      }));
    },
  };
}

/** 依次尝试常见扩展名，返回真实存在的文件。 */
function resolveRepoFile(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`无法解析仓库内模块：${base}`);
}

/** 人类可读的字节数。 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
