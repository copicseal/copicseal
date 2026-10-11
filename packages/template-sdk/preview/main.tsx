import type { RegisteredTemplate, TemplateField } from '@copicseal/template-sdk';
import {
  Component,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { createHostSdk, HOST_REACT_VERSION } from './host-sdk';
import { defaultParamsOf, loadTemplateBundle } from './loader';
import { MOCK_EXIF, MOCK_PHOTO_URL } from './mock-data';

/** 与 docs/14 §14.4 的注册表格式一致。 */
interface RegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags?: string[];
  abi: number;
  entry: string;
  sha256: string;
  assets?: { path: string; sha256?: string }[];
}

interface Registry {
  abi: number;
  name: string;
  templates: RegistryEntry[];
}

interface Loaded {
  definition: RegisteredTemplate;
  bytes: number;
  warnings: string[];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 与宿主 `isTemplateFieldVisible` 同一规则：未声明 visibleWhen 时始终可见。 */
function isFieldVisible(field: TemplateField, params: Record<string, unknown>): boolean {
  if (!field.visibleWhen) {
    return true;
  }

  const current = params[field.visibleWhen.key];
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? field.visibleWhen.equals.includes(current)
    : false;
}

/** 远程模板可能抛错，隔离在一个 Error Boundary 里，别把整个预览页带崩。 */
class RenderBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: messageOf(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('模板渲染失败:', error, info);
  }

  componentDidUpdate(previous: { resetKey: string }) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <div className="error">模板渲染失败：{this.state.error}</div>;
    }
    return this.props.children;
  }
}

/** 由 schema 生成控件：与宿主属性面板同一套字段描述，这里不写任何模板专用表单。 */
function FieldControl({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (field.type === 'number') {
    const numeric = typeof value === 'number' ? value : field.default;
    return (
      <div className="field">
        <label htmlFor={`field-${field.key}`}>
          <span>{field.label}</span>
          <span className="mono">{numeric}</span>
        </label>
        <div className="row">
          <input
            id={`field-${field.key}`}
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.01}
            value={numeric}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <input
            type="number"
            style={{ width: 84 }}
            min={field.min}
            max={field.max}
            step={field.step}
            value={numeric}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </div>
        {field.description ? (
          <div className="muted" style={{ fontSize: 11 }}>
            {field.description}
          </div>
        ) : null}
      </div>
    );
  }

  if (field.type === 'color') {
    const text = typeof value === 'string' ? value : field.default;
    return (
      <div className="field">
        <label htmlFor={`field-${field.key}`}>
          <span>{field.label}</span>
        </label>
        <div className="row">
          <input
            id={`field-${field.key}`}
            type="color"
            value={text}
            onChange={(event) => onChange(event.target.value)}
          />
          <input
            type="text"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            className="mono"
          />
        </div>
      </div>
    );
  }

  if (field.type === 'select') {
    const text = typeof value === 'string' ? value : field.default;
    return (
      <div className="field">
        <label htmlFor={`field-${field.key}`}>
          <span>{field.label}</span>
        </label>
        <select
          id={`field-${field.key}`}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.description ? (
          <div className="muted" style={{ fontSize: 11 }}>
            {field.description}
          </div>
        ) : null}
      </div>
    );
  }

  if (field.type === 'boolean') {
    const checked = typeof value === 'boolean' ? value : field.default;
    return (
      <div className="field">
        <label className="row" style={{ justifyContent: 'flex-start' }}>
          <input
            type="checkbox"
            checked={checked}
            style={{ width: 'auto' }}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span style={{ color: 'var(--text)' }}>{field.label}</span>
        </label>
        {field.description ? (
          <div className="muted" style={{ fontSize: 11 }}>
            {field.description}
          </div>
        ) : null}
      </div>
    );
  }

  const text = typeof value === 'string' ? value : field.default;
  return (
    <div className="field">
      <label htmlFor={`field-${field.key}`}>
        <span>{field.label}</span>
      </label>
      <input
        id={`field-${field.key}`}
        type="text"
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.description ? (
        <div className="muted" style={{ fontSize: 11 }}>
          {field.description}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState(560);
  const [font, setFont] = useState('');
  const [token, setToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('registry.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as Registry;
        if (cancelled) {
          return;
        }
        setRegistry(data);
        setSelectedId((current) => current ?? data.templates[0]?.id ?? null);
      } catch (cause) {
        if (!cancelled) {
          setError(`读取 registry.json 失败：${messageOf(cause)}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const entry = useMemo(
    () => registry?.templates.find((template) => template.id === selectedId) ?? null,
    [registry, selectedId],
  );

  // 与宿主同一条载入链路：取文本 → Blob → import → 工厂注入 SDK → 形状校验
  useEffect(() => {
    if (!entry) {
      return;
    }

    let cancelled = false;
    setBusy(true);
    setError(null);
    setLoaded(null);

    void (async () => {
      try {
        const sdk = createHostSdk({ registryId: 'local', templateId: entry.id });
        const result = await loadTemplateBundle(`templates/${entry.entry}`, sdk);
        if (cancelled) {
          return;
        }
        setLoaded(result);
        setParams(defaultParamsOf(result.definition));
      } catch (cause) {
        if (!cancelled) {
          setError(messageOf(cause));
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry, token]);

  const fields = loaded?.definition.schema.fields ?? [];

  return (
    <div className="app">
      <aside className="side">
        <div className="block">
          <h2>打包产物</h2>
          <div className="mono muted">{registry?.name ?? '加载中…'}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            注册表 ABI {registry?.abi ?? '—'} · {registry?.templates.length ?? 0} 个模板
          </div>
        </div>
        <div className="block">
          {registry?.templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="item"
              aria-current={template.id === selectedId}
              onClick={() => setSelectedId(template.id)}
            >
              <div>{template.name}</div>
              <small>
                {template.id} · v{template.version}
              </small>
            </button>
          ))}
          {!registry && !error ? <div className="muted">载入中…</div> : null}
        </div>
      </aside>

      <main className="main">
        <div className="block row between">
          <div className="row">
            <span className="muted">画布基准</span>
            <input
              type="range"
              min={240}
              max={900}
              step={20}
              value={base}
              style={{ width: 160 }}
              onChange={(event) => setBase(Number(event.target.value))}
            />
            <span className="mono">{base}px</span>
          </div>
          <div className="row">
            <span className="muted">字体</span>
            <input
              type="text"
              placeholder="跟随模板默认"
              value={font}
              style={{ width: 150 }}
              onChange={(event) => setFont(event.target.value)}
            />
            <button type="button" onClick={() => setToken((value) => value + 1)}>
              重新加载
            </button>
            <button
              type="button"
              onClick={() => loaded && setParams(defaultParamsOf(loaded.definition))}
            >
              重置参数
            </button>
          </div>
        </div>

        <div className="viewport">
          {error ? <div className="error">{error}</div> : null}
          {busy ? <div className="muted">载入模板包中…</div> : null}
          {loaded && !busy ? (
            <div className="frame" style={{ '--co-base': `${base}px` } as CSSProperties}>
              <RenderBoundary resetKey={`${selectedId}|${base}|${font}|${JSON.stringify(params)}`}>
                {loaded.definition.render({
                  photoUrl: MOCK_PHOTO_URL,
                  exif: MOCK_EXIF,
                  font,
                  ...params,
                })}
              </RenderBoundary>
            </div>
          ) : null}
        </div>
      </main>

      <aside className="props">
        <div className="block">
          <h2>模板信息</h2>
          {entry ? (
            <>
              <div>{entry.name}</div>
              <div className="muted">{entry.description}</div>
              <div style={{ marginTop: 6 }}>
                {(entry.tags ?? []).map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mono muted" style={{ marginTop: 6 }}>
                id {entry.id} · v{entry.version} · abi {entry.abi}
                <br />
                author {entry.author} · license {entry.license}
                <br />
                bundle {loaded ? `${loaded.bytes} B` : '—'} · sha256 {entry.sha256.slice(0, 16)}…
              </div>
            </>
          ) : (
            <div className="muted">—</div>
          )}
          {loaded?.warnings.length ? (
            <div className="warn" style={{ marginTop: 6 }}>
              {loaded.warnings.map((warning) => (
                <div key={warning}>! {warning}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="block">
          <h2>模板参数（由 schema 生成）</h2>
          {fields.length === 0 ? <div className="muted">—</div> : null}
          {fields
            .filter((field) => isFieldVisible(field, params))
            .map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={params[field.key]}
                onChange={(next) => setParams((current) => ({ ...current, [field.key]: next }))}
              />
            ))}
          {/* 隐藏字段仍保留在原对象里（与宿主一致：值不丢，只是不显示控件） */}
          {fields.length > 0 ? (
            <div className="muted" style={{ fontSize: 11 }}>
              共 {fields.length} 个字段，当前显示{' '}
              {fields.filter((field) => isFieldVisible(field, params)).length} 个
            </div>
          ) : null}
        </div>

        <div className="block">
          <details>
            <summary className="muted">参数 JSON</summary>
            <pre className="mono">{JSON.stringify(params, null, 2)}</pre>
          </details>
          <details>
            <summary className="muted">宿主注入说明</summary>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              React {HOST_REACT_VERSION} 与 formatExifText / useImageAspect / brand 工具 均为仓库
              src/ 的真实实现，经 SDK 注入给打包产物；模板包本身不含 React。
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('缺少 #root 容器');
}

createRoot(container).render(<App />);
