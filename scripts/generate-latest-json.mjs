import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * 生成 Tauri 更新清单 latest.json。
 *
 * 用法：
 *   node scripts/generate-latest-json.mjs --dist artifacts --tag v0.5.1 --version 0.5.1
 *
 * 平台键使用 `{os}-{arch}` 形式，与 Tauri 的查找顺序兼容（先 `{os}-{arch}-{installer}`，
 * 找不到再回退到 `{os}-{arch}`）。签名必须是 .sig 文件的内容，不能是路径或链接。
 */

const REQUIRED_PLATFORMS = ['windows-x86_64', 'windows-aarch64', 'darwin-x86_64', 'darwin-aarch64'];

/** 更新包在不同架构下的文件名标记。 */
function resolvePlatformKey(fileName) {
  const isWindowsInstaller = fileName.endsWith('-setup.exe');
  const isMacUpdaterBundle = fileName.endsWith('.app.tar.gz');

  if (!isWindowsInstaller && !isMacUpdaterBundle) return null;

  const isArm = /aarch64|arm64/i.test(fileName);
  const isX64 = /x86_64|x64/i.test(fileName);

  if (!isArm && !isX64) return null;

  const arch = isArm ? 'aarch64' : 'x86_64';
  return `${isWindowsInstaller ? 'windows' : 'darwin'}-${arch}`;
}

function parseArgs(argv) {
  const options = {
    dist: 'artifacts',
    repo: 'copicseal/copicseal',
    output: null,
    tag: null,
    version: null,
  };
  const keys = new Map([
    ['--dist', 'dist'],
    ['--repo', 'repo'],
    ['--output', 'output'],
    ['--tag', 'tag'],
    ['--version', 'version'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const key = keys.get(argv[index]);
    if (!key) throw new Error(`未知参数：${argv[index]}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`参数 ${argv[index]} 缺少取值`);
    options[key] = value;
    index += 1;
  }

  if (!options.tag) throw new Error('缺少 --tag（用于拼接产物下载地址）');
  if (!options.version) throw new Error('缺少 --version');

  options.output = options.output ?? path.join(options.dist, 'latest.json');
  return options;
}

/** 递归收集目录下的文件。 */
async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const distStat = await stat(options.dist).catch(() => null);
  if (!distStat?.isDirectory()) {
    throw new Error(`产物目录不存在：${options.dist}`);
  }

  const files = await collectFiles(options.dist);
  const signatureFiles = files.filter((file) => file.endsWith('.sig'));

  if (signatureFiles.length === 0) {
    console.log('::notice::未找到 .sig 签名文件，跳过 latest.json（未配置更新包签名密钥时会这样）');
    return;
  }

  const platforms = {};
  const missingArtifacts = [];

  for (const signatureFile of signatureFiles) {
    const artifactFile = signatureFile.slice(0, -'.sig'.length);
    const fileName = path.basename(artifactFile);
    const platformKey = resolvePlatformKey(fileName);

    if (!platformKey) {
      throw new Error(`无法识别的更新包文件名：${fileName}`);
    }
    if (platforms[platformKey]) {
      throw new Error(`平台 ${platformKey} 出现多个更新包：${fileName}`);
    }
    if (!files.includes(artifactFile)) {
      missingArtifacts.push(fileName);
      continue;
    }
    if (!fileName.includes(options.version)) {
      console.log(`::warning::${fileName} 的文件名不包含版本号 ${options.version}`);
    }

    const signature = (await readFile(signatureFile, 'utf8')).trim();
    if (!signature) throw new Error(`签名文件为空：${path.basename(signatureFile)}`);

    platforms[platformKey] = {
      signature,
      url: `https://github.com/${options.repo}/releases/download/${options.tag}/${encodeURIComponent(fileName)}`,
    };
  }

  if (missingArtifacts.length > 0) {
    throw new Error(`以下签名找不到对应的更新包：${missingArtifacts.join('、')}`);
  }

  const missingPlatforms = REQUIRED_PLATFORMS.filter((key) => !platforms[key]);
  if (missingPlatforms.length > 0) {
    throw new Error(`缺少以下平台的更新包：${missingPlatforms.join('、')}`);
  }

  const manifest = {
    version: options.version,
    pub_date: new Date().toISOString(),
    platforms,
  };

  await writeFile(options.output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`已生成 ${options.output}`);
  for (const [key, value] of Object.entries(platforms)) {
    console.log(`  ${key} -> ${value.url}`);
  }
}

main().catch((error) => {
  console.error('生成 latest.json 失败:', error);
  process.exitCode = 1;
});
