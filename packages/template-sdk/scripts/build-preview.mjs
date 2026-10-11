import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { distDir, labRoot, previewDir, repoRoot } from './lib/esbuild.mjs';

/**
 * 生成「打包后模板的预览」静态站点。
 *
 * 1. 把 dist 里的模板包与 registry.json 放进 preview/public（预览页运行时 fetch 它们，
 *    再用 Blob URL 动态 import —— 与宿主加载远程模板的步骤完全一致）；
 * 2. 用仓库自带的 Vite 构建预览页，产物在 preview-dist/。
 */

const publicDir = join(previewDir, 'public');
const publicTemplates = join(publicDir, 'templates');

function copyArtifacts() {
  if (!existsSync(join(distDir, 'registry.json'))) {
    throw new Error('缺少 dist/registry.json：请先执行 scripts/build.mjs');
  }

  rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(publicTemplates, { recursive: true });

  let copied = 0;
  for (const file of readdirSync(distDir)) {
    // 只放模板包；`_host-sdk.node.mjs` 是校验用的 Node 产物，不进预览
    if (file.endsWith('.mjs') && !file.startsWith('_')) {
      copyFileSync(join(distDir, file), join(publicTemplates, file));
      copied += 1;
    }
  }

  copyFileSync(join(distDir, 'registry.json'), join(publicDir, 'registry.json'));
  return copied;
}

function runVite() {
  const viteBin = join(repoRoot, 'node_modules/vite/bin/vite.js');
  if (!existsSync(viteBin)) {
    throw new Error('未找到 vite：请先在仓库根目录执行 pnpm install');
  }

  const result = spawnSync(
    process.execPath,
    [viteBin, 'build', '--config', join(previewDir, 'vite.config.mts')],
    { stdio: 'inherit', cwd: labRoot },
  );

  if (result.status !== 0) {
    throw new Error(`vite build 失败（退出码 ${result.status}）`);
  }
}

const copied = copyArtifacts();
console.log(`已复制 ${copied} 个模板包到 preview/public/templates`);

runVite();
console.log('\n预览页：preview-dist/');
console.log('看效果：node scripts/serve.mjs  然后打开 http://127.0.0.1:8790/');
