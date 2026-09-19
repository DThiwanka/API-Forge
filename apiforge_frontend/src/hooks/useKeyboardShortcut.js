import { useEffect, useRef } from 'react';
import { isEditableElement } from '../features/shortcuts/utils/shortcutUtils.js';

/**
 * Hook to bind a keyboard shortcut with modifier and input safety.
 *
 * @param {string} key - Primary key to listen for (e.g. 'k', 's', 'Enter', 'Escape')
 * @param {Function} callback - Handler called when shortcut matches
 * @param {string|Object} optionsOrModifier - 'ctrlKey', 'metaKey', 'altKey', 'shiftKey', or options object
 */
export function useKeyboardShortcut(key, callback, optionsOrModifier = 'ctrlKey') {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const options =
    typeof optionsOrModifier === 'string'
      ? { modifier: optionsOrModifier, allowInInputs: false, enabled: true }
      : { modifier: 'ctrlKey', allowInInputs: false, enabled: true, ...optionsOrModifier };

  useEffect(() => {
    if (options.enabled === false) return;

    const handleKeyDown = (e) => {
      if (!options.allowInInputs && isEditableElement(e.target)) {
        return;
      }

      const keyMatches = e.key.toLowerCase() === key.toLowerCase();
      let modifierMatches = true;

      if (options.modifier === 'mod' || options.modifier === 'ctrlOrCmd') {
        modifierMatches = e.ctrlKey || e.metaKey;
      } else if (options.modifier) {
        modifierMatches = Boolean(e[options.modifier]);
      }

      if (keyMatches && modifierMatches) {
        e.preventDefault();
        callbackRef.current?.(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, options.modifier, options.allowInInputs, options.enabled]);
}

export default useKeyboardShortcut;
