import type { RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

/**
 * 观察元素内容区尺寸，随 ResizeObserver 实时更新。
 *
 * 元素常常晚于首次渲染才挂上 ref：页面在没有数据时先渲染空状态，有数据之后
 * 才渲染真正带引用的容器。若 effect 只依赖 ref 对象，它就只在挂载时执行一次，
 * 那时 `ref.current` 还是 null，之后不会再有第二次机会，尺寸会永远停在 0。
 *
 * 所以这里不再把绑定写成一次性的：每次渲染后核对一次元素，引用没变就直接
 * 返回，元素换了（首次挂上或重新挂载）才重新 observe。
 */
export function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observedRef = useRef<T | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // 故意不写依赖数组：ref 的变化不会触发渲染，只能在每次渲染后自行核对
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || observedRef.current === element) {
      return;
    }

    observedRef.current = element;
    observerRef.current?.disconnect();

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // 尺寸未变时保留原对象，避免探针测量等场景触发无谓渲染
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    });

    observerRef.current = observer;
    observer.observe(element);
  });

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedRef.current = null;
    },
    [],
  );

  return size;
}
