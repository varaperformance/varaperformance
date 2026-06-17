import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

export default function RouteProgress() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const lastPathRef = useRef('');

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (!lastPathRef.current) {
      lastPathRef.current = currentPath;
      return;
    }

    if (currentPath === lastPathRef.current) {
      return;
    }

    lastPathRef.current = currentPath;
    const t0 = window.setTimeout(() => {
      setVisible(true);
      setWidth(18);
    }, 0);

    const t1 = window.setTimeout(() => setWidth(62), 45);
    const t2 = window.setTimeout(() => setWidth(88), 180);
    let t4: number | null = null;
    const t3 = window.setTimeout(() => {
      setWidth(100);
      t4 = window.setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 140);
    }, 340);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (t4 !== null) {
        window.clearTimeout(t4);
      }
    };
  }, [location.pathname, location.search, location.hash]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 bg-transparent">
      <div
        className="h-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
