import type { CSSProperties, ReactNode } from 'react';
import type { TemplateBackground } from '../background';

interface TemplateBackgroundFrameProps {
  background: TemplateBackground;
  /** 图片背景的来源；当前使用正在编辑的照片本身 */
  photoUrl: string;
  children: ReactNode;
}

/**
 * 画框：包在模板画布外面的一层，负责背景填充与内边距。
 *
 * 尺寸由外部按目标尺寸设置（见 `lib/render-size`）。内边距与模糊半径都写成
 * 画框宽度 `--co-frame` 的比例，因此这里不出现任何绝对单位。
 */
export function TemplateBackgroundFrame({
  background,
  photoUrl,
  children,
}: TemplateBackgroundFrameProps) {
  const framed = background.mode !== 'none';

  const frameStyle: CSSProperties = {
    position: 'relative',
    // 建立层叠上下文，否则背景层的 z-index:-1 会跑到画框之外
    zIndex: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(framed
      ? {
          padding: `calc(var(--co-frame) * ${background.paddingVertical}) calc(var(--co-frame) * ${background.paddingHorizontal})`,
        }
      : {
          // 无背景时画框贴合画布，目标尺寸只作 contain 约束
          width: 'fit-content',
          height: 'fit-content',
        }),
  };

  return (
    <div data-co-frame="" style={frameStyle}>
      {framed ? (
        <div
          data-co-background=""
          style={{
            position: 'absolute',
            zIndex: -1,
            // 外扩两倍模糊半径，避免模糊之后画框边缘透出
            inset: `calc(var(--co-frame) * ${-background.blur * 2})`,
            background: background.mode === 'image' ? `url(${photoUrl})` : background.color,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter:
              background.mode === 'image'
                ? `blur(calc(var(--co-frame) * ${background.blur})) brightness(${background.brightness})`
                : undefined,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
