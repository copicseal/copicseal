import { type DragEvent, type FC, type ReactNode, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';

interface CoDropZoneProps {
  onFilesDrop: (files: FileList | File[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export const CoDropZone: FC<CoDropZoneProps> = ({ onFilesDrop, className, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files?.length) {
      onFilesDrop(e.dataTransfer.files);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop zone requires drag event handlers on container
    <div
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        className,
      )}
      role="presentation"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary/5">
          <p className="text-lg font-medium text-primary">释放以导入照片</p>
        </div>
      )}
      {children}
    </div>
  );
};

interface CoFileInputProps {
  onFilesSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  children?: ReactNode;
}

export const CoFileInput: FC<CoFileInputProps> = ({
  onFilesSelect,
  accept,
  multiple,
  className,
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesSelect(e.target.files);
    }
    // 重置以允许重复选择同一文件
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>
    </>
  );
};
