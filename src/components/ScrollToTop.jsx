import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Start each new page at the top instead of wherever the last page was scrolled to.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
