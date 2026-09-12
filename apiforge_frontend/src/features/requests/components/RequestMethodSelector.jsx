import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { METHODS, getMethodConfig } from '../utils/requestMethods';

export default function RequestMethodSelector({ value = 'GET', onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const normalizedValue = (value || 'GET').toUpperCase();
  const currentMethod = getMethodConfig(normalizedValue);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectMethod = useCallback(
    (method) => {
      onChange?.(method);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const initialIdx = METHODS.findIndex((m) => m.method === normalizedValue);
      setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % METHODS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + METHODS.length) % METHODS.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(METHODS.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < METHODS.length) {
        selectMethod(METHODS[focusedIndex].method);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative shrink-0', className)} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`HTTP Method: ${currentMethod.method}`}
        className={cn(
          'h-full flex items-center gap-1.5 px-3 py-2 rounded-l-md font-mono font-bold text-xs border border-r-0 border-[#2b313e] bg-[#14171f] hover:bg-[#1c212c] transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500 select-none cursor-pointer',
          currentMethod.color
        )}
      >
        <span>{currentMethod.method}</span>
        <ChevronDown size={13} className={cn('opacity-60 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          autoFocus
          className="absolute top-full left-0 mt-1 w-32 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 font-mono text-xs font-semibold focus:outline-none"
        >
          {METHODS.map((m, idx) => {
            const isSelected = normalizedValue === m.method;
            const isFocused = focusedIndex === idx;

            return (
              <button
                key={m.method}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectMethod(m.method)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={cn(
                  'w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between cursor-pointer focus:outline-none',
                  m.color,
                  (isFocused || isSelected) && 'bg-[#232732]'
                )}
              >
                <span>{m.method}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
