import { useState } from 'react';
import { Variable } from 'lucide-react';
import { useInlineVariableAutocomplete } from '../hooks/useInlineVariableAutocomplete';
import VariableSuggestionsDropdown from './VariableSuggestionsDropdown';
import VariablePicker from '../../environments/components/VariablePicker';
import { cn } from '../../../utils/cn';

export default function VariableInput({
  value = '',
  onChange,
  onKeyDown: propOnKeyDown,
  placeholder,
  variables = [],
  activeEnvName,
  className,
  inputClassName,
  showPickerButton = true,
  pickerButtonTitle = 'Insert variable...',
  type = 'text',
  disabled = false,
  autoComplete = 'off',
  spellCheck = false,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
    <div className={cn('relative flex items-center w-full', className)}>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        className={cn(
          'w-full bg-transparent font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors',
          showPickerButton && 'pr-7',
          inputClassName
        )}
      />

      {/* Picker button trigger */}
      {showPickerButton && !disabled && (
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          title={pickerButtonTitle}
          tabIndex={-1}
          className="absolute right-1 text-slate-500 hover:text-sky-400 p-1 rounded hover:bg-[#181d29] transition-colors cursor-pointer"
        >
          <Variable size={12} />
        </button>
      )}

      {/* Autocomplete Dropdown when typing `{{` */}
      <VariableSuggestionsDropdown
        isOpen={showSuggestions}
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onClose={closeSuggestions}
      />

      {/* Full Modal Picker */}
      <VariablePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handlePickerSelect}
        variables={variables}
        activeEnvName={activeEnvName}
      />
    </div>
  );
}

