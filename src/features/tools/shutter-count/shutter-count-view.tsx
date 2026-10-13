import { AlertTriangle, FileImage, Loader2 } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';
// 懒加载块里不要从 i18n 的 barrel 取**运行时**导出：Rollup 会把 barrel 与懒加载块拆到不同 chunk，
// 形成跨 chunk 循环并告警。运行时函数直接指向定义它的模块；类型是编译期擦除的，从 barrel 取无妨。
import type { MessageKey } from '@/shared/i18n';
import { useTranslate } from '@/shared/i18n/i18n-provider';
import { Button } from '@/shared/ui/button';
import type { ToolViewProps } from '../registry';
import { readShutterCount, type ShutterCountResult } from './provider';

/** 可解析的文件类型：相机直出的 JPEG/HEIC/TIFF 与各家 RAW。 */
const ACCEPT =
  '.jpg,.jpeg,.png,.heic,.heif,.tif,.tiff,.webp,.cr3,.nef,.arw,.raf,.dng,.rw2,.orf,.pef';

/** 体积上限：整份文件要进 JS 内存，超大文件先拦下来比卡死好。 */
const MAX_BYTES = 100 * 1024 * 1024;

/** 已知附带字段的文案；表里没有的（厂商特有标签）直接显示原始标签名。 */
const EXTRA_LABEL_KEYS: Record<string, MessageKey> = {
  SerialNumber: 'common.tools.shutterCount.tag.serialNumber',
  FirmwareVersion: 'common.tools.shutterCount.tag.firmware',
  FileNumber: 'common.tools.shutterCount.tag.fileNumber',
};

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * 快门数查询。
 *
 * 读的是**相机直出文件**里的 MakerNote：编辑过、二次压缩过、或手机拍的文件里通常没有这个字段，
 * 所以「读不到」是正常结果之一 —— 界面必须说清原因，而不是显示 0。
 *
 * 解析器（ExifTool + 24 MB WASM）由 `provider.ts` 按需加载，这里不要静态 import 它。
 */
export default function ShutterCountView({ onBack }: ToolViewProps) {
  const t = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ShutterCountResult | null>(null);
  const [message, setMessage] = useState('');

  const run = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setMessage('');

    if (file.size > MAX_BYTES) {
      setStatus('error');
      setMessage(t('common.tools.shutterCount.tooLarge', { limit: '100 MB' }));
      return;
    }

    setStatus('loading');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = await readShutterCount({ bytes, fileName: file.name });
      setResult(parsed);
      setStatus('done');
    } catch (error) {
      console.error('读取快门数失败:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const count = result?.shutterCount ?? null;

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-5 text-muted-foreground">
        {t('common.tools.shutterCount.hint')}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void run(file);
          }
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={status === 'loading'}
          onClick={() => inputRef.current?.click()}
        >
          <FileImage data-icon="inline-start" />
          {status === 'idle'
            ? t('common.tools.shutterCount.chooseFile')
            : t('common.tools.shutterCount.reselect')}
        </Button>
        {fileName ? (
          <span className="truncate text-[10px] text-muted-foreground" title={fileName}>
            {fileName}
          </span>
        ) : null}
      </div>

      {status === 'loading' ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t('common.tools.shutterCount.parsing')}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-medium text-destructive">
            {t('common.tools.shutterCount.readFailed')}
          </p>
          <p className="text-[10px] leading-4 break-all text-muted-foreground">{message}</p>
        </div>
      ) : null}

      {status === 'done' && result ? (
        <div className="space-y-3">
          {count === null ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {t('common.tools.shutterCount.notFoundTitle')}
                </p>
                <p className="text-[10px] leading-4 text-muted-foreground">
                  {t('common.tools.shutterCount.notFoundHint')}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">
                {t('common.tools.shutterCount.count')}
              </p>
              <p className="font-mono text-2xl leading-tight text-foreground">
                {new Intl.NumberFormat().format(count)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {result.sourceTag
                  ? t('common.tools.shutterCount.source', { tag: result.sourceTag })
                  : null}
              </p>
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
            <dt className="text-muted-foreground">{t('common.tools.shutterCount.camera')}</dt>
            <dd className="truncate text-foreground">
              {[result.make, result.model].filter(Boolean).join(' ') ||
                t('common.tools.shutterCount.unknown')}
            </dd>
            {Object.entries(result.extra)
              .filter(([key]) => key !== 'Make' && key !== 'Model')
              .map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="text-muted-foreground">
                    {EXTRA_LABEL_KEYS[key] ? t(EXTRA_LABEL_KEYS[key]) : key}
                  </dt>
                  <dd className="truncate text-foreground">{String(value)}</dd>
                </Fragment>
              ))}
            <dt className="text-muted-foreground">{t('common.tools.shutterCount.provider')}</dt>
            <dd className="text-foreground">{result.providerLabel}</dd>
          </dl>
        </div>
      ) : null}

      {onBack ? (
        <div className="flex justify-end pt-1">
          <Button type="button" variant="plain" size="sm" onClick={onBack}>
            {t('common.tools.back')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
