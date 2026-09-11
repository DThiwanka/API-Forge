import { AppError } from '../../utils/appError.js';

const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/**
 * Perform non-executable string substitution of {{variable}} placeholders.
 * Throws 400 AppError if any referenced variable is missing from the variables dictionary.
 * 
 * @param {any} target - String, Object, Array, or primitive
 * @param {Record<string, any>} [variables={}] - Key-value map of variable values
 * @returns {any} Target with all variables resolved
 */
export function resolveVariables(target, variables = {}) {
  if (target === null || target === undefined) {
    return target;
  }

  const vars = variables && typeof variables === 'object' ? variables : {};

  if (typeof target === 'string') {
    return target.replace(VARIABLE_REGEX, (match, varName) => {
      if (vars[varName] === undefined || vars[varName] === null) {
        throw new AppError(`Missing required variable: {{${varName}}}`, 400, [
          { field: 'variables', message: `Variable '${varName}' is not defined` },
        ]);
      }
      return String(vars[varName]);
    });
  }

  if (Array.isArray(target)) {
    return target.map((item) => resolveVariables(item, vars));
  }

  if (typeof target === 'object' && !(target instanceof Date) && !(target instanceof RegExp)) {
    const resolvedObj = {};
    for (const [key, value] of Object.entries(target)) {
      const resolvedKey = resolveVariables(key, vars);
      const resolvedValue = resolveVariables(value, vars);
      resolvedObj[resolvedKey] = resolvedValue;
    }
    return resolvedObj;
  }

  return target;
}

/**
 * Filter enabled headers, resolve variables, and return key-value object
 * 
 * @param {Array<{key: string, value: string, enabled?: boolean}>|null} headers
 * @param {Record<string, any>} [variables={}]
 * @returns {Record<string, string>}
 */
export function transformHeaders(headers, variables = {}) {
  const result = {};
  if (!Array.isArray(headers)) return result;

  for (const item of headers) {
    if (!item || typeof item !== 'object') continue;
    if (item.enabled === false) continue;
    if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) continue;

    const resolvedKey = resolveVariables(item.key.trim(), variables);
    const resolvedValue = resolveVariables(item.value !== undefined && item.value !== null ? String(item.value) : '', variables);

    if (resolvedKey) {
      result[resolvedKey] = resolvedValue;
    }
  }

  return result;
}

/**
 * Filter enabled query parameters, resolve variables, and append to URL
 * 
 * @param {string} rawUrl - Base or template URL
 * @param {Array<{key: string, value: string, enabled?: boolean}>|null} queryParams
 * @param {Record<string, any>} [variables={}]
 * @returns {string} URL with resolved query parameters attached
 */
export function transformQueryParams(rawUrl, queryParams, variables = {}) {
  const resolvedUrl = resolveVariables(rawUrl, variables);
  if (!Array.isArray(queryParams) || queryParams.length === 0) {
    return resolvedUrl;
  }

  // Check if resolvedUrl is a valid full URL
  let urlObj;
  try {
    urlObj = new URL(resolvedUrl);
  } catch {
    // If not a full URL (e.g. relative or missing protocol), append query string manually
    const queryParts = [];
    for (const item of queryParams) {
      if (!item || typeof item !== 'object') continue;
      if (item.enabled === false) continue;
      if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) continue;

      const k = encodeURIComponent(resolveVariables(item.key.trim(), variables));
      const v = encodeURIComponent(resolveVariables(item.value !== undefined && item.value !== null ? String(item.value) : '', variables));
      queryParts.push(`${k}=${v}`);
    }

    if (queryParts.length === 0) return resolvedUrl;
    const separator = resolvedUrl.includes('?') ? '&' : '?';
    return `${resolvedUrl}${separator}${queryParts.join('&')}`;
  }

  // Use URL object for standard parsing and query merging
  for (const item of queryParams) {
    if (!item || typeof item !== 'object') continue;
    if (item.enabled === false) continue;
    if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) continue;

    const k = resolveVariables(item.key.trim(), variables);
    const v = resolveVariables(item.value !== undefined && item.value !== null ? String(item.value) : '', variables);
    urlObj.searchParams.append(k, v);
  }

  return urlObj.toString();
}

/**
 * Transform authentication settings into HTTP headers or query parameter additions
 * 
 * @param {object|null} auth
 * @param {Record<string, any>} [variables={}]
 * @param {Record<string, string>} [currentHeaders={}]
 * @returns {{ headers: Record<string, string>, extraQueryParams: Array<{key: string, value: string}> }}
 */
export function transformAuth(auth, variables = {}, currentHeaders = {}) {
  const headers = { ...currentHeaders };
  const extraQueryParams = [];

  if (!auth || typeof auth !== 'object' || !auth.type || auth.type === 'none') {
    return { headers, extraQueryParams };
  }

  switch (auth.type) {
    case 'bearer': {
      const token = auth.bearer?.token ?? auth.token;
      if (token) {
        const resolvedToken = resolveVariables(String(token).trim(), variables);
        headers['Authorization'] = `Bearer ${resolvedToken}`;
      }
      break;
    }
    case 'basic': {
      const username = auth.basic?.username ?? auth.username ?? '';
      const password = auth.basic?.password ?? auth.password ?? '';
      const resolvedUsername = resolveVariables(String(username), variables);
      const resolvedPassword = resolveVariables(String(password), variables);
      const credentials = Buffer.from(`${resolvedUsername}:${resolvedPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      break;
    }
    case 'api-key': {
      const key = auth.apiKey?.key ?? auth.key;
      const value = auth.apiKey?.value ?? auth.value ?? '';
      const addTo = auth.apiKey?.addTo ?? auth.addTo ?? 'header';

      if (key) {
        const resolvedKey = resolveVariables(String(key).trim(), variables);
        const resolvedValue = resolveVariables(String(value), variables);

        if (addTo.toLowerCase() === 'query') {
          extraQueryParams.push({ key: resolvedKey, value: resolvedValue });
        } else {
          headers[resolvedKey] = resolvedValue;
        }
      }
      break;
    }
    default:
      break;
  }

  return { headers, extraQueryParams };
}

/**
 * Transform body configuration into an outbound HTTP body and headers
 * 
 * @param {object|null} body
 * @param {Record<string, any>} [variables={}]
 * @param {Record<string, string>} [currentHeaders={}]
 * @returns {{ body: string|undefined, headers: Record<string, string> }}
 */
export function transformBody(body, variables = {}, currentHeaders = {}) {
  const headers = { ...currentHeaders };

  // Helper to check if Content-Type already set case-insensitively
  const hasContentType = Object.keys(headers).some(
    (h) => h.toLowerCase() === 'content-type'
  );

  if (!body || typeof body !== 'object' || !body.mode || body.mode === 'none') {
    return { body: undefined, headers };
  }

  switch (body.mode) {
    case 'json': {
      if (!hasContentType) {
        headers['Content-Type'] = 'application/json';
      }
      const rawContent = body.raw !== undefined ? body.raw : body.json;
      if (rawContent === undefined || rawContent === null) {
        return { body: undefined, headers };
      }
      if (typeof rawContent === 'string') {
        const resolved = resolveVariables(rawContent, variables);
        return { body: resolved, headers };
      }
      const resolved = resolveVariables(rawContent, variables);
      return { body: JSON.stringify(resolved), headers };
    }

    case 'text': {
      if (!hasContentType) {
        headers['Content-Type'] = 'text/plain';
      }
      const rawContent = body.raw !== undefined ? body.raw : '';
      const resolved = resolveVariables(String(rawContent), variables);
      return { body: resolved, headers };
    }

    case 'raw': {
      const rawContent = body.raw !== undefined ? body.raw : '';
      const resolved = resolveVariables(String(rawContent), variables);
      return { body: resolved, headers };
    }

    case 'x-www-form-urlencoded': {
      if (!hasContentType) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      if (Array.isArray(body.urlencoded)) {
        const params = new URLSearchParams();
        for (const item of body.urlencoded) {
          if (!item || item.enabled === false || !item.key) continue;
          const k = resolveVariables(item.key.trim(), variables);
          const v = resolveVariables(item.value !== undefined && item.value !== null ? String(item.value) : '', variables);
          params.append(k, v);
        }
        return { body: params.toString(), headers };
      }

      if (body.raw) {
        return { body: resolveVariables(String(body.raw), variables), headers };
      }

      return { body: undefined, headers };
    }

    default:
      return { body: undefined, headers };
  }
}

/**
 * Orchestrate complete preparation of an executable request
 * 
 * @param {object} request - Stored Request entity
 * @param {Record<string, any>} [runtimeVariables={}]
 * @returns {{
 *   method: string,
 *   url: string,
 *   headers: Record<string, string>,
 *   body: string|undefined,
 *   settings: object
 * }}
 */
export function prepareExecutableRequest(request, runtimeVariables = {}) {
  const variables = runtimeVariables && typeof runtimeVariables === 'object' ? runtimeVariables : {};

  // 1. Transform basic headers
  let headers = transformHeaders(request.headers, variables);

  // 2. Transform auth
  const authResult = transformAuth(request.auth, variables, headers);
  headers = authResult.headers;

  // 3. Combine request query parameters with any auth query parameters
  const allQueryParams = [
    ...(Array.isArray(request.queryParams) ? request.queryParams : []),
    ...authResult.extraQueryParams,
  ];

  // 4. Transform URL and attach query parameters
  const finalUrl = transformQueryParams(request.url, allQueryParams, variables);

  // 5. Transform body and finalize headers
  const bodyResult = transformBody(request.body, variables, headers);
  headers = bodyResult.headers;

  // 6. Settings
  const settings = resolveVariables(request.settings || {}, variables);

  return {
    method: (request.method || 'GET').toUpperCase(),
    url: finalUrl,
    headers,
    body: bodyResult.body,
    settings,
  };
}

export default {
  resolveVariables,
  transformHeaders,
  transformQueryParams,
  transformAuth,
  transformBody,
  prepareExecutableRequest,
};

