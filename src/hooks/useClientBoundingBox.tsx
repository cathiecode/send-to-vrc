import { useLayoutEffect, useMemo, useRef, useState } from "react";

export default function useBoundingClientRect() {
  const ref = useRef<HTMLDivElement>(null);

  const [boundingClientRect, setBoundingClientRect] = useState<DOMRect>();

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const handleResize = () => {
      const rect = element.getBoundingClientRect();

      setBoundingClientRect(rect);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [ref]);

  const effectiveScale = useMemo(() => {
    return ref.current?.offsetWidth && boundingClientRect
      ? ref.current.offsetWidth / boundingClientRect.width
      : 1;
  }, [boundingClientRect, ref]);

  return { boundingClientRect, ref, effectiveScale };
}
