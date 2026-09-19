import React, { useEffect, useRef, useId } from 'react';
import { cn } from '../../utils/cn.js';
import useShortcutStore from '../../features/shortcuts/store/shortcutStore.js';
import { SHORTCUT_SCOPES } from '../../features/shortcuts/constants/shortcutRegistry.js';

export default function Dialog({ isOpen, onClose, title, children, className, closeOnEscape = true }) {
  const pushScope = useShortcutStore((s) => s.pushScope);
  const popScope = useShortcutStore((s) => s.popScope);
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Manage dialog scope, Escape listener, focus trapping, and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore upon close
    previousActiveElementRef.current = document.activeElement;
    pushScope(SHORTCUT_SCOPES.DIALOG);

    // Initial focus into dialog
    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        // Focus the first form control, or close button if no inputs
        const initialFocusTarget =
          Array.from(focusableElements).find(
            (el) => el.tagName !== 'BUTTON' || el.getAttribute('aria-label') !== 'Close dialog'
          ) || focusableElements[0];
        initialFocusTarget?.focus();
      }
    }, 30);

    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      // Focus trapping
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      popScope(SHORTCUT_SCOPES.DIALOG);
      window.removeEventListener('keydown', handleKeyDown, true);

      // Restore focus
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
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
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={dialogRef}
        className={cn('bg-slate-800 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-xl', className)}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 id={titleId} className="text-lg font-semibold text-slate-100">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg leading-none p-1 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
            title="Close dialog (Esc)"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
