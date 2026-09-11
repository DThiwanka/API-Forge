import { dereference } from '@readme/openapi-parser';
import YAML from 'yaml';
import prisma from '../../config/database.js';
import { AppError } from '../../utils/appError.js';

const MAX_DOCUMENT_SIZE = 5000000; // 5 MB max
const SUPPORTED_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/**
 * Safely parse a raw OpenAPI input string (JSON or YAML) into a JS object
 * with size bounds and YAML entity expansion guards.
 *
 * @param {string|object} rawInput
 * @returns {object}
 */
export function parseDocument(rawInput) {
  if (!rawInput) {
    throw new AppError('OpenAPI document is required', 400);
  }

  if (typeof rawInput === 'object') {
    return rawInput;
  }

  if (typeof rawInput !== 'string') {
    throw new AppError('OpenAPI document must be a string or JSON object', 400);
  }

  if (rawInput.length > MAX_DOCUMENT_SIZE) {
    throw new AppError(
      `OpenAPI document exceeds maximum allowed size of ${MAX_DOCUMENT_SIZE} characters`,
      400
    );
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new AppError('OpenAPI document cannot be empty', 400);
  }

  // Attempt fast JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // If not JSON, parse as YAML with maxAliasCount guard to prevent YAML bombs
    try {
      return YAML.parse(trimmed, { maxAliasCount: 100 });
    } catch (yamlErr) {
      throw new AppError(
        `Failed to parse OpenAPI document as JSON or YAML: ${yamlErr.message}`,
        400
      );
    }
  }
}

/**
 * Safely dereference local references (#/components/...) in the specification.
 * Strictly forbids remote network fetching (http/https) and local filesystem access (file://).
 *
 * @param {object} doc
 * @returns {Promise<object>}
 */
export async function dereferenceSpec(doc) {
  if (!doc || typeof doc !== 'object') {
    throw new AppError('Invalid OpenAPI document structure', 400);
  }

  // Version verification
  const openapiVersion = doc.openapi;
  if (!openapiVersion || typeof openapiVersion !== 'string') {
    if (doc.swagger) {
      throw new AppError(
        'Swagger 2.0 is not supported. Please provide an OpenAPI 3.0 or 3.1 specification.',
        400
      );
    }
    throw new AppError(
      'Missing or invalid "openapi" version field. Only OpenAPI 3.0 and 3.1 are supported.',
      400
    );
  }

  if (!openapiVersion.startsWith('3.0') && !openapiVersion.startsWith('3.1')) {
    throw new AppError(
      `Unsupported OpenAPI version "${openapiVersion}". Only OpenAPI 3.0 and 3.1 are supported.`,
      400
    );
  }

  // Strictly reject any external $ref targeting URLs or external files
  function scanForExternalRefs(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      if (key === '$ref' && typeof value === 'string') {
        const lower = value.trim().toLowerCase();
        if (
          lower.startsWith('http://') ||
          lower.startsWith('https://') ||
          lower.startsWith('file://') ||
          !lower.startsWith('#')
        ) {
          throw new AppError(
            `External references ($ref: "${value}") are not permitted for security reasons. All references must be internal to the document (#/components/...).`,
            400
          );
        }
      } else if (typeof value === 'object') {
        scanForExternalRefs(value);
      }
    }
  }
  scanForExternalRefs(doc);

  try {
    // Deep clone doc to avoid mutating original input
    const clone = JSON.parse(JSON.stringify(doc));

    return await dereference(clone, {
      resolve: {
        http: false,
        https: false,
        file: false,
        external: false,
      },
      dereference: {
        circular: 'ignore', // prevent stack overflow on circular schemas
      },
    });
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('http') || msg.includes('file') || msg.includes('external')) {
      throw new AppError(
        'External references ($ref to URLs or files) are not permitted for security reasons. All references must be internal to the document (#/components/...).',
        400
      );
    }
    throw new AppError(`OpenAPI reference resolution error: ${msg}`, 400);
  }
}

/**
 * Recursively generate a mock JSON payload from an OpenAPI schema definition.
 * Enforces a maximum recursion depth of 5 to protect against circular schemas.
 *
 * @param {object} schema
 * @param {number} depth
 * @returns {any}
 */
export function mockJsonFromSchema(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || depth > 5) {
    return null;
  }

  // 1. Explicit examples
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  // 2. Handle allOf
  if (Array.isArray(schema.allOf)) {
    const merged = {};
    for (const sub of schema.allOf) {
      const mockSub = mockJsonFromSchema(sub, depth + 1);
      if (mockSub && typeof mockSub === 'object' && !Array.isArray(mockSub)) {
        Object.assign(merged, mockSub);
      }
    }
    return Object.keys(merged).length > 0 ? merged : {};
  }

  // 3. Handle oneOf / anyOf
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return mockJsonFromSchema(schema.oneOf[0], depth + 1);
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return mockJsonFromSchema(schema.anyOf[0], depth + 1);
  }

  const type = schema.type || (schema.properties ? 'object' : undefined);

  switch (type) {
    case 'string':
      if (schema.enum && schema.enum.length > 0) return schema.enum[0];
      if (schema.format === 'date-time') return '2026-01-01T00:00:00.000Z';
      if (schema.format === 'date') return '2026-01-01';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      if (schema.format === 'uri') return 'https://example.com';
      return '';

    case 'integer':
    case 'number':
      return 0;

    case 'boolean':
      return false;

    case 'array':
      if (schema.items) {
        const itemMock = mockJsonFromSchema(schema.items, depth + 1);
        return itemMock !== null ? [itemMock] : [];
      }
      return [];

    case 'object':
    default:
      if (schema.properties && typeof schema.properties === 'object') {
        const obj = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = mockJsonFromSchema(propSchema, depth + 1);
        }
        return obj;
      }
      return {};
  }
}

/**
 * Resolve parameter example value
 */
function getParamValue(param) {
  if (param.example !== undefined) return String(param.example);
  if (param.default !== undefined) return String(param.default);
  if (param.schema) {
    if (param.schema.example !== undefined) return String(param.schema.example);
    if (param.schema.default !== undefined) return String(param.schema.default);
  }
  return '';
}

/**
 * Parse servers list and determine base URL + variable suggestion
 */
function extractServersAndBaseUrl(spec, warnings) {
  const servers = Array.isArray(spec.servers) && spec.servers.length > 0 ? spec.servers : [];

  if (servers.length === 0) {
    return {
      servers: [{ url: 'https://api.example.com', description: 'Default Server' }],
      primaryServerUrl: 'https://api.example.com',
      baseUrlVariable: { key: 'baseUrl', value: 'https://api.example.com', description: 'Server base URL' },
    };
  }

  const firstServer = servers[0];
  let primaryUrl = firstServer.url || 'https://api.example.com';

  // Resolve server variables in URL if defined: e.g. {env} -> default value
  if (firstServer.variables && typeof firstServer.variables === 'object') {
    for (const [vKey, vObj] of Object.entries(firstServer.variables)) {
      const defaultVal = vObj?.default || vObj?.enum?.[0] || vKey;
      primaryUrl = primaryUrl.replace(new RegExp(`\\{${vKey}\\}`, 'g'), String(defaultVal));
    }
  }

  // Strip trailing slashes
  primaryUrl = primaryUrl.replace(/\/+$/, '');

  if (servers.length > 1) {
    warnings.push(
      `Specification defines ${servers.length} servers. Defaulted base URL to '${primaryUrl}'. Additional servers preserved in metadata.`
    );
  }

  return {
    servers: servers.map((s) => ({
      url: s.url,
      description: s.description || null,
    })),
    primaryServerUrl: primaryUrl,
    baseUrlVariable: {
      key: 'baseUrl',
      value: primaryUrl,
      description: `OpenAPI server base URL (${firstServer.description || 'Primary'})`,
    },
  };
}

/**
 * Map components.securitySchemes to APIForge supported authentication types
 */
function extractSecuritySchemes(spec, warnings) {
  const securitySchemes = spec.components?.securitySchemes || {};
  const mappedSchemes = new Map();

  for (const [schemeKey, scheme] of Object.entries(securitySchemes)) {
    if (!scheme || typeof scheme !== 'object') continue;

    const type = scheme.type?.toLowerCase();

    if (type === 'http') {
      const httpScheme = scheme.scheme?.toLowerCase();
      if (httpScheme === 'bearer') {
        mappedSchemes.set(schemeKey, {
          type: 'bearer',
          bearer: { token: '{{token}}' },
        });
      } else if (httpScheme === 'basic') {
        mappedSchemes.set(schemeKey, {
          type: 'basic',
          basic: { username: '{{username}}', password: '{{password}}' },
        });
      } else {
        warnings.push(
          `HTTP authentication scheme '${httpScheme}' in security scheme '${schemeKey}' is not directly mapped. Defaulting to none.`
        );
      }
    } else if (type === 'apikey') {
      const inLocation = scheme.in?.toLowerCase() === 'query' ? 'query' : 'header';
      mappedSchemes.set(schemeKey, {
        type: 'api-key',
        apiKey: {
          key: scheme.name || 'api_key',
          value: '{{apiKey}}',
          addTo: inLocation,
        },
      });
    } else if (type === 'oauth2' || type === 'openidconnect') {
      warnings.push(
        `OAuth2 / OpenID Connect scheme '${schemeKey}' was detected. APIForge does not perform automatic token negotiation; requests will need manual Bearer token or credentials configuration.`
      );
    } else {
      warnings.push(
        `Unsupported security scheme '${schemeKey}' of type '${type}'. Defaulting to none.`
      );
    }
  }

  return mappedSchemes;
}

/**
 * Resolve auth for a specific operation
 */
function resolveOperationAuth(operationSecurity, globalSecurity, mappedSchemes) {
  // 1. Operation-level security
  if (Array.isArray(operationSecurity)) {
    if (operationSecurity.length === 0) {
      return { type: 'none' };
    }
    for (const req of operationSecurity) {
      for (const schemeKey of Object.keys(req)) {
        if (mappedSchemes.has(schemeKey)) {
          return mappedSchemes.get(schemeKey);
        }
      }
    }
  }

  // 2. Global security
  if (Array.isArray(globalSecurity) && globalSecurity.length > 0) {
    for (const req of globalSecurity) {
      for (const schemeKey of Object.keys(req)) {
        if (mappedSchemes.has(schemeKey)) {
          return mappedSchemes.get(schemeKey);
        }
      }
    }
  }

  return { type: 'none' };
}

/**
 * Process requestBody into APIForge body representation
 */
function processRequestBody(requestBody, headers) {
  if (!requestBody || typeof requestBody !== 'object') {
    return { mode: 'none' };
  }

  const content = requestBody.content;
  if (!content || typeof content !== 'object') {
    return { mode: 'none' };
  }

  // Priority: application/json > text/plain > application/x-www-form-urlencoded > multipart/form-data
  if (content['application/json']) {
    const jsonConfig = content['application/json'];
    let examplePayload = jsonConfig.example;

    if (examplePayload === undefined && jsonConfig.examples) {
      const firstKey = Object.keys(jsonConfig.examples)[0];
      examplePayload = jsonConfig.examples[firstKey]?.value;
    }

    if (examplePayload === undefined && jsonConfig.schema) {
      examplePayload = mockJsonFromSchema(jsonConfig.schema);
    }

    // Ensure Content-Type header
    if (!headers.some((h) => h.key.toLowerCase() === 'content-type')) {
      headers.push({
        key: 'Content-Type',
        value: 'application/json',
        enabled: true,
        description: 'Auto-generated for JSON request body',
      });
    }

    return {
      mode: 'json',
      raw: JSON.stringify(examplePayload || {}, null, 2),
    };
  }

  if (content['text/plain']) {
    const textConfig = content['text/plain'];
    const exampleText = textConfig.example || textConfig.schema?.example || textConfig.schema?.default || '';

    if (!headers.some((h) => h.key.toLowerCase() === 'content-type')) {
      headers.push({
        key: 'Content-Type',
        value: 'text/plain',
        enabled: true,
        description: 'Auto-generated for plain text request body',
      });
    }

    return {
      mode: 'text',
      raw: String(exampleText),
    };
  }

  if (content['application/x-www-form-urlencoded']) {
    const formConfig = content['application/x-www-form-urlencoded'];
    const urlencoded = [];

    if (formConfig.schema?.properties) {
      for (const [key, prop] of Object.entries(formConfig.schema.properties)) {
        urlencoded.push({
          key,
          value: String(prop.example ?? prop.default ?? ''),
          enabled: true,
          description: prop.description || '',
        });
      }
    }

    if (!headers.some((h) => h.key.toLowerCase() === 'content-type')) {
      headers.push({
        key: 'Content-Type',
        value: 'application/x-www-form-urlencoded',
        enabled: true,
        description: 'Auto-generated for form-urlencoded request body',
      });
    }

    return {
      mode: 'x-www-form-urlencoded',
      urlencoded,
    };
  }

  if (content['multipart/form-data']) {
    if (!headers.some((h) => h.key.toLowerCase() === 'content-type')) {
      headers.push({
        key: 'Content-Type',
        value: 'multipart/form-data',
        enabled: true,
        description: 'Auto-generated for multipart request body',
      });
    }

    return {
      mode: 'form-data',
    };
  }

  return { mode: 'none' };
}

/**
 * Generate a normalized, deterministic import plan from an OpenAPI document
 * without writing anything to the database.
 *
 * @param {string|object} rawInput
 * @returns {Promise<object>}
 */
export async function generateImportPlan(rawInput) {
  const parsed = parseDocument(rawInput);
  const spec = await dereferenceSpec(parsed);

  const warnings = [];

  // 1. Metadata
  const metadata = {
    title: spec.info?.title?.trim() || 'Imported API',
    version: spec.info?.version?.trim() || '1.0.0',
    description: spec.info?.description?.trim() || null,
    openApiVersion: spec.openapi,
    totalOperations: 0,
  };

  // 2. Servers & Base URL
  const { servers, primaryServerUrl, baseUrlVariable } = extractServersAndBaseUrl(spec, warnings);

  // 3. Security Schemes
  const mappedSchemes = extractSecuritySchemes(spec, warnings);

  // 4. Paths & Operations
  const requests = [];
  const foldersMap = new Map(); // folderName -> description

  const paths = spec.paths || {};

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const pathLevelParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of SUPPORTED_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;

      metadata.totalOperations++;

      // Merge path-level and operation-level parameters
      const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
      const paramMap = new Map();

      // Path-level parameters first
      for (const p of pathLevelParams) {
        if (p && p.name && p.in) {
          paramMap.set(`${p.in}:${p.name}`, p);
        }
      }

      // Operation-level parameters override path-level parameters
      for (const p of opParams) {
        if (p && p.name && p.in) {
          paramMap.set(`${p.in}:${p.name}`, p);
        }
      }

      const queryParams = [];
      const headers = [];

      for (const param of paramMap.values()) {
        const inLoc = param.in?.toLowerCase();
        if (inLoc === 'query') {
          queryParams.push({
            key: param.name,
            value: getParamValue(param),
            enabled: true,
            description: param.description || '',
          });
        } else if (inLoc === 'header') {
          headers.push({
            key: param.name,
            value: getParamValue(param),
            enabled: true,
            description: param.description || '',
          });
        } else if (inLoc === 'cookie') {
          headers.push({
            key: 'Cookie',
            value: `${param.name}=${getParamValue(param)}`,
            enabled: true,
            description: `Cookie parameter: ${param.name}`,
          });
        }
      }

      // Request Body
      const body = processRequestBody(operation.requestBody, headers);

      // Authentication
      const auth = resolveOperationAuth(
        operation.security,
        spec.security,
        mappedSchemes
      );

      // Request Name determination
      let requestName = '';
      if (operation.operationId && typeof operation.operationId === 'string') {
        requestName = operation.operationId.trim();
      } else if (operation.summary && typeof operation.summary === 'string') {
        requestName = operation.summary.trim();
      } else {
        requestName = `${method.toUpperCase()} ${pathKey}`;
      }

      // Folder / Tag resolution
      let folderName = null;
      if (Array.isArray(operation.tags) && operation.tags.length > 0) {
        folderName = String(operation.tags[0]).trim();
        if (!foldersMap.has(folderName)) {
          // Look for tag description in spec.tags
          const tagInfo = Array.isArray(spec.tags)
            ? spec.tags.find((t) => t.name === folderName)
            : null;
          foldersMap.set(folderName, tagInfo?.description || null);
        }
      }

      // Format clean URL with {{baseUrl}} prefix and path parameter placeholders intact
      const normalizedPath = pathKey.startsWith('/') ? pathKey : `/${pathKey}`;
      const url = `{{baseUrl}}${normalizedPath}`;

      requests.push({
        name: requestName,
        method: method.toUpperCase(),
        url,
        folderName,
        queryParams,
        headers,
        auth,
        body,
        settings: {
          timeoutMs: 30000,
          followRedirects: true,
        },
      });
    }
  }

  const folders = Array.from(foldersMap.entries()).map(([name, description]) => ({
    name,
    description,
  }));

  return {
    metadata,
    servers,
    variables: [baseUrlVariable],
    collection: {
      name: metadata.title,
      description: metadata.description,
    },
    folders,
    requests,
    warnings,
  };
}

/**
 * Import OpenAPI specification and persist resources inside an atomic database transaction.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string|object} params.document
 * @param {string} [params.collectionId]
 * @param {string} [params.collectionName]
 * @param {string} [params.folderId]
 * @returns {Promise<object>}
 */
export async function importOpenApi({
  workspaceId,
  document,
  collectionId,
  collectionName,
  folderId,
}) {
  const plan = await generateImportPlan(document);

  return prisma.$transaction(async (tx) => {
    // 1. Destination Collection Resolution
    let targetCollection = null;

    if (collectionId) {
      targetCollection = await tx.collection.findFirst({
        where: {
          id: collectionId,
          workspaceId,
        },
      });

      if (!targetCollection) {
        throw new AppError('Target collection not found in this workspace', 404);
      }
    } else {
      // Calculate next sequential position for collection
      const agg = await tx.collection.aggregate({
        where: { workspaceId },
        _max: { position: true },
      });
      const nextPosition = (agg._max?.position ?? -1) + 1;

      targetCollection = await tx.collection.create({
        data: {
          workspaceId,
          name: collectionName?.trim() || plan.metadata.title || 'Imported API',
          description: plan.metadata.description || null,
          position: nextPosition,
        },
      });
    }

    // 2. Folders Resolution
    const folderIdMap = new Map(); // folderName -> folderId

    if (folderId) {
      // Verify folder belongs to target collection
      const existingFolder = await tx.folder.findFirst({
        where: {
          id: folderId,
          collectionId: targetCollection.id,
        },
      });

      if (!existingFolder) {
        throw new AppError('Target folder not found in this collection', 404);
      }

      // All requests will be placed directly into this folder
      for (const f of plan.folders) {
        folderIdMap.set(f.name, existingFolder.id);
      }
    } else {
      // Create or find folders based on tags
      const currentFolderAgg = await tx.folder.aggregate({
        where: {
          collectionId: targetCollection.id,
          parentId: null,
        },
        _max: { position: true },
      });
      let nextFolderPos = (currentFolderAgg._max?.position ?? -1) + 1;

      for (const f of plan.folders) {
        let folder = await tx.folder.findFirst({
          where: {
            collectionId: targetCollection.id,
            name: f.name,
            parentId: null,
          },
        });

        if (!folder) {
          folder = await tx.folder.create({
            data: {
              collectionId: targetCollection.id,
              name: f.name,
              position: nextFolderPos++,
            },
          });
        }

        folderIdMap.set(f.name, folder.id);
      }
    }

    // 3. Requests Creation with deterministic positioning and duplicate name resolution
    const currentReqAgg = await tx.request.aggregate({
      where: { collectionId: targetCollection.id },
      _max: { position: true },
    });
    let nextReqPos = (currentReqAgg._max?.position ?? -1) + 1;

    const nameOccurrenceMap = new Map();
    const createdRequests = [];

    for (const req of plan.requests) {
      let finalName = req.name;
      const count = nameOccurrenceMap.get(req.name) || 0;
      nameOccurrenceMap.set(req.name, count + 1);

      if (count > 0) {
        finalName = `${req.name} (${count + 1})`;
      }

      const targetFolderId = folderId || (req.folderName ? folderIdMap.get(req.folderName) : null);

      const created = await tx.request.create({
        data: {
          collectionId: targetCollection.id,
          folderId: targetFolderId || null,
          name: finalName,
          method: req.method,
          url: req.url,
          queryParams: req.queryParams?.length ? req.queryParams : null,
          headers: req.headers?.length ? req.headers : null,
          auth: req.auth && req.auth.type !== 'none' ? req.auth : null,
          body: req.body && req.body.mode !== 'none' ? req.body : null,
          settings: req.settings || null,
          position: nextReqPos++,
        },
      });

      createdRequests.push(created);
    }

    return {
      collection: targetCollection,
      folderCount: folderIdMap.size,
      requestCount: createdRequests.length,
      warnings: plan.warnings,
    };
  });
}

export default {
  parseDocument,
  dereferenceSpec,
  mockJsonFromSchema,
  generateImportPlan,
  importOpenApi,
};
