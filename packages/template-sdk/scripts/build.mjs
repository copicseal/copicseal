import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  distDir,
  formatBytes,
  labRoot,
  loadEsbuild,
  repoAliasPlugin,
  resolveEsbuildDir,
  sdkAliasPlugin,
  templatesDir,
} from './lib/esbuild.mjs';
import { loadHostSdkModule, sha256File, verifyBundle } from './verify.mjs';

/**
 * 打包脚本。
 *
 * 1. 生成 Node 侧宿主 SDK（校验与冒烟用，React 走 external，保证只有一份实例）
 * 2. 逐个测试模板：生成入口 → esbuild 打成单文件 ESM → 写清单 → 校验
 * 3. 汇总成 registry.json（与 docs/14 的注册表格式一致）
 */

const NODE_HOST_SDK_ENTRY = join(labRoot, 'scripts/lib/host-sdk.node.ts');
const NODE_HOST_SDK_OUT = join(distDir, '_host-sdk.node.mjs');

/**
 * 静态资源内联规则：产物保持单文件，运行时不需要任何额外请求。
 *
 * - 位图走 `dataurl`（esbuild 对二进制会 base64 编码，结果在 CSS `url()` 里也安全）
 * - SVG 走 `text`：esbuild 的 `dataurl` 对文本资源**不做编码**，原样塞进
 *   `url(data:image/svg+xml,<?xml …)` 会因为里面的空格与引号失效。
 *   需要 URL 时由模板自己编码（见 templates/stamp/src/index.tsx）。
 */
const ASSET_LOADERS = {
  '.svg': 'text',
  '.png': 'dataurl',
  '.jpg': 'dataurl',
  '.jpeg': 'dataurl',
  '.webp': 'dataurl',
};

async function buildHostSdk(esbuild) {
  await esbuild.build({
    entryPoints: [NODE_HOST_SDK_ENTRY],
    outfile: NODE_HOST_SDK_OUT,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    // React 必须 external：校验脚本与 react-dom/server 要用同一份实例
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server'],
    jsx: 'automatic',
    jsxImportSource: 'react',
    logLevel: 'warning',
    plugins: [repoAliasPlugin()],
  });
}

/** 生成打包入口，保证「绑定 SDK → 暴露作者定义」这个顺序。 */
function entrySource() {
  return [
    '// 由 scripts/build.mjs 生成，请勿手改',
    "import { __bindSdk } from '@copicseal/template-sdk';",
    "import definition from './src/index.tsx';",
    '',
    'export default function createTemplate(sdk) {',
    '  __bindSdk(sdk);',
    '  return definition;',
    '}',
    '',
  ].join('\n');
}

function templateDirs() {
  return readdirSync(templatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(templatesDir, entry.name))
    .filter((dir) => existsSync(join(dir, 'template.config.json')))
    .sort();
}

async function buildTemplate(esbuild, dir) {
  const config = JSON.parse(readFileSync(join(dir, 'template.config.json'), 'utf8'));
  const entryFile = join(dir, '.build-entry.mjs');
  const bundlePath = join(distDir, `${config.id}.mjs`);

  writeFileSync(entryFile, entrySource(), 'utf8');

  try {
    await esbuild.build({
      entryPoints: [entryFile],
      outfile: bundlePath,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      // JSX 走 SDK 垫片（而不是 react），这样产物里不会留下裸说明符
      jsx: 'automatic',
      jsxImportSource: '@copicseal/template-sdk',
      splitting: false,
      treeShaking: true,
      minify: false, // 用户装的是可执行代码，不压缩便于审查
      sourcemap: false, // Blob 载入下相对 sourcemap 不生效
      legalComments: 'inline',
      define: { 'process.env.NODE_ENV': '"production"' },
      loader: ASSET_LOADERS,
      logLevel: 'warning',
      plugins: [sdkAliasPlugin()],
    });
  } finally {
    rmSync(entryFile, { force: true });
  }

  const bytes = readFileSync(bundlePath).byteLength;
  const manifest = {
    ...config,
    entry: `${config.id}.mjs`,
    sha256: sha256File(bundlePath),
    bytes,
    assets: [],
  };

  writeFileSync(
    join(distDir, `${config.id}.template.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  return { manifest, bundlePath };
}

/** 汇总注册表：字段与 docs/14 的注册表格式一致（本地不需要 assets）。 */
function writeRegistry(manifests) {
  const registry = {
    abi: 1,
    name: '本地模板注册表（SDK 实验室）',
    templates: manifests.map((manifest) => ({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      license: manifest.license,
      tags: manifest.tags ?? [],
      abi: manifest.abi,
      entry: manifest.entry,
      sha256: manifest.sha256,
      assets: manifest.assets,
    })),
  };

  writeFileSync(join(distDir, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  return registry;
}

async function main() {
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  const esbuild = await loadEsbuild();
  console.log(`esbuild ${esbuild.version}  (${resolveEsbuildDir()})`);

  await buildHostSdk(esbuild);
  const hostModule = await loadHostSdkModule();

  const manifests = [];
  let failed = 0;

  for (const dir of templateDirs()) {
    const { manifest, bundlePath } = await buildTemplate(esbuild, dir);
    const { issues, warnings, bytes } = await verifyBundle({ manifest, bundlePath, hostModule });

    if (issues.length > 0) {
      failed += 1;
      console.log(`✗ ${manifest.id}@${manifest.version} (${formatBytes(bytes)})`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    } else {
      console.log(
        `✓ ${manifest.id}@${manifest.version} (${formatBytes(bytes)})  sha256 ${manifest.sha256.slice(0, 12)}…`,
      );
    }
    for (const warning of warnings) {
      console.log(`    ! ${warning}`);
    }

    manifests.push(manifest);
  }

  const registry = writeRegistry(manifests);
  console.log(`\n注册表：dist/registry.json（${registry.templates.length} 个模板）`);
  console.log(`宿主 SDK：dist/_host-sdk.node.mjs`);

  if (failed > 0) {
    console.error(`\n${failed} 个模板未通过校验`);
    process.exitCode = 1;
    return;
  }

  console.log(
    '\n下一步：node scripts/build-preview.mjs（生成预览页）、node scripts/smoke.mjs（冒烟渲染）',
  );
}

await main();
