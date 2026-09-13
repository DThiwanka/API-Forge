export const METHODS = [
  {
    method: 'GET',
    color: 'text-emerald-400',
    badge: 'bg-emerald-950/40 border-emerald-800/50',
    description: 'Retrieve resource data',
  },
  {
    method: 'POST',
    color: 'text-amber-400',
    badge: 'bg-amber-950/40 border-amber-800/50',
    description: 'Submit or create resource',
  },
  {
    method: 'PUT',
    color: 'text-blue-400',
    badge: 'bg-blue-950/40 border-blue-800/50',
    description: 'Replace entire resource',
  },
  {
    method: 'PATCH',
    color: 'text-purple-400',
    badge: 'bg-purple-950/40 border-purple-800/50',
    description: 'Apply partial modifications',
  },
  {
    method: 'DELETE',
    color: 'text-rose-400',
    badge: 'bg-rose-950/40 border-rose-800/50',
    description: 'Remove resource',
  },
  {
    method: 'HEAD',
    color: 'text-teal-400',
    badge: 'bg-teal-950/40 border-teal-800/50',
    description: 'Retrieve response headers only',
  },
  {
    method: 'OPTIONS',
    color: 'text-indigo-400',
    badge: 'bg-indigo-950/40 border-indigo-800/50',
    description: 'Describe communication options',
  },
];

export function getMethodConfig(method) {
  const normalized = (method || 'GET').toUpperCase();
  return METHODS.find((m) => m.method === normalized) || METHODS[0];
}

/**
 * Check if the HTTP method and body are compatible or if an informational warning should be displayed.
 * Does not remove or alter the body — preserves user content.
 * 
 * @param {string} method 
 * @param {object} body 
 * @returns {{ hasNotice: boolean, message: string }}
 */
export function checkMethodBodyCompatibility(method = 'GET', body = null) {
  const normMethod = (method || 'GET').toUpperCase();
  const hasBody = Boolean(
    body &&
    body.mode &&
    body.mode !== 'none' &&
    ((body.mode === 'json' || body.mode === 'text' || body.mode === 'raw')
      ? Boolean(body.raw && body.raw.trim())
      : true)
  );

  if (!hasBody) {
    return { hasNotice: false, message: '' };
  }

  if (normMethod === 'GET') {
    return {
      hasNotice: true,
      message: 'GET requests typically do not include a payload body. The body is retained and will be sent if the destination server permits it.',
    };
  }

  if (normMethod === 'HEAD') {
    return {
      hasNotice: true,
      message: 'HEAD requests do not typically send a request body.',
    };
  }

  if (normMethod === 'OPTIONS') {
    return {
      hasNotice: true,
      message: 'OPTIONS requests typically do not include a payload body.',
    };
  }

  return { hasNotice: false, message: '' };
}

export default METHODS;
