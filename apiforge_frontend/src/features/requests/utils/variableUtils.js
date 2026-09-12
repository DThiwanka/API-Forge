export const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/**
 * Parses all {{variable}} references from a given string.
 * Returns an array of unique variable names (clean without brackets).
 */
export function extractVariableNames(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(VARIABLE_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))).filter(Boolean);
}

/**
 * Filter variables by search query (matching key or description only, never secret values).
 */
export function filterVariablesSafely(variables = [], query = '') {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return variables;
  return variables.filter(
    (v) =>
      v.key.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q))
  );
}

/**
 * Resolves variable precedence across multiple sources:
 * RUNTIME > EXTRACTED > ENVIRONMENT
 */
export function resolveVariablePrecedence(envVars = [], extrs = [], runVars = []) {
  const map = new Map();

  // 1. Environment variables
  if (Array.isArray(envVars)) {
    for (const v of envVars) {
      if (v?.key?.trim()) {
        const cleanKey = v.key.trim();
        map.set(cleanKey, {
          key: cleanKey,
          source: 'environment',
          isSecret: Boolean(v.isSecret),
          value: v.isSecret ? '••••••••' : v.value ?? '',
          description: v.description || '',
          id: v.id,
        });
      }
    }
  }

  // 2. Extracted variables (overrides environment)
  if (Array.isArray(extrs)) {
    for (const ext of extrs) {
      if (ext?.variableName?.trim()) {
        const cleanKey = ext.variableName.trim();
        map.set(cleanKey, {
          key: cleanKey,
          source: 'extracted',
          isSecret: false,
          value: `(extracted downstream from ${ext.source || 'response'})`,
          description: `Extracted via ${ext.source || 'json'}: ${ext.property || ext.jsonPath || ext.headerName || ''}`,
          id: ext.id || cleanKey,
        });
      }
    }
  }

  // 3. Runtime variables (overrides extracted and environment)
  if (Array.isArray(runVars)) {
    for (const r of runVars) {
      if (r?.key?.trim()) {
        const cleanKey = r.key.trim();
        map.set(cleanKey, {
          key: cleanKey,
          source: 'runtime',
          isSecret: false,
          value: r.value ?? '',
          description: 'Runtime variable (ephemeral runner variable)',
          id: cleanKey,
        });
      }
    }
  }

  return {
    variables: Array.from(map.values()),
    knownKeys: new Set(map.keys()),
    variableMap: map,
  };
}

/**
 * Detect undefined variables referenced in a list against a set of known variable keys.
 */
export function detectUndefinedVariables(referencedKeys = [], knownKeysSet = new Set()) {
  return referencedKeys.filter((k) => !knownKeysSet.has(k));
}

/**
 * Replaces partial `{{prefix` before cursor with completed `{{selectedKey}}`.
 */
export function replaceVariableToken(currentValue, cursorPos, selectedKey) {
  const textBeforeCursor = currentValue.slice(0, cursorPos);
  const textAfterCursor = currentValue.slice(cursorPos);

  const lastOpenIndex = textBeforeCursor.lastIndexOf('{{');
  if (lastOpenIndex === -1) {
    return `${currentValue}{{${selectedKey}}}`;
  }

  let remainingAfter = textAfterCursor;
  if (remainingAfter.startsWith('}}')) {
    remainingAfter = remainingAfter.slice(2);
  }

  const beforeBraces = textBeforeCursor.slice(0, lastOpenIndex);
  return `${beforeBraces}{{${selectedKey}}}${remainingAfter}`;
}

