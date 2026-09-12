import { useMemo } from 'react';
import { useState, useMemo, useRef } from 'react';
import { Variable } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useInlineVariableAutocomplete } from '../hooks/useInlineVariableAutocomplete';
import VariableSuggestionsDropdown from './VariableSuggestionsDropdown';
import VariablePicker from '../../environments/components/VariablePicker';
import VariableToken from './VariableToken';

export default function RequestUrlInput({ value = '', onChange, onKeyDown, className, placeholder }) {
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
  const inputContainerRef = useRef(null);

  // Extract all {{variable}} tokens from the URL for visual tags
  const detectedVariables = useMemo(() => {
    if (!value) return [];
    const matches = value.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
    if (!matches) return [];
    // Deduplicate
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim())));
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

  const onKeyDown = (e) => {
    const handled = handleAutocompleteKeyDown(e);
    if (!handled) {
      propOnKeyDown?.(e);
    }
  };

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
    <div className={cn('relative flex-1 flex flex-col', className)}>
    <div ref={inputContainerRef} className={cn('relative flex-1 flex flex-col', className)}>
      <div className="relative flex-1 flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder || 'Enter URL or {{baseUrl}}/endpoint'}
          spellCheck={false}
          autoComplete="off"
          className="w-full h-full py-2 px-3 bg-[#111318] text-slate-100 placeholder-slate-500 font-mono text-xs border-y border-[#2b313e] focus:outline-none focus:border-sky-500 transition-colors"
          className="w-full h-full py-2 pl-3 pr-24 bg-[#111318] text-slate-100 placeholder-slate-500 font-mono text-xs border-y border-[#2b313e] focus:outline-none focus:border-sky-500 transition-colors"
        />

        {detectedVariables.length > 0 && (
          <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
            {detectedVariables.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 select-none shadow-sm"
              >
                <Variable size={10} className="text-amber-400" />
                <span>{v}</span>
              </span>
            ))}
          </div>
        )}
        {/* Right side controls: Variable Picker Button & Variable preview chips */}
        <div className="absolute right-2 flex items-center gap-1.5">
          {detectedVariables.length > 0 && (
            <div className="flex items-center gap-1">
              {detectedVariables.slice(0, 3).map((v) => {
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
              {detectedVariables.length > 3 && (
                <span className="text-[10px] font-mono text-slate-500 px-1">
                  +{detectedVariables.length - 3}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
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

