import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function updateCargoVersion(content, version) {
  const packageSectionPattern = /(\[package\][\s\S]*?^version\s*=\s*")([^"]+)(".*$)/m;

  if (!packageSectionPattern.test(content)) {
    throw new Error('未在 Cargo.toml 的 [package] 段中找到 version 字段');
  }

  return content.replace(packageSectionPattern, `$1${version}$3`);
}

async function main() {
  const packageJson = await readJson(packageJsonPath);
  const version = packageJson.version;

  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('package.json 中缺少有效的 version 字段');
  }

  const cargoToml = await readFile(cargoTomlPath, 'utf8');
  const tauriConfig = await readJson(tauriConfigPath);

  const nextCargoToml = updateCargoVersion(cargoToml, version);
  tauriConfig.version = version;

  await writeFile(cargoTomlPath, nextCargoToml, 'utf8');
  await writeFile(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`, 'utf8');

  console.log(`已同步版本号到 ${version}`);
}

main().catch((error) => {
  console.error('同步版本号失败:', error);
  process.exitCode = 1;
});