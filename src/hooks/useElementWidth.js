import { useEffect, useRef, useState } from 'react';

/** A ref to attach to an element, and that element's current width in pixels. */
export default function useElementWidth(initialWidth = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
