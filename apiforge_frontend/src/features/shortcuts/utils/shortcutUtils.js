/**
 * Keyboard Shortcut Utilities for APIForge
 * Handles platform detection, modifier formatting, key matching, and input safety.
 */

/**
 * Detects whether the client is running macOS or iOS.
 */
export function isMac() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.userAgentData?.platform) {
    return /mac/i.test(navigator.userAgentData.platform);
  }
  const platform = navigator.platform || navigator.userAgent || '';
  return /Mac|iPod|iPhone|iPad/i.test(platform);
}

/**
 * Checks if the event target is an active text input, textarea, contenteditable, or code editor.
 */
export function isEditableElement(target) {
  if (!target || typeof target !== 'object') return false;

  const tagName = target.tagName ? target.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  // Check for class indicators (Monaco, CodeMirror, etc.)
  if (typeof target.closest === 'function') {
    if (target.closest('.monaco-editor, .cm-editor, [contenteditable="true"]')) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a canonical key definition into a human-readable platform string.
 * e.g.:
 * 'Mod+K' -> '⌘K' (Mac) or 'Ctrl K' (Win/Linux)
 * 'Mod+Enter' -> '⌘↵' (Mac) or 'Ctrl Enter' (Win/Linux)
 * 'Mod+Shift+S' -> '⌘⇧S' (Mac) or 'Ctrl+Shift+S' (Win/Linux)
 * 'Alt+1..6' -> '⌥1..6' (Mac) or 'Alt+1..6' (Win/Linux)
 */
export function formatShortcutKey(keyCombo, isMacOS = isMac(), compact = false) {
  if (!keyCombo) return '';

  const parts = keyCombo.split('+');
  const formattedParts = parts.map((part) => {
    const p = part.trim();
    if (p === 'Mod') {
      return isMacOS ? '⌘' : 'Ctrl';
    }
    if (p === 'Shift') {
      return isMacOS ? '⇧' : 'Shift';
    }
    if (p === 'Alt') {
      return isMacOS ? '⌥' : 'Alt';
    }
    if (p === 'Enter') {
      return isMacOS ? '↵' : 'Enter';
    }
    if (p === 'Delete') {
      return isMacOS ? '⌫' : 'Delete';
    }
    if (p === 'Escape') {
      return 'Esc';
    }
    return p;
  });

  if (isMacOS) {
    // Mac convention: symbols often concatenated directly without pluses (e.g. ⌘K, ⌘↵, ⌘⇧S)
    return formattedParts.join(compact ? '' : ' ');
  }

  // Windows / Linux convention: Ctrl+K, Ctrl+Enter, Ctrl+Shift+S
  return formattedParts.join(compact ? '+' : ' + ');
}

/**
 * Parses a key combination string like 'Mod+Shift+S' or 'Alt+N' into structured components.
 */
export function parseShortcut(keyCombo) {
  if (!keyCombo) return null;

  const parts = keyCombo.split('+').map((p) => p.trim());
  let needsMod = false;
  let needsShift = false;
  let needsAlt = false;
  let primaryKey = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod' || lower === 'ctrl' || lower === 'cmd' || lower === 'command') {
      needsMod = true;
    } else if (lower === 'shift') {
      needsShift = true;
    } else if (lower === 'alt' || lower === 'option') {
      needsAlt = true;
    } else {
      primaryKey = part;
    }
  }

  return {
    needsMod,
    needsShift,
    needsAlt,
    primaryKey,
  };
}

/**
 * Checks whether a KeyboardEvent matches a given shortcut combination.
 * Supports canonical 'Mod', single characters, numbers, and special keys.
 */
export function matchesKeyCombo(event, keyCombo, isMacOS = isMac()) {
  if (!event || !keyCombo) return false;

  const parsed = parseShortcut(keyCombo);
  if (!parsed) return false;

  // Modifier checks
  const eventMod = isMacOS ? event.metaKey : (event.ctrlKey || event.metaKey);
  if (parsed.needsMod && !eventMod) return false;
  if (!parsed.needsMod && (event.ctrlKey || event.metaKey)) return false;

  const isShiftedSymbol = /^[?!@#$%^&*()_+{}|:"<>~]$/.test(parsed.primaryKey);
  if (!isShiftedSymbol && parsed.needsShift !== Boolean(event.shiftKey)) {
    return false;
  }
  if (isShiftedSymbol && parsed.needsShift && !event.shiftKey) {
    return false;
  }

  if (parsed.needsAlt !== Boolean(event.altKey)) return false;

  const eventKey = event.key ? event.key.toLowerCase() : '';
  const expectedKey = parsed.primaryKey.toLowerCase();

  // Primary key check
  if (expectedKey === 'enter') {
    return eventKey === 'enter';
  }
  if (expectedKey === 'escape') {
    return eventKey === 'escape';
  }
  if (expectedKey === 'delete') {
    return eventKey === 'delete';
  }
  if (expectedKey === 'backspace') {
    return eventKey === 'backspace';
  }
  if (expectedKey === '/' || expectedKey === '?') {
    return eventKey === '/' || eventKey === '?' || event.key === '?' || event.key === '/';
  }
  if (expectedKey === '[' || expectedKey === '{') {
    return eventKey === '[' || eventKey === '{';
  }
  if (expectedKey === ']' || expectedKey === '}') {
    return eventKey === ']' || eventKey === '}';
  }

  return eventKey === expectedKey;
}

/**
 * Checks whether a KeyboardEvent matches a shortcut definition or string.
 * Also checks any alternateKeys defined on the shortcut object.
 */
export function matchesShortcut(event, shortcutDefOrKey, isMacOS = isMac()) {
  if (!event || !shortcutDefOrKey) return false;

  if (typeof shortcutDefOrKey === 'string') {
    return matchesKeyCombo(event, shortcutDefOrKey, isMacOS);
  }

  // Object definition
  if (shortcutDefOrKey.keys && matchesKeyCombo(event, shortcutDefOrKey.keys, isMacOS)) {
    return true;
  }

  if (Array.isArray(shortcutDefOrKey.alternateKeys)) {
    for (const altKey of shortcutDefOrKey.alternateKeys) {
      if (matchesKeyCombo(event, altKey, isMacOS)) {
        return true;
      }
    }
  }

  return false;
}
