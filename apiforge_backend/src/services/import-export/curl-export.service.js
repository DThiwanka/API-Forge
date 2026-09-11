/**
 * Safely escape an argument string for POSIX shell using single quotes
 * 
 * @param {string|any} arg 
 * @returns {string} Escaped shell string
 */
export function escapeShellArg(arg) {
  if (arg === null || arg === undefined) return "''";
  const str = String(arg);
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Generate an executable cURL command from an APIForge request definition
 * 
 * @param {object} request - APIForge Request definition
 * @returns {{ format: string, command: string, hasSecrets: boolean }}
 */
export function exportToCurl(request) {
  if (!request || typeof request !== 'object') {
    throw new Error('Valid request object is required for cURL export');
  }

  const parts = ['curl'];
  let hasSecrets = false;

  const method = (request.method || 'GET').toUpperCase();
  const rawUrl = request.url || '';

  // 1. Build Full Target URL with Query Parameters
  let fullUrl = rawUrl;
  const activeParams = Array.isArray(request.queryParams)
    ? request.queryParams.filter((p) => p && p.enabled !== false && p.key && p.key.trim().length > 0)
    : [];

  if (activeParams.length > 0) {
    const qsParts = activeParams.map((p) => {
      const k = encodeURIComponent(p.key.trim());
      const v = p.value !== null && p.value !== undefined ? encodeURIComponent(String(p.value)) : '';
      return `${k}=${v}`;
    });
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}${qsParts.join('&')}`;
  }

  // 2. Method Flag
  const hasBody =
    request.body &&
    typeof request.body === 'object' &&
    request.body.mode &&
    request.body.mode !== 'none';

  if (method !== 'GET' || hasBody) {
    parts.push(`-X ${method}`);
  }

  // 3. Target URL
  parts.push(escapeShellArg(fullUrl));

  // 4. Headers
  const enabledHeaders = Array.isArray(request.headers)
    ? request.headers.filter((h) => h && h.enabled !== false && h.key && h.key.trim().length > 0)
    : [];

  let hasContentTypeHeader = false;
  for (const h of enabledHeaders) {
    const key = h.key.trim();
    const value = h.value !== null && h.value !== undefined ? String(h.value) : '';
    if (key.toLowerCase() === 'content-type') {
      hasContentTypeHeader = true;
    }
    if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
      hasSecrets = true;
    }
    parts.push(`-H ${escapeShellArg(`${key}: ${value}`)}`);
  }

  // 5. Authentication
  if (request.auth && typeof request.auth === 'object') {
    const { type, bearer, basic, apiKey } = request.auth;

    if (type === 'bearer') {
      const token = bearer?.token ?? request.auth.token;
      if (token) {
        parts.push(`-H ${escapeShellArg(`Authorization: Bearer ${token}`)}`);
        hasSecrets = true;
      }
    } else if (type === 'basic') {
      const username = basic?.username ?? request.auth.username ?? '';
      const password = basic?.password ?? request.auth.password ?? '';
      if (username || password) {
        parts.push(`-u ${escapeShellArg(`${username}:${password}`)}`);
        hasSecrets = true;
      }
    } else if (type === 'api-key') {
      const k = apiKey?.key ?? request.auth.key;
      const v = apiKey?.value ?? request.auth.value ?? '';
      const addTo = apiKey?.addTo ?? request.auth.addTo ?? 'header';
      if (k && addTo.toLowerCase() === 'header') {
        parts.push(`-H ${escapeShellArg(`${k}: ${v}`)}`);
        hasSecrets = true;
      }
    }
  }

  // 6. Body Configuration
  if (hasBody) {
    const mode = request.body.mode;

    if (mode === 'json') {
      if (!hasContentTypeHeader) {
        parts.push(`-H ${escapeShellArg('Content-Type: application/json')}`);
      }
      const raw =
        request.body.raw !== undefined && request.body.raw !== null
          ? String(request.body.raw)
          : request.body.json
          ? JSON.stringify(request.body.json, null, 2)
          : '';
      if (raw) {
        parts.push(`--data-raw ${escapeShellArg(raw)}`);
      }
    } else if (mode === 'text' || mode === 'raw') {
      if (!hasContentTypeHeader && mode === 'text') {
        parts.push(`-H ${escapeShellArg('Content-Type: text/plain')}`);
      }
      const raw = request.body.raw !== undefined && request.body.raw !== null ? String(request.body.raw) : '';
      if (raw) {
        parts.push(`-d ${escapeShellArg(raw)}`);
      }
    } else if (mode === 'x-www-form-urlencoded') {
      if (!hasContentTypeHeader) {
        parts.push(`-H ${escapeShellArg('Content-Type: application/x-www-form-urlencoded')}`);
      }
      if (Array.isArray(request.body.urlencoded)) {
        const activeForm = request.body.urlencoded.filter(
          (f) => f && f.enabled !== false && f.key && f.key.trim().length > 0
        );
        const formStr = activeForm
          .map((f) => {
            const k = encodeURIComponent(f.key.trim());
            const v = f.value !== null && f.value !== undefined ? encodeURIComponent(String(f.value)) : '';
            return `${k}=${v}`;
          })
          .join('&');
        if (formStr) {
          parts.push(`-d ${escapeShellArg(formStr)}`);
        }
      } else if (request.body.raw) {
        parts.push(`-d ${escapeShellArg(String(request.body.raw))}`);
      }
    }
  }

  // 7. Format Output (Single-line for minimal GET, multiline with \ otherwise)
  let command;
  if (parts.length <= 2) {
    command = parts.join(' ');
  } else {
    command = parts.join(' \\\n  ');
  }

  return {
    format: 'curl',
    command,
    hasSecrets,
  };
}

export default {
  escapeShellArg,
  exportToCurl,
};

