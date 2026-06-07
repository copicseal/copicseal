export interface RemoteTemplate {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  url: string;
}

interface Manifest {
  templates: RemoteTemplate[];
}

const REGISTRY_URL = 'https://tpl.copicseal.com/manifest.json';

export async function fetchRemoteTemplates(): Promise<RemoteTemplate[]> {
  try {
    const resp = await fetch(REGISTRY_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const manifest: Manifest = await resp.json();
    return manifest.templates || [];
  } catch (err) {
    console.warn('远程模板注册表获取失败:', err);
    return [];
  }
}
