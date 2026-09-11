import { validate } from '@readme/openapi-parser';
import YAML from 'yaml';
import prisma from '../../config/database.js';
import { AppError } from '../../utils/appError.js';

const SENSITIVE_KEY_REGEX =
  /^(authorization|cookie|set-cookie|x[_-]?api[_-]?key|api[_-]?key|apikey|x[_-]?auth[_-]?token|token|secret|password|client[_-]?secret)$/i;

const SUPPORTED_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Check if a parameter/header key is sensitive and should not expose values
 */
export function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false;
  return SENSITIVE_KEY_REGEX.test(key.trim());
}

/**
 * Convert arbitrary string name to clean camelCase operationId
 */
export function toCamelCase(str) {
  if (!str || typeof str !== 'string') return '';
  const cleaned = str.replace(/[^a-zA-Z0-9\s_-]/g, ' ').trim();
  if (!cleaned) return '';

  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return '';

  return words
    .map((w, index) => {
      const lower = w.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/**
 * Sanitize APIForge request URL into an OpenAPI-compliant path template
 * Converts {{baseUrl}}/users/{{id}} -> /users/{id}
 */
export function sanitizePath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { path: '/', origin: null, pathParams: [] };
  }

  let cleaned = rawUrl.trim();

  // Strip query string if embedded in raw URL
  if (cleaned.includes('?')) {
    cleaned = cleaned.split('?')[0];
  }

  // Strip {{baseUrl}} or {{base_url}} prefix
  cleaned = cleaned.replace(/^\{\{\s*(?:baseUrl|base_url)\s*\}\}/i, '');

  let origin = null;

  // If URL starts with http:// or https://, extract origin and pathname
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const urlObj = new URL(cleaned);
      origin = urlObj.origin;
      cleaned = decodeURIComponent(urlObj.pathname);
    } catch {
      // If URL parsing fails, strip protocol and domain manually
      cleaned = cleaned.replace(/^https?:\/\/[^/]+/i, '');
    }
  }

  // Ensure leading slash
  if (!cleaned.startsWith('/')) {
    cleaned = `/${cleaned}`;
  }

  // Convert {{param}} syntax in path to OpenAPI {param} syntax
  cleaned = cleaned.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, '{$1}');

  // Extract all path parameter names {param}
  const matches = cleaned.match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
  const pathParams = Array.from(new Set(matches.map((m) => m.slice(1, -1))));

  return {
    path: cleaned,
    origin,
    pathParams,
  };
}

/**
 * Build OpenAPI parameters (path, query, header) without exposing sensitive header credentials
 */
export function buildParameters(queryParams = [], headers = [], pathParams = []) {
  const parameters = [];
  const seenParamKeys = new Set();

  // 1. Required Path Parameters (extracted from URL template)
  for (const p of pathParams) {
    const key = `path:${p}`;
    if (!seenParamKeys.has(key)) {
      seenParamKeys.add(key);
      parameters.push({
        name: p,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    }
  }

  // 2. Query Parameters
  if (Array.isArray(queryParams)) {
    for (const q of queryParams) {
      if (!q || typeof q !== 'object' || q.enabled === false) continue;
      const paramName = q.key ? String(q.key).trim() : '';
      if (!paramName) continue;

      const key = `query:${paramName}`;
      if (seenParamKeys.has(key)) continue;
      seenParamKeys.add(key);

      const paramObj = {
        name: paramName,
        in: 'query',
        required: false,
        schema: { type: 'string' },
      };

      if (q.description && typeof q.description === 'string' && q.description.trim()) {
        paramObj.description = q.description.trim();
      }

      if (q.value !== undefined && q.value !== null && String(q.value).trim() !== '') {
        if (!isSensitiveKey(paramName)) {
          paramObj.example = String(q.value);
        }
      }

      parameters.push(paramObj);
    }
  }

  // 3. Header Parameters (excluding sensitive headers and Content-Type / Accept)
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (!h || typeof h !== 'object' || h.enabled === false) continue;
      const headerName = h.key ? String(h.key).trim() : '';
      if (!headerName) continue;

      const lower = headerName.toLowerCase();
      // Per OpenAPI 3.0 specification: Content-Type, Accept, Authorization, Cookie, Set-Cookie must not be defined as header parameters
      if (
        lower === 'content-type' ||
        lower === 'accept' ||
        lower === 'authorization' ||
        lower === 'cookie' ||
        lower === 'set-cookie' ||
        isSensitiveKey(headerName)
      ) {
        continue;
      }

      const key = `header:${headerName}`;
      if (seenParamKeys.has(key)) continue;
      seenParamKeys.add(key);

      const headerObj = {
        name: headerName,
        in: 'header',
        required: false,
        schema: { type: 'string' },
      };

      if (h.description && typeof h.description === 'string' && h.description.trim()) {
        headerObj.description = h.description.trim();
      }

      if (h.value !== undefined && h.value !== null && String(h.value).trim() !== '') {
        headerObj.example = String(h.value);
      }

      parameters.push(headerObj);
    }
  }

  return parameters;
}

/**
 * Build OpenAPI requestBody from APIForge request body mode and data
 */
export function buildRequestBody(body) {
  if (!body || typeof body !== 'object' || !body.mode || body.mode === 'none') {
    return null;
  }

  switch (body.mode) {
    case 'json': {
      let exampleVal = null;
      if (body.json !== undefined && body.json !== null) {
        if (typeof body.json === 'object') {
          exampleVal = body.json;
        } else if (typeof body.json === 'string' && body.json.trim()) {
          try {
            exampleVal = JSON.parse(body.json);
          } catch {
            exampleVal = body.json;
          }
        }
      } else if (body.raw && typeof body.raw === 'string' && body.raw.trim()) {
        try {
          exampleVal = JSON.parse(body.raw);
        } catch {
          exampleVal = body.raw;
        }
      }

      const isArray = Array.isArray(exampleVal);
      return {
        required: true,
        content: {
          'application/json': {
            schema: isArray ? { type: 'array', items: { type: 'object' } } : { type: 'object' },
            ...(exampleVal !== null ? { example: exampleVal } : {}),
          },
        },
      };
    }

    case 'text': {
      const textVal = body.text || body.raw || '';
      return {
        required: true,
        content: {
          'text/plain': {
            schema: { type: 'string' },
            ...(textVal ? { example: textVal } : {}),
          },
        },
      };
    }

    case 'x-www-form-urlencoded': {
      const properties = {};
      if (Array.isArray(body.urlEncoded)) {
        for (const item of body.urlEncoded) {
          if (item?.key && item.enabled !== false) {
            properties[item.key] = {
              type: 'string',
              ...(item.value ? { example: item.value } : {}),
            };
          }
        }
      }
      return {
        required: true,
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties,
            },
          },
        },
      };
    }

    case 'form-data': {
      const properties = {};
      if (Array.isArray(body.formData)) {
        for (const item of body.formData) {
          if (item?.key && item.enabled !== false) {
            properties[item.key] =
              item.type === 'file'
                ? { type: 'string', format: 'binary' }
                : {
                    type: 'string',
                    ...(item.value ? { example: item.value } : {}),
                  };
          }
        }
      }
      return {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties,
            },
          },
        },
      };
    }

    case 'raw': {
      let exampleVal = null;
      let isJson = false;
      if (body.raw && typeof body.raw === 'string' && body.raw.trim()) {
        try {
          exampleVal = JSON.parse(body.raw);
          isJson = true;
        } catch {
          exampleVal = body.raw;
        }
      }

      if (isJson) {
        return {
          required: true,
          content: {
            'application/json': {
              schema: Array.isArray(exampleVal)
                ? { type: 'array', items: { type: 'object' } }
                : { type: 'object' },
              ...(exampleVal !== null ? { example: exampleVal } : {}),
            },
          },
        };
      }

      return {
        required: true,
        content: {
          'text/plain': {
            schema: { type: 'string' },
            ...(exampleVal ? { example: exampleVal } : {}),
          },
        },
      };
    }

    default:
      return null;
  }
}

/**
 * Build OpenAPI security requirements and register security schemes
 * NEVER writes tokens, passwords, or actual key values into output
 */
export function buildSecurity(auth, securitySchemesMap) {
  if (!auth || typeof auth !== 'object' || !auth.type || auth.type === 'none') {
    return null;
  }

  switch (auth.type) {
    case 'bearer': {
      securitySchemesMap.set('BearerAuth', {
        type: 'http',
        scheme: 'bearer',
      });
      return [{ BearerAuth: [] }];
    }

    case 'basic': {
      securitySchemesMap.set('BasicAuth', {
        type: 'http',
        scheme: 'basic',
      });
      return [{ BasicAuth: [] }];
    }

    case 'api-key': {
      const inLoc = auth.in === 'query' ? 'query' : 'header';
      const schemeKey = inLoc === 'query' ? 'ApiKeyQueryAuth' : 'ApiKeyHeaderAuth';
      const keyName = auth.key ? String(auth.key).trim() : inLoc === 'query' ? 'api_key' : 'X-API-Key';

      securitySchemesMap.set(schemeKey, {
        type: 'apiKey',
        in: inLoc,
        name: keyName,
      });
      return [{ [schemeKey]: [] }];
    }

    default:
      return null;
  }
}

/**
 * Generate a complete, normalized OpenAPI 3.0.3 document object from collection resources
 *
 * @param {object} collection
 * @param {Array<object>} [folders]
 * @param {Array<object>} [requests]
 * @returns {Promise<{ document: object, warnings: Array<string> }>}
 */
export async function generateOpenApiDocument(collection, folders = [], requests = []) {
  if (!collection || !collection.name) {
    throw new AppError('Valid collection definition is required for OpenAPI export', 400);
  }

  const warnings = [];

  // 1. Info Object
  const info = {
    title: collection.name.trim(),
    version: '1.0.0',
  };

  if (collection.description && collection.description.trim()) {
    info.description = collection.description.trim();
  }

  // 2. Folder to Tag Mapping
  const tags = [];
  const tagSet = new Set();
  const folderMap = new Map(); // folderId -> folderName

  if (Array.isArray(folders)) {
    for (const f of folders) {
      if (f?.id && f.name) {
        folderMap.set(f.id, f.name.trim());
        const tagName = f.name.trim();
        if (!tagSet.has(tagName)) {
          tagSet.add(tagName);
          const tagObj = { name: tagName };
          if (f.description && f.description.trim()) {
            tagObj.description = f.description.trim();
          }
          tags.push(tagObj);
        }
      }
    }
  }

  // 3. Paths & Operations
  const paths = {};
  const usedOperationIds = new Set();
  const securitySchemesMap = new Map();
  const detectedOrigins = new Set();

  for (const req of requests) {
    let method = req.method ? String(req.method).trim().toLowerCase() : 'get';
    if (!SUPPORTED_HTTP_METHODS.includes(method)) {
      method = 'get';
    }

    const { path, origin, pathParams } = sanitizePath(req.url || '/');
    if (origin) {
      detectedOrigins.add(origin);
    }

    if (!paths[path]) {
      paths[path] = {};
    }

    // Handle duplicate (path, method) conflict deterministically without losing data
    if (paths[path][method]) {
      const existing = paths[path][method];
      existing.summary = `${existing.summary} / ${req.name || 'Request'}`;
      if (req.name) {
        warnings.push(
          `Duplicate operation for ${method.toUpperCase()} ${path}: merged "${req.name}" into existing operation summary`
        );
      }
      continue;
    }

    // Determine deterministic operationId
    let baseOpId = toCamelCase(req.name) || `${method}${toCamelCase(path.replace(/[{}]/g, ''))}`;
    if (!baseOpId) {
      baseOpId = `${method}Operation`;
    }

    let opId = baseOpId;
    let suffix = 2;
    while (usedOperationIds.has(opId)) {
      opId = `${baseOpId}_${suffix++}`;
    }
    usedOperationIds.add(opId);

    // Build operation fields
    const parameters = buildParameters(req.queryParams, req.headers, pathParams);
    const requestBody = buildRequestBody(req.body);
    const security = buildSecurity(req.auth, securitySchemesMap);

    // Determine Tag from Folder
    const operationTags = [];
    const targetFolderId = req.folderId || req.folder?.id;
    const targetFolderName = req.folder?.name || (targetFolderId ? folderMap.get(targetFolderId) : null);

    if (targetFolderName) {
      const trimmedTag = targetFolderName.trim();
      operationTags.push(trimmedTag);
      if (!tagSet.has(trimmedTag)) {
        tagSet.add(trimmedTag);
        tags.push({ name: trimmedTag });
      }
    }

    const operation = {
      operationId: opId,
      summary: req.name ? req.name.trim() : `${method.toUpperCase()} ${path}`,
      responses: {
        '200': {
          description: 'Successful response',
        },
      },
    };

    if (operationTags.length > 0) {
      operation.tags = operationTags;
    }

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    if (requestBody) {
      operation.requestBody = requestBody;
    }

    if (security) {
      operation.security = security;
    }

    paths[path][method] = operation;
  }

  // 4. Servers
  const servers = [];
  if (detectedOrigins.size === 1) {
    servers.push({ url: Array.from(detectedOrigins)[0] });
  }

  // 5. Components Object
  const components = {};
  if (securitySchemesMap.size > 0) {
    components.securitySchemes = Object.fromEntries(securitySchemesMap.entries());
  }

  const document = {
    openapi: '3.0.3',
    info,
    servers,
    ...(tags.length > 0 ? { tags } : {}),
    paths,
    ...(Object.keys(components).length > 0 ? { components } : {}),
  };

  // 6. Validate generated document against OpenAPI 3.0.3 schema
  try {
    // Clone document before validation to avoid in-place mutations
    await validate(JSON.parse(JSON.stringify(document)));
  } catch (valErr) {
    throw new AppError(`Generated OpenAPI specification is invalid: ${valErr.message}`, 500);
  }

  return {
    document,
    warnings,
  };
}

/**
 * Format OpenAPI document as a pretty-printed JSON string
 */
export function serializeToJson(doc) {
  return JSON.stringify(doc, null, 2);
}

/**
 * Format OpenAPI document as a valid YAML string
 */
export function serializeToYaml(doc) {
  return YAML.stringify(doc, {
    indent: 2,
    aliasDuplicateObjects: false,
  });
}

/**
 * Sanitize collection name into a safe filename slug
 */
export function sanitizeFilename(name = 'api', format = 'json') {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'api';
  return `${slug}.openapi.${format.toLowerCase() === 'yaml' ? 'yaml' : 'json'}`;
}

/**
 * Export a collection as an OpenAPI 3.0.3 specification in JSON or YAML
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} [params.format='json']
 * @returns {Promise<{ content: string, format: string, filename: string, mimeType: string, document: object, warnings: Array<string> }>}
 */
export async function exportCollectionAsOpenApi({
  workspaceId,
  collectionId,
  format = 'json',
}) {
  if (!workspaceId || !collectionId) {
    throw new AppError('workspaceId and collectionId are required', 400);
  }

  const normalizedFormat = format?.toLowerCase() === 'yaml' ? 'yaml' : 'json';

  // Load collection with folders and requests within workspace isolation
  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      workspaceId,
    },
    include: {
      folders: {
        orderBy: { position: 'asc' },
      },
      requests: {
        include: { folder: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const { document, warnings } = await generateOpenApiDocument(
    collection,
    collection.folders,
    collection.requests
  );

  const isYaml = normalizedFormat === 'yaml';
  const content = isYaml ? serializeToYaml(document) : serializeToJson(document);
  const filename = sanitizeFilename(collection.name, normalizedFormat);
  const mimeType = isYaml ? 'application/yaml; charset=utf-8' : 'application/json; charset=utf-8';

  return {
    content,
    format: normalizedFormat,
    filename,
    mimeType,
    document,
    warnings,
  };
}

export default {
  isSensitiveKey,
  toCamelCase,
  sanitizePath,
  buildParameters,
  buildRequestBody,
  buildSecurity,
  generateOpenApiDocument,
  serializeToJson,
  serializeToYaml,
  sanitizeFilename,
  exportCollectionAsOpenApi,
};
