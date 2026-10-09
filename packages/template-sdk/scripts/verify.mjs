import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertTemplateDefinition, defaultParamsOf } from '../sdk/host-validate.mjs';
import { distDir, formatBytes } from './lib/esbuild.mjs';
import { MOCK_EXIF, MOCK_PHOTO_URL } from './lib/mock.mjs';

/** 与 docs/14 的约定一致：单包上限 8 MB。 */
const MAX_BUNDLE_BYTES = 8 * 1024 * 1024;
const HOST_SDK_BUNDLE = join(distDir, '_host-sdk.node.mjs');

/** 计算文件 sha256（清单与安装校验用的是同一算法）。 */
export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** 载入 Node 侧的宿主 SDK 包（build.mjs 会先生成它）。 */
export async function loadHostSdkModule() {
  if (!existsSync(HOST_SDK_BUNDLE)) {
    throw new Error(`缺少 ${HOST_SDK_BUNDLE}：请先执行 scripts/build.mjs`);
  }
  return import(pathToFileURL(HOST_SDK_BUNDLE).href);
}

/** 去掉注释后再做文本扫描，避免产物里的文档注释造成误判。 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * 校验一个已打包的模板。
 *
 * 静态检查（体积、裸导入、React 副本、Node 依赖、摘要）+ 运行时检查
 * （工厂能跑、定义合法、能渲染、渲染结果里有 [data-co-photo]）。
 *
 * @returns {Promise<{ issues: string[]; warnings: string[]; bytes: number }>}
 */
export async function verifyBundle({ manifest, bundlePath, hostModule }) {
  const raw = readFileSync(bundlePath, 'utf8');
  const source = stripComments(raw);
  const bytes = Buffer.byteLength(raw);
  const issues = [];
  const warnings = [];

  if (bytes > MAX_BUNDLE_BYTES) {
    issues.push(`体积超上限：${formatBytes(bytes)} > ${formatBytes(MAX_BUNDLE_BYTES)}`);
  }

  // 宿主要用 Blob URL 载入产物，任何非相对说明符都解析不了
  const bareImports =
    source.match(/(?:^|\n)\s*import\s[^;\n]*?from\s*["']([^."'][^"']*)["']/g) ?? [];
  if (bareImports.length > 0) {
    issues.push(`产物里仍有裸导入：${bareImports.slice(0, 3).join(' / ')}`);
  }

  // 只认真正的 require 调用；`x.require()` 这类成员访问不算
  if (/(?<![\w_.])require\s*\(/.test(source)) {
    issues.push('产物里出现了 require(');
  }
  // esbuild 会无条件留下一段 `var __commonJS = (cb, mod) => function __require() {...}` 兜底桩；
  // 只有它**被调用**才说明真的把 CJS 依赖打进来了（那会破坏 Blob URL 载入）
  if (/(?<!function\s)__require\(/.test(source)) {
    issues.push('产物里调用了 esbuild 的 CommonJS 兜底 __require()（疑似打进了 CJS 依赖）');
  }
  if (/\bprocess\.(env|platform|argv|versions)\b/.test(source)) {
    issues.push('产物里引用了 process');
  }
  if (/\bBuffer\./.test(source)) {
    issues.push('产物里引用了 Buffer');
  }
  if (/react\.development|__SECRET_INTERNALS|react-dom/.test(source)) {
    issues.push('产物里疑似打进了 React 副本（hooks 会失效）');
  }

  const digest = sha256File(bundlePath);
  if (manifest.sha256 && digest !== manifest.sha256) {
    issues.push('sha256 与清单不一致');
  }

  let mod = null;
  try {
    mod = await import(pathToFileURL(bundlePath).href);
  } catch (error) {
    issues.push(`产物无法 import：${error.message}`);
  }

  if (mod) {
    if (typeof mod.default !== 'function') {
      issues.push('缺少默认导出的工厂函数');
    } else {
      const sdk = hostModule.createNodeHostSdk({ registryId: 'local', templateId: manifest.id });
      let definition = null;

      try {
        definition = mod.default(sdk);
      } catch (error) {
        issues.push(`工厂执行抛错：${error.message}`);
      }

      if (definition) {
        try {
          const result = assertTemplateDefinition(definition, { templateId: manifest.id });
          warnings.push(...result.warnings);
        } catch (error) {
          issues.push(`模板定义非法：${error.message}`);
        }

        try {
          const html = hostModule.renderToStaticMarkup(
            definition.render({
              photoUrl: MOCK_PHOTO_URL,
              exif: MOCK_EXIF,
              font: '',
              ...defaultParamsOf(definition),
            }),
          );
          if (!html.includes('data-co-photo')) {
            issues.push('渲染结果里没有 [data-co-photo]（缩放与自适应会失效）');
          }
        } catch (error) {
          issues.push(`渲染抛错：${error.message}`);
        }
      }
    }
  }

  return { issues, warnings, bytes };
}

/** CLI：校验 dist 下所有已打包的模板。 */
async function main() {
  if (!existsSync(distDir)) {
    throw new Error('dist 不存在：请先执行 scripts/build.mjs');
  }

  const hostModule = await loadHostSdkModule();
  const manifests = readdirSync(distDir)
    .filter((file) => file.endsWith('.template.json'))
    .map((file) => JSON.parse(readFileSync(join(distDir, file), 'utf8')));

  if (manifests.length === 0) {
    throw new Error('dist 下没有 *.template.json：请先执行 scripts/build.mjs');
  }

  let failed = 0;
  for (const manifest of manifests) {
    const bundlePath = join(distDir, manifest.entry);
    const { issues, warnings, bytes } = await verifyBundle({ manifest, bundlePath, hostModule });
    const label = `${manifest.id}@${manifest.version} (${formatBytes(bytes)})`;

    if (issues.length > 0) {
      failed += 1;
      console.log(`✗ ${label}`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    } else {
      console.log(`✓ ${label}`);
    }
    for (const warning of warnings) {
      console.log(`    ! ${warning}`);
    }
  }

  console.log(`\n校验完成：${manifests.length - failed}/${manifests.length} 通过`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

const isCli =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  await main();
}

export { main as runVerifyCli };
