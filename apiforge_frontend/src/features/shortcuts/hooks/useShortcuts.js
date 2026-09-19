import { useEffect, useRef } from 'react';
import { SHORTCUTS, SHORTCUT_SCOPES } from '../constants/shortcutRegistry.js';
import { matchesShortcut, isEditableElement, isMac } from '../utils/shortcutUtils.js';
import useShortcutStore from '../store/shortcutStore.js';

/**
 * useShortcuts Hook
 * Binds one or more shortcuts to handlers with scope management, input safety, and permissions.
 *
 * @param {Array<Object>} bindings - Array of shortcut binding objects:
 *   - id: string (shortcut registry ID)
 *   - keys: string (optional override key combo)
 *   - handler: function (callback when triggered)
 *   - enabled: boolean (defaults to true)
 *   - allowInInputs: boolean (defaults to registry definition or false)
 *   - scope: string (scope to push/pop and check against)
 */
export function useShortcuts(bindings = [], { scope = null } = {}) {
  const pushScope = useShortcutStore((s) => s.pushScope);
  const popScope = useShortcutStore((s) => s.popScope);
  const bindingsRef = useRef(bindings);
  useEffect(() => {
    bindingsRef.current = bindings;
  });

  // Manage scope lifecycle
  useEffect(() => {
    if (scope && scope !== SHORTCUT_SCOPES.GLOBAL) {
      pushScope(scope);
      return () => {
        popScope(scope);
      };
    }
  }, [scope, pushScope, popScope]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeScope = useShortcutStore.getState().getCurrentScope();
      const isTargetEditable = isEditableElement(e.target);
      const isMacOS = isMac();

      for (const binding of bindingsRef.current) {
        if (!binding || binding.enabled === false) continue;

        // If a binding specifies a scope, only run if that scope is currently active or top-level
        const bindingScope = binding.scope || scope || SHORTCUT_SCOPES.GLOBAL;
        if (bindingScope !== SHORTCUT_SCOPES.GLOBAL && activeScope !== bindingScope && activeScope !== SHORTCUT_SCOPES.DIALOG) {
          // Allow if activeScope is DIALOG and bindingScope is DIALOG
          if (activeScope === SHORTCUT_SCOPES.DIALOG && bindingScope !== SHORTCUT_SCOPES.DIALOG) {
            continue;
          }
        }

        // Look up canonical definition
        const registryDef = SHORTCUTS.find((s) => s.id === binding.id);
        const allowInInputs = binding.allowInInputs ?? registryDef?.allowInInputs ?? false;

        // Check input safety: if inside an input/textarea and shortcut is NOT allowed in inputs, skip
        if (isTargetEditable && !allowInInputs) {
          continue;
        }

        // Check key match
        const keyDef = binding.keys || registryDef || binding.id;
        if (matchesShortcut(e, keyDef, isMacOS)) {
          e.preventDefault();
          e.stopPropagation();
          binding.handler(e);
          return; // Execute only the highest matching handler
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scope]);
}

export default useShortcuts;
