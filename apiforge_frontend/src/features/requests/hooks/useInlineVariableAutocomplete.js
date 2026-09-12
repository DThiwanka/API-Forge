import { useState, useCallback, useRef } from 'react';

/**
 * Hook to manage inline variable autocomplete for text inputs when typing `{{`.
 */
export function useInlineVariableAutocomplete({ value = '', onChange, variables = [] }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Check if cursor is right after `{{prefix`
  const checkAutocomplete = useCallback(
    (inputValue, cursorPosition) => {
      if (cursorPosition == null) return;
      const textBeforeCursor = inputValue.slice(0, cursorPosition);
      const lastOpenIndex = textBeforeCursor.lastIndexOf('{{');

      if (lastOpenIndex === -1) {
        setShowSuggestions(false);
        return;
      }

      // Check if there is already a closing `}}` after the last `{{` before cursor
      const textAfterOpen = textBeforeCursor.slice(lastOpenIndex + 2);
      if (textAfterOpen.includes('}}')) {
        setShowSuggestions(false);
        return;
      }

      // Only allow valid identifier characters in the query
      if (/[^\w.-]/.test(textAfterOpen) && textAfterOpen.trim() !== '') {
        setShowSuggestions(false);
        return;
      }

      const query = textAfterOpen.trim().toLowerCase();
      const matched = variables.filter((v) =>
        v.key.toLowerCase().includes(query)
      );

      if (matched.length > 0) {
        setSuggestions(matched);
        setSelectedIndex(0);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    },
    [variables]
  );

  const handleInputChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;
      onChange?.(newValue);
      checkAutocomplete(newValue, cursorPos);
    },
    [onChange, checkAutocomplete]
  );

  const handleSelect = useCallback(
    (varKey) => {
      const inputEl = inputRef.current;
      const cursorPos = inputEl ? inputEl.selectionStart : value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const textAfterCursor = value.slice(cursorPos);

      const lastOpenIndex = textBeforeCursor.lastIndexOf('{{');
      if (lastOpenIndex === -1) {
        // Just append {{varKey}}
        const nextVal = `${value}{{${varKey}}}`;
        onChange?.(nextVal);
        setShowSuggestions(false);
        return;
      }

      // If textAfterCursor starts with `}}`, strip it so we don't double brackets
      let remainingAfter = textAfterCursor;
      if (remainingAfter.startsWith('}}')) {
        remainingAfter = remainingAfter.slice(2);
      }

      const beforeBraces = textBeforeCursor.slice(0, lastOpenIndex);
      const nextVal = `${beforeBraces}{{${varKey}}}${remainingAfter}`;
      onChange?.(nextVal);
      setShowSuggestions(false);

      // Restore focus and position cursor after `}}`
      if (inputEl) {
        setTimeout(() => {
          inputEl.focus();
          const newPos = lastOpenIndex + varKey.length + 4; // `{{` + varKey + `}}`
          inputEl.setSelectionRange(newPos, newPos);
        }, 10);
      }
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!showSuggestions || suggestions.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return true;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return true;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = suggestions[selectedIndex];
        if (chosen) {
          handleSelect(chosen.key);
        }
        return true;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return true;
      }

      return false;
    },
    [showSuggestions, suggestions, selectedIndex, handleSelect]
  );

  return {
    inputRef,
    showSuggestions,
    suggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    closeSuggestions: () => setShowSuggestions(false),
  };
}

