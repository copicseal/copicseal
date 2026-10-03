import { toast } from 'sonner';
import { openDirectory, platformCapabilities } from '@/platform';
import { useAppNavigation } from '@/shared/providers/navigation-provider';

/** 设置页里导出目录那一项的元素 id，跳转时靠它定位。 */
const EXPORT_DIRECTORY_ANCHOR = 'export-directory';

interface CoOpenDirectoryLinkProps {
  /** 要打开的绝对目录路径 */
  directory: string;
}

/**
 * 导出完成提示里的输出目录：蓝色链接，点击直接在系统文件管理器里打开。
 *
 * 平台不支持打开路径（Web 端）时退化成普通文本，只做展示。
 */
export function CoOpenDirectoryLink({ directory }: CoOpenDirectoryLinkProps) {
  if (!platformCapabilities.system.openPath) {
    return <span className="break-all">{directory}</span>;
  }

  return (
    <button
      type="button"
      className="text-left break-all text-primary underline underline-offset-2 hover:text-primary/80"
      onClick={() => {
        void openDirectory(directory).catch((error) => {
          console.warn('打开导出目录失败:', error);
        });
      }}
    >
      {directory}
    </button>
  );
}

/** 提示里的「更改」：跳到设置页的导出目录那一项。 */
function ChangeExportDirectoryButton() {
  const navigate = useAppNavigation();

  return (
    <button
      type="button"
      // 做成小胶囊而不是第二个下划线链接：它和目录链接挨着，样式必须能一眼区分
      className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] leading-4 text-primary transition-colors hover:bg-primary/20"
      onClick={() => navigate('/settings', EXPORT_DIRECTORY_ANCHOR)}
    >
      更改
    </button>
  );
}

/** 导出成功后弹一条带输出目录链接的短提示；没有目录（Web 端）时什么都不做。 */
export function notifyExportedDirectory(directory: string | null) {
  if (!directory) {
    return;
  }

  toast.success('导出完成', {
    description: (
      <span className="flex items-start gap-1.5">
        <span className="min-w-0">
          <CoOpenDirectoryLink directory={directory} />
        </span>
        <ChangeExportDirectoryButton />
      </span>
    ),
    duration: 6000,
  });
}

/** 导出失败的兜底提示：直写目录之后，最常见的失败原因就是保存目录不可用。 */
export function notifyExportFailed(error: unknown) {
  console.error('导出失败:', error);
  toast.error('导出失败，请检查设置里的保存目录是否可用');
}
