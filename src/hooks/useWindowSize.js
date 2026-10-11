import { useEffect, useState } from 'react';

function currentSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** The browser window's current width and height, kept up to date on resize. */
export default function useWindowSize() {
  const [size, setSize] = useState(currentSize);

  useEffect(() => {
    const handleResize = () => setSize(currentSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
