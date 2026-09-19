import React, { useEffect } from 'react';
import { cn } from '../../utils/cn.js';
import useShortcutStore from '../../features/shortcuts/store/shortcutStore.js';
import { SHORTCUT_SCOPES } from '../../features/shortcuts/constants/shortcutRegistry.js';

export default function Dialog({ isOpen, onClose, title, children, className, closeOnEscape = true }) {
  const pushScope = useShortcutStore((s) => s.pushScope);
  const popScope = useShortcutStore((s) => s.popScope);

  // Manage dialog scope and Escape listener
  useEffect(() => {
    if (!isOpen) return;

    pushScope(SHORTCUT_SCOPES.DIALOG);

    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      popScope(SHORTCUT_SCOPES.DIALOG);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose, closeOnEscape, pushScope, popScope]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={cn('bg-slate-800 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-xl', className)}>
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg leading-none p-1 rounded hover:bg-slate-700/50 transition-colors"
            title="Close (Esc)"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
