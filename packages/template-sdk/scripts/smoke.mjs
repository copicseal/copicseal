import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defaultParamsOf } from '../sdk/host-validate.mjs';
import { distDir } from './lib/esbuild.mjs';
import { MOCK_EXIF, MOCK_PHOTO_URL } from './lib/mock.mjs';
import { loadHostSdkModule } from './verify.mjs';

/**
 * 冒烟渲染。
 *
 * 把打包好的模板包当成宿主那样载入（真实 React 19 + 真实宿主工具），
 * 用默认参数渲染成静态 HTML，并对内容做断言 —— 不依赖浏览器就能证明
 * 「打包产物可加载、工厂可执行、字段可用、EXIF 变量真的被替换了」。
 */

const EXPECTED = [
  // 每一条都必须出现在渲染结果里
  { text: 'data-co-photo', why: '照片句柄' },
  { text: '35mm', why: 'formatExifText 替换 {FocalLength}' },
  { text: 'f/1.8', why: 'formatExifText 替换 {FNumber}' },
  { text: 'ISO 100', why: 'formatExifText 替换 {ISO}' },
  { text: 'ILCE-7M4', why: '机型文案' },
];

/**
 * 按模板追加的断言。
 *
 * stamp 的邮戳用 CSS `url()` 遮罩，必须是**编码后**的 data URL：esbuild 的
 * `dataurl` loader 对文本不编码，原样塞进 `url()` 会因为空格与引号静默失效。
 * 断言只看编码后的前缀（样式属性里的引号会被 React 转义成 `&quot;`）。
 */
const EXPECTED_BY_ID = {
  stamp: [
    { text: 'data:image/svg+xml,%3C', why: 'CSS url() 里是编码后的 data URL' },
    { text: 'mask-image', why: '邮戳遮罩已写入样式' },
  ],
};

/** 出现即失败：没编码的 data URL 塞进 `url()` 会让遮罩静默失效。 */
const FORBIDDEN = [
  { text: 'url(data:image/svg+xml,<', why: '未编码的 data URL 不是合法的 CSS url() 值' },
];

async function main() {
  const { createNodeHostSdk, renderToStaticMarkup } = await loadHostSdkModule();
  const bundles = readdirSync(distDir).filter(
    (file) => file.endsWith('.mjs') && !file.startsWith('_'),
  );

  if (bundles.length === 0) {
    throw new Error('dist 下没有模板包：请先执行 scripts/build.mjs');
  }

  let failed = 0;

  for (const file of bundles) {
    const id = file.replace(/\.mjs$/, '');
    const mod = await import(pathToFileURL(join(distDir, file)).href);
    const sdk = createNodeHostSdk({ registryId: 'local', templateId: id });
    const definition = mod.default(sdk);
    const params = defaultParamsOf(definition);
    const html = renderToStaticMarkup(
      definition.render({ photoUrl: MOCK_PHOTO_URL, exif: MOCK_EXIF, font: '', ...params }),
    );

    const expected = [...EXPECTED, ...(EXPECTED_BY_ID[id] ?? [])];
    const missing = expected.filter((item) => !html.includes(item.text));
    const forbidden = FORBIDDEN.filter((item) => html.includes(item.text));
    const issues = [
      ...missing.map((item) => `渲染结果里找不到「${item.text}」（${item.why}）`),
      ...forbidden.map((item) => `渲染结果里出现了不该有的「${item.text}」（${item.why}）`),
    ];
    const mask = html.match(/mask-image:([^;"]*)/);
    const fieldCount = definition.schema.fields.length;

    if (issues.length > 0) {
      failed += 1;
      console.log(`✗ ${id}: ${fieldCount} 个字段`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    } else {
      console.log(`✓ ${id}: ${fieldCount} 个字段，渲染 ${html.length} 字符`);
      console.log(`    ${html.slice(0, 220).replace(/\s+/g, ' ')}…`);
      if (mask) {
        console.log(`    mask-image → ${mask[1].slice(0, 90)}…`);
      }
    }
  }

  console.log(`\n冒烟完成：${bundles.length - failed}/${bundles.length} 通过`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

await main();
