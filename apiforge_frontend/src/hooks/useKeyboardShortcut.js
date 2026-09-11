import { useEffect } from 'react';

export function useKeyboardShortcut(key, callback, modifier = 'ctrlKey') {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === key.toLowerCase() && (!modifier || e[modifier])) {
        e.preventDefault();
        callback(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, modifier]);
}

export default useKeyboardShortcut;
