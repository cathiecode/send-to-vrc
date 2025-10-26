import { useLayoutEffect, useRef, useState } from "react";

export default function useBoundingClientRect() {
  const ref = useRef<HTMLDivElement>(null);

  const [boundingClientRect, setBoundingClientRect] = useState<DOMRect>();

  const [effectiveScale, setEffectiveScale] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleResizeObserver = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();

      setBoundingClientRect(rect);
      setEffectiveScale(
        element.offsetWidth && rect.width
          ? element.offsetWidth / rect.width
          : 1,
      );
    });

    handleResizeObserver.observe(element);

    return () => {
      handleResizeObserver.disconnect();
    };
  }, [boundingClientRect]);

  return { boundingClientRect, ref, effectiveScale };
}
