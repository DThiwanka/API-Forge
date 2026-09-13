import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Variable, Copy, Check, X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useInlineVariableAutocomplete } from '../hooks/useInlineVariableAutocomplete';
import VariableSuggestionsDropdown from './VariableSuggestionsDropdown';
import VariablePicker from '../../environments/components/VariablePicker';
import VariableToken from './VariableToken';

/**
 * Request URL Input Component
 * 
 * Supports long URLs with horizontal scrolling, inline {{variable}} autocompletion,
 * token preview chips, quick copy of authored URL (never secret values),
 * quick clear, and path/query parameter awareness.
 */
export default function RequestUrlInput({
  value = '',
  onChange,
  onKeyDown: propOnKeyDown,
  className,
  placeholder,
  variables = [],
  knownVariableKeys = new Set(),
  activeEnvName,
  getVariable,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputContainerRef = useRef(null);

  // Extract all {{variable}} tokens from the URL for visual preview
  const detectedVariables = useMemo(() => {
    if (!value) return [];
    const matches = value.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))).filter(Boolean);
  }, [value]);

  const {
    inputRef,
    showSuggestions,
    suggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown: handleAutocompleteKeyDown,
    handleSelect,
    closeSuggestions,
  } = useInlineVariableAutocomplete({
    value,
    onChange,
    variables,
  });

  // Global focus shortcut listener (Ctrl+L / Alt+D)
  useEffect(() => {
    const handleFocusEvent = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('apiforge:focus-url', handleFocusEvent);
    return () => window.removeEventListener('apiforge:focus-url', handleFocusEvent);
  }, [inputRef]);

  const onKeyDown = (e) => {
    const handled = handleAutocompleteKeyDown(e);
    if (!handled) {
      propOnKeyDown?.(e);
    }
  };

  const handleCopyUrl = useCallback(() => {
    if (!value) return;
    // Always copies the authored URL with {{variables}} intact, never resolving secret values
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const handleClearUrl = useCallback(() => {
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange, inputRef]);

  const handlePickerSelect = (varKey) => {
    const inputEl = inputRef.current;
    const cursorPos = inputEl ? inputEl.selectionStart : value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const nextVal = `${before}{{${varKey}}}${after}`;
    onChange?.(nextVal);

    if (inputEl) {
      setTimeout(() => {
        inputEl.focus();
        const newPos = cursorPos + varKey.length + 4;
        inputEl.setSelectionRange(newPos, newPos);
      }, 10);
    }
  };

  return (
    <div ref={inputContainerRef} className={cn('relative flex-1 flex flex-col min-w-0', className)}>
      <div className="relative flex-1 flex items-center min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          aria-label="Request URL"
          placeholder={placeholder || 'Enter URL or {{baseUrl}}/endpoint'}
          spellCheck={false}
          autoComplete="off"
          className={cn(
            'w-full h-full py-2 pl-3 bg-[#111318] text-slate-100 placeholder-slate-500 font-mono text-xs border-y border-[#2b313e] focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 transition-colors overflow-x-auto whitespace-nowrap',
            value ? 'pr-28 sm:pr-32' : 'pr-12'
          )}
        />

        {/* Right side controls: Clear, Copy, Variable preview chips, Variable Picker */}
        <div className="absolute right-1.5 flex items-center gap-1 select-none">
          {/* Quick Clear URL */}
          {value ? (
            <button
              type="button"
              onClick={handleClearUrl}
              aria-label="Clear URL"
              title="Clear URL"
              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-[#181d29] transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          ) : null}

          {/* Quick Copy Authored URL */}
          {value ? (
            <button
              type="button"
              onClick={handleCopyUrl}
              aria-label="Copy authored URL"
              title={copied ? 'Copied to clipboard!' : 'Copy authored URL'}
              className="text-slate-500 hover:text-slate-200 p-1 rounded hover:bg-[#181d29] transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          ) : null}

          {/* Detected variable tokens */}
          {detectedVariables.length > 0 && (
            <div className="hidden md:flex items-center gap-1 max-w-[140px] truncate">
              {detectedVariables.slice(0, 2).map((v) => {
                const meta = getVariable?.(v);
                const isKnown = knownVariableKeys.has(v);
                return (
                  <VariableToken
                    key={v}
                    name={v}
                    isKnown={isKnown}
                    source={meta?.source || 'environment'}
                    isSecret={meta?.isSecret}
                    previewValue={meta?.value}
                    envName={meta?.envName || activeEnvName}
                    description={meta?.description}
                    className="py-0.2 text-[10px]"
                  />
                );
              })}
              {detectedVariables.length > 2 && (
                <span className="text-[10px] font-mono text-slate-500 px-0.5">
                  +{detectedVariables.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Variable Picker Trigger */}
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            aria-label="Insert variable from environment"
            title="Insert variable from environment or runner..."
            className="text-slate-500 hover:text-sky-400 p-1 rounded hover:bg-[#181d29] transition-colors cursor-pointer"
          >
            <Variable size={13} />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown when typing `{{` */}
      <VariableSuggestionsDropdown
        isOpen={showSuggestions}
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onClose={closeSuggestions}
      />

      {/* Variable Picker Dialog */}
      <VariablePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handlePickerSelect}
        variables={variables}
        activeEnvName={activeEnvName}
        title="Insert Variable into URL"
      />
    </div>
  );
}
