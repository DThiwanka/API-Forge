import { tokenizeCurlCommand } from './curl-tokenizer.js';
import { AppError } from '../../utils/appError.js';

/**
 * Parse raw cURL command into normalized APIForge request definition
 * 
 * @param {string} commandStr - Raw cURL command string
 * @returns {object} Normalized request definition
 */
export function parseCurlCommand(commandStr) {
  if (!commandStr || typeof commandStr !== 'string' || commandStr.trim().length === 0) {
    throw new AppError('cURL command is required', 400);
  }

  const tokens = tokenizeCurlCommand(commandStr);
  if (tokens.length === 0) {
    throw new AppError('Invalid cURL command: Command is empty', 400);
  }

  let rawUrl = null;
  let specifiedMethod = null;
  let isGetWithData = false;
  const headersList = [];
  const dataList = [];
  let basicAuth = null;
  const cookiesList = [];
  let userAgent = null;
  let referer = null;
  let timeoutSeconds = null;
  let followRedirects = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Long option with = syntax (--header=foo:bar)
    let flag = token;
    let inlineVal = null;
    if (token.startsWith('--') && token.includes('=')) {
      const eqIdx = token.indexOf('=');
      flag = token.slice(0, eqIdx);
      inlineVal = token.slice(eqIdx + 1);
    }

    // Helper to get argument value
    const getVal = () => {
      if (inlineVal !== null) return inlineVal;
      if (i + 1 < tokens.length) {
        return tokens[++i];
      }
      return '';
    };

    // Method flag: -X, --request, or -XPOST
    if (flag === '-X' || flag === '--request') {
      specifiedMethod = getVal().toUpperCase();
      continue;
    }
    if (token.startsWith('-X') && token.length > 2) {
      specifiedMethod = token.slice(2).toUpperCase();
      continue;
    }

    // Header flag: -H, --header, or -H"..."
    if (flag === '-H' || flag === '--header') {
      headersList.push(getVal());
      continue;
    }
    if (token.startsWith('-H') && token.length > 2) {
      headersList.push(token.slice(2));
      continue;
    }

    // Data flags: -d, --data, --data-raw, --data-binary, --data-ascii, or -d"..."
    if (
      flag === '-d' ||
      flag === '--data' ||
      flag === '--data-raw' ||
      flag === '--data-binary' ||
      flag === '--data-ascii'
    ) {
      dataList.push({ raw: getVal(), isUrlEncoded: false });
      continue;
    }
    if (token.startsWith('-d') && token.length > 2) {
      dataList.push({ raw: token.slice(2), isUrlEncoded: false });
      continue;
    }

    // Data URL-encoded: --data-urlencode
    if (flag === '--data-urlencode') {
      dataList.push({ raw: getVal(), isUrlEncoded: true });
      continue;
    }

    // GET with data: -G, --get
    if (flag === '-G' || flag === '--get') {
      isGetWithData = true;
      continue;
    }

    // User credentials: -u, --user, or -u"..."
    if (flag === '-u' || flag === '--user') {
      const creds = getVal();
      const colonIdx = creds.indexOf(':');
      if (colonIdx !== -1) {
        basicAuth = {
          username: creds.slice(0, colonIdx),
          password: creds.slice(colonIdx + 1),
        };
      } else {
        basicAuth = { username: creds, password: '' };
      }
      continue;
    }
    if (token.startsWith('-u') && token.length > 2) {
      const creds = token.slice(2);
      const colonIdx = creds.indexOf(':');
      if (colonIdx !== -1) {
        basicAuth = {
          username: creds.slice(0, colonIdx),
          password: creds.slice(colonIdx + 1),
        };
      } else {
        basicAuth = { username: creds, password: '' };
      }
      continue;
    }

    // Cookie: -b, --cookie, or -b"..."
    if (flag === '-b' || flag === '--cookie') {
      cookiesList.push(getVal());
      continue;
    }
    if (token.startsWith('-b') && token.length > 2) {
      cookiesList.push(token.slice(2));
      continue;
    }

    // User-Agent: -A, --user-agent, or -A"..."
    if (flag === '-A' || flag === '--user-agent') {
      userAgent = getVal();
      continue;
    }
    if (token.startsWith('-A') && token.length > 2) {
      userAgent = token.slice(2);
      continue;
    }

    // Referer: -e, --referer, or -e"..."
    if (flag === '-e' || flag === '--referer') {
      referer = getVal();
      continue;
    }
    if (token.startsWith('-e') && token.length > 2) {
      referer = token.slice(2);
      continue;
    }

    // Timeout: -m, --max-time, --connect-timeout, or -m30
    if (flag === '-m' || flag === '--max-time' || flag === '--connect-timeout') {
      timeoutSeconds = Number(getVal());
      continue;
    }
    if (token.startsWith('-m') && token.length > 2) {
      timeoutSeconds = Number(token.slice(2));
      continue;
    }

    // Location / Redirects: -L, --location
    if (flag === '-L' || flag === '--location') {
      followRedirects = true;
      continue;
    }

    // Head method: -I, --head
    if (flag === '-I' || flag === '--head') {
      specifiedMethod = 'HEAD';
      continue;
    }

    // Explicit URL flag: --url
    if (flag === '--url') {
      rawUrl = getVal();
      continue;
    }

    // Safely ignore standard flags that do not alter the request definition
    if (
      flag === '-k' ||
      flag === '--insecure' ||
      flag === '-s' ||
      flag === '--silent' ||
      flag === '-S' ||
      flag === '--show-error' ||
      flag === '-v' ||
      flag === '--verbose' ||
      flag === '-i' ||
      flag === '--include' ||
      flag === '-f' ||
      flag === '--fail' ||
      flag === '--compressed'
    ) {
      continue;
    }

    // Non-flag argument: treated as target URL
    if (!token.startsWith('-') && !rawUrl) {
      rawUrl = token;
    }
  }

  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    throw new AppError('Invalid cURL command: No target URL specified', 400);
  }

  // 1. Separate Base URL and Query Parameters
  let targetUrl = rawUrl.trim();
  const queryParams = [];

  const qIndex = targetUrl.indexOf('?');
  if (qIndex !== -1) {
    const qs = targetUrl.slice(qIndex + 1);
    targetUrl = targetUrl.slice(0, qIndex);
    if (qs.length > 0) {
      const pairs = qs.split('&');
      for (const pair of pairs) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        let k, v;
        if (eqIdx !== -1) {
          k = pair.slice(0, eqIdx);
          v = pair.slice(eqIdx + 1);
        } else {
          k = pair;
          v = '';
        }
        try {
          k = decodeURIComponent(k.replace(/\+/g, ' '));
          v = decodeURIComponent(v.replace(/\+/g, ' '));
        } catch {
          // Keep raw string if decoding fails
        }
        queryParams.push({ key: k, value: v, enabled: true, description: '' });
      }
    }
  }

  // If -G / --get was specified, move dataList into query parameters
  if (isGetWithData) {
    for (const item of dataList) {
      if (!item.raw) continue;
      const pairs = item.raw.split('&');
      for (const p of pairs) {
        if (!p) continue;
        const eqIdx = p.indexOf('=');
        let k, v;
        if (eqIdx !== -1) {
          k = p.slice(0, eqIdx);
          v = p.slice(eqIdx + 1);
        } else {
          k = p;
          v = '';
        }
        try {
          k = decodeURIComponent(k.replace(/\+/g, ' '));
          v = decodeURIComponent(v.replace(/\+/g, ' '));
        } catch {
          // Keep raw string if decoding fails
        }
        queryParams.push({ key: k, value: v, enabled: true, description: '' });
      }
    }
    dataList.length = 0; // Clear body data
  }

  // 2. Determine HTTP Method
  let method = 'GET';
  if (specifiedMethod) {
    method = specifiedMethod;
  } else if (isGetWithData) {
    method = 'GET';
  } else if (dataList.length > 0) {
    method = 'POST';
  }

  // 3. Process Headers & Authentication
  const headers = [];
  let auth = { type: 'none' };

  for (const headerStr of headersList) {
    if (!headerStr || typeof headerStr !== 'string') continue;
    const colonIdx = headerStr.indexOf(':');
    if (colonIdx === -1) continue;

    const key = headerStr.slice(0, colonIdx).trim();
    const value = headerStr.slice(colonIdx + 1).trim();
    if (!key) continue;

    // Check for Authorization header
    if (key.toLowerCase() === 'authorization') {
      if (value.toLowerCase().startsWith('bearer ')) {
        auth = {
          type: 'bearer',
          bearer: { token: value.slice(7).trim() },
        };
        continue;
      }
      if (value.toLowerCase().startsWith('basic ')) {
        try {
          const decoded = Buffer.from(value.slice(6).trim(), 'base64').toString('utf-8');
          const [u, ...p] = decoded.split(':');
          auth = {
            type: 'basic',
            basic: { username: u, password: p.join(':') },
          };
          continue;
        } catch {
          // If decoding fails, fall through to normal header
        }
      }
    }

    headers.push({ key, value, enabled: true, description: '' });
  }

  // If -u / --user was passed and auth not already set
  if (basicAuth && auth.type === 'none') {
    auth = {
      type: 'basic',
      basic: basicAuth,
    };
  }

  // Cookies from -b / --cookie
  if (cookiesList.length > 0) {
    headers.push({
      key: 'Cookie',
      value: cookiesList.join('; '),
      enabled: true,
      description: '',
    });
  }

  // User-Agent from -A / --user-agent
  if (userAgent) {
    headers.push({
      key: 'User-Agent',
      value: userAgent,
      enabled: true,
      description: '',
    });
  }

  // Referer from -e / --referer
  if (referer) {
    headers.push({
      key: 'Referer',
      value: referer,
      enabled: true,
      description: '',
    });
  }

  // 4. Process Body
  let body = { mode: 'none' };
  if (dataList.length > 0) {
    const rawParts = [];
    const urlencodedItems = [];

    for (const item of dataList) {
      if (item.isUrlEncoded) {
        if (item.raw.includes('=')) {
          const eq = item.raw.indexOf('=');
          const k = item.raw.slice(0, eq);
          const v = item.raw.slice(eq + 1);
          urlencodedItems.push({ key: k, value: v, enabled: true, description: '' });
          rawParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        } else {
          rawParts.push(encodeURIComponent(item.raw));
        }
      } else {
        rawParts.push(item.raw);
        if (item.raw.includes('=')) {
          const pairs = item.raw.split('&');
          for (const p of pairs) {
            if (!p) continue;
            const eq = p.indexOf('=');
            if (eq !== -1) {
              try {
                urlencodedItems.push({
                  key: decodeURIComponent(p.slice(0, eq).replace(/\+/g, ' ')),
                  value: decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' ')),
                  enabled: true,
                  description: '',
                });
              } catch {
                urlencodedItems.push({
                  key: p.slice(0, eq),
                  value: p.slice(eq + 1),
                  enabled: true,
                  description: '',
                });
              }
            }
          }
        }
      }
    }

    const bodyRaw = rawParts.join('&');

    // Determine mode based on Content-Type or heuristics
    const ctHeader = headers.find((h) => h.key.toLowerCase() === 'content-type');
    let mode = 'text';

    if (ctHeader) {
      const ctVal = ctHeader.value.toLowerCase();
      if (ctVal.includes('application/json') || ctVal.endsWith('+json')) {
        mode = 'json';
      } else if (ctVal.includes('application/x-www-form-urlencoded')) {
        mode = 'x-www-form-urlencoded';
      } else if (ctVal.includes('text/plain') || ctVal.includes('text/')) {
        mode = 'text';
      } else {
        mode = 'raw';
      }
    } else {
      const trimmed = bodyRaw.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          JSON.parse(trimmed);
          mode = 'json';
        } catch {
          mode = 'text';
        }
      } else if (dataList.some((d) => d.isUrlEncoded) || (trimmed.includes('=') && !trimmed.includes(' '))) {
        mode = 'x-www-form-urlencoded';
      } else {
        mode = 'text';
      }
    }

    if (mode === 'json') {
      body = { mode: 'json', raw: bodyRaw };
    } else if (mode === 'x-www-form-urlencoded') {
      body = {
        mode: 'x-www-form-urlencoded',
        raw: bodyRaw,
        urlencoded:
          urlencodedItems.length > 0
            ? urlencodedItems
            : [{ key: '', value: '', enabled: true, description: '' }],
      };
    } else {
      body = { mode, raw: bodyRaw };
    }
  }

  // 5. Settings
  const settings = {
    timeout:
      timeoutSeconds !== null && !isNaN(timeoutSeconds) && timeoutSeconds > 0
        ? Math.round(timeoutSeconds * 1000)
        : 30000,
    followRedirects: Boolean(followRedirects),
  };

  // 6. Generate Default Request Name
  let name = `${method} ${targetUrl}`;
  try {
    const parsed = new URL(targetUrl);
    name = `${method} ${parsed.pathname || '/'}`;
  } catch {
    const match = targetUrl.match(/\/[a-zA-Z0-9_.-]+/g);
    if (match && match.length > 0) {
      name = `${method} ${match.join('')}`;
    }
  }
  if (name.length > 150) {
    name = name.slice(0, 147) + '...';
  }

  return {
    name,
    method,
    url: targetUrl,
    queryParams,
    headers,
    auth,
    body,
    settings,
  };
}

export default {
  parseCurlCommand,
};

