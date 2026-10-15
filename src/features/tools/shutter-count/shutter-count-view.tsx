import { AlertTriangle, FileImage, Gauge, Loader2, Wrench } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { parseFailureReason } from '@/platform/errors';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { CoDropZone } from '@/shared/components/co-drop-zone';
// 懒加载块里不要从 i18n 的 barrel 取**运行时**导出：Rollup 会把 barrel 与懒加载块拆到不同 chunk，
// 形成跨 chunk 循环并告警。运行时函数直接指向定义它的模块；类型是编译期擦除的，从 barrel 取无妨。
import type { MessageKey } from '@/shared/i18n';
import { useTranslate } from '@/shared/i18n/i18n-provider';
import { appNavigate } from '@/shared/providers/navigation-provider';
import { usePageActive } from '@/shared/providers/page-activity-provider';
import { Button } from '@/shared/ui/button';
import type { ToolViewProps } from '../registry';
import {
  EXIFTOOL_MISSING_CODE,
  hasShutterCountProvider,
  readShutterCount,
  type ShutterCountResult,
} from './provider';

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

/** 设置页里「插件」锚点（与 `settings-page` 的 `ANCHOR_TABS`、`import-feedback` 里的一致）。 */
const PLUGIN_SETTINGS_ANCHOR = 'plugins-section';

/** 从路径里取文件名（两种分隔符都要处理） */
function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** 空态/解析中/失败共用的大卡尺寸：三种状态之间切换时页面高度不跳。 */
const STAGE_MIN_HEIGHT = 'min-h-[320px]';

/**
 * 快门数查询。
 *
 * 读的是**相机直出文件**里的 MakerNote：编辑过、二次压缩过、或手机拍的文件里通常没有这个字段，
 * 所以「读不到」是正常结果之一 —— 界面必须说清原因，而不是显示 0。
 *
 * 版式按「一眼看到数字」组织：结果态是一个铺满的大数字 hero + 下面的文件信息格子；
 * 空态是整块拖放区，避免整页只有一行小字。
 *
 * 解析器（ExifTool + 24 MB WASM）由 `provider.ts` 按需加载，这里不要静态 import 它。
 */
export default function ShutterCountView({ onBack }: ToolViewProps) {
  const t = useTranslate();
  const pageActive = usePageActive();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ShutterCountResult | null>(null);
  const [message, setMessage] = useState('');
  /** 失败原因是「系统与插件都没有 ExifTool」：界面要给一条直达插件面板的入口 */
  const [missingTool, setMissingTool] = useState(false);

  /**
   * 进页面（以及每次切回来）先探一次有没有可用的 ExifTool。
   *
   * 「没装」是**结论性**判断，不能凭一次探测就下：
   *
   * - 刚启动时后端状态可能还没就绪，`scan_installed` 读不到目录会**安静地回报「没装」**
   *   （而不是报错），一次就提示必然误报 —— 用户明明装了却看到提示
   * - 所以要求**连续两次**都明确「没有」才提示，两次之间隔 0.7 秒让后端就绪；
   *   一旦探测**抛异常**就把「连续」打断，不下结论
   * - 顺带把体感做快：只要能确认「有」立刻返回（正常情况瞬间出结果），
   *   真的没有也在约 0.7 秒内提示
   * - 装完插件切回本页时 `pageActive` 会再次变化，提示会自动消失
   */
  useEffect(() => {
    if (!pageActive) {
      return;
    }

    let cancelled = false;

    const probe = async (): Promise<boolean | null> => {
      let confirmedMissing = 0;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          if (await hasShutterCountProvider()) {
            return true;
          }

          confirmedMissing += 1;

          if (confirmedMissing >= 2) {
            return false;
          }
        } catch (error) {
          // 探测失败会把「连续没有」打断：宁可这次不提示，也不要误报
          console.warn('探测 ExifTool 可用性失败，稍后重试:', error);
          confirmedMissing = 0;
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }

      return null;
    };

    void probe().then((available) => {
      // null 表示一直没能确认：保持现状，不要误报成「没装」
      if (!cancelled && available !== null) {
        setMissingTool(!available);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pageActive]);

  /**
   * 读一份文件。两种入口：
   * - 走原生对话框拿到的是**磁盘路径** → 原生 ExifTool 可以直接用（也能读 RAW）
   * - 拖放 / 网页文件选择只有**字节** → 交给内置 WASM 解析器
   */
  const run = async (input: { file?: File; path?: string; name: string }) => {
    setFileName(input.name);
    setResult(null);
    setMessage('');
    setMissingTool(false);

    if (input.file && input.file.size > MAX_BYTES) {
      setStatus('error');
      setMessage(t('common.tools.shutterCount.tooLarge', { limit: '100 MB' }));
      return;
    }

    setStatus('loading');

    try {
      const bytes = input.file ? new Uint8Array(await input.file.arrayBuffer()) : undefined;
      const parsed = await readShutterCount({
        bytes,
        path: input.path,
        fileName: input.name,
      });
      setResult(parsed);
      setStatus('done');
    } catch (error) {
      console.error('读取快门数失败:', error);
      const failure = parseFailureReason(error);
      setStatus('error');
      setMissingTool(failure.code === EXIFTOOL_MISSING_CODE);
      setMessage(failure.message);
    }
  };

  const count = result?.shutterCount ?? null;

  /**
   * HTML5 拖入：只有字节，没有磁盘路径。
   *
   * 原生 ExifTool 必须在真实文件上跑，所以先把字节**原样落成一个临时文件**，
   * 再走与「选择文件」完全相同的链路（`run({ path })`）。
   */
  const stageDropped = async (file: File) => {
    try {
      const config = await platformRuntime.getConfig();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const path = await platformRuntime.stageDroppedFile(config.cache.directory, file.name, bytes);

      await run({ path, name: file.name });
    } catch (error) {
      console.error('拖入的文件落盘失败:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  /** 桌面端优先用原生对话框（拿路径给原生 ExifTool）；网页端或不可用时回落到 <input> */
  const choose = async () => {
    try {
      const picked = await platformRuntime.openCameraFileDialog();
      const path = Array.isArray(picked) ? picked[0] : picked;

      if (path) {
        await run({ path, name: baseName(path) });
        return;
      }
    } catch (error) {
      console.warn('原生文件对话框不可用，改用网页文件选择:', error);
    }

    inputRef.current?.click();
  };

  /** 结果态的文件信息：相机 / 附带字段 / 解析器 / 文件名，铺成两列小格子。 */
  const detailRows: Array<[string, string]> = result
    ? [
        [
          t('common.tools.shutterCount.camera'),
          [result.make, result.model].filter(Boolean).join(' ') ||
            t('common.tools.shutterCount.unknown'),
        ],
        ...Object.entries(result.extra)
          .filter(([key]) => key !== 'Make' && key !== 'Model')
          .map(([key, value]): [string, string] => [
            EXTRA_LABEL_KEYS[key] ? t(EXTRA_LABEL_KEYS[key]) : key,
            String(value),
          ]),
        [t('common.tools.shutterCount.file'), fileName || t('common.tools.shutterCount.unknown')],
        [t('common.tools.shutterCount.provider'), result.providerLabel],
      ]
    : [];

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            void run({ file, name: file.name });
          }
        }}
      />

      {status === 'idle' && missingTool ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
          <p className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            {t('common.tools.shutterCount.missingToolHint')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appNavigate('/settings', PLUGIN_SETTINGS_ANCHOR)}
          >
            <Wrench data-icon="inline-start" />
            {t('common.tools.shutterCount.installTool')}
          </Button>
        </div>
      ) : null}

      {status === 'idle' ? (
        <CoDropZone
          /*
           * HTML5 拖放只给字节，而原生 ExifTool 要在真实文件上跑：
           * 先按原样落成一个临时文件，再走和「选择文件」一样的路径。
           */
          onFilesDrop={(files) => void stageDropped(files[0])}
          className={STAGE_MIN_HEIGHT}
        >
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Gauge className="size-7" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t('common.tools.shutterCount.dropTitle')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('common.tools.shutterCount.dropHint')}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={choose}>
              <FileImage data-icon="inline-start" />
              {t('common.tools.shutterCount.chooseFile')}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              {t('common.tools.shutterCount.supported')}
            </p>
          </div>
        </CoDropZone>
      ) : null}

      {status === 'idle' ? (
        <p className="text-[11px] leading-5 text-muted-foreground">
          {t('common.tools.shutterCount.hint')}
        </p>
      ) : null}

      {status !== 'idle' ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={status === 'loading'}
            onClick={choose}
          >
            <FileImage data-icon="inline-start" />
            {t('common.tools.shutterCount.reselect')}
          </Button>
          {fileName ? (
            <span className="truncate text-[11px] text-muted-foreground" title={fileName}>
              {fileName}
            </span>
          ) : null}
        </div>
      ) : null}

      {status === 'loading' ? (
        <div
          className={`flex ${STAGE_MIN_HEIGHT} flex-col items-center justify-center gap-4 rounded-lg border border-border/80 bg-card`}
        >
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t('common.tools.shutterCount.parsing')}</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div
          className={`flex ${STAGE_MIN_HEIGHT} flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-6 text-center`}
        >
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            {t('common.tools.shutterCount.readFailed')}
          </p>
          <p className="max-w-md text-xs leading-5 break-all text-muted-foreground">
            {missingTool ? t('common.tools.shutterCount.missingToolHint') : message}
          </p>
          {missingTool ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appNavigate('/settings', PLUGIN_SETTINGS_ANCHOR)}
            >
              <Wrench data-icon="inline-start" />
              {t('common.tools.shutterCount.installTool')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {status === 'done' && result ? (
        <div className="space-y-3">
          {count === null ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-6 py-10 text-center">
              <AlertTriangle className="size-7 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {t('common.tools.shutterCount.notFoundTitle')}
              </p>
              <p className="max-w-md text-xs leading-5 text-muted-foreground">
                {t('common.tools.shutterCount.notFoundHint')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-lg border border-border/80 bg-card px-6 py-10 shadow-sm">
              <p className="text-xs tracking-wide text-muted-foreground">
                {t('common.tools.shutterCount.count')}
              </p>
              {/* 大写数字：这一页的主角，字号不跟着面板宽度走 */}
              <p className="mt-2 font-mono text-6xl leading-none tabular-nums whitespace-nowrap text-foreground sm:text-8xl">
                {new Intl.NumberFormat().format(count)}
              </p>
              {result.sourceTag ? (
                <p className="mt-4 text-[11px] text-muted-foreground">
                  {t('common.tools.shutterCount.source', { tag: result.sourceTag })}
                </p>
              ) : null}
            </div>
          )}

          <dl className="grid gap-2 sm:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <Fragment key={label}>
                <div className="min-w-0 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                  <dt className="text-[10px] text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 truncate text-xs text-foreground" title={value}>
                    {value}
                  </dd>
                </div>
              </Fragment>
            ))}
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
