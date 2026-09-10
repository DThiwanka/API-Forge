import { useEffect } from 'react';

export function useCanvasShortcuts({ onZoomIn, onZoomOut, onReset }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === '=') onZoomIn?.();
      if (e.ctrlKey && e.key === '-') onZoomOut?.();
      if (e.ctrlKey && e.key === '0') onReset?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onZoomIn, onZoomOut, onReset]);
}

export default useCanvasShortcuts;
