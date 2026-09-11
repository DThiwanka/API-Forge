import { AppError } from '../utils/appError.js';

const MAX_CURL_LENGTH = 100000;

/**
 * Validate cURL preview request payload
 */
export function validateImportCurlPreview(req, res, next) {
  const { curl } = req.body || {};
  const errors = [];

  if (!curl || typeof curl !== 'string' || curl.trim().length === 0) {
    errors.push({ field: 'curl', message: 'cURL command string is required' });
  } else if (curl.length > MAX_CURL_LENGTH) {
    errors.push({
      field: 'curl',
      message: `cURL command exceeds maximum allowed length of ${MAX_CURL_LENGTH} characters`,
    });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.curl = curl.trim();
  next();
}

/**
 * Validate cURL save request payload
 */
export function validateImportCurlSave(req, res, next) {
  const { curl, collectionId, folderId, name } = req.body || {};
  const errors = [];

  if (!curl || typeof curl !== 'string' || curl.trim().length === 0) {
    errors.push({ field: 'curl', message: 'cURL command string is required' });
  } else if (curl.length > MAX_CURL_LENGTH) {
    errors.push({
      field: 'curl',
      message: `cURL command exceeds maximum allowed length of ${MAX_CURL_LENGTH} characters`,
    });
  }

  if (!collectionId || typeof collectionId !== 'string' || collectionId.trim().length === 0) {
    errors.push({ field: 'collectionId', message: 'Target collectionId is required' });
  }

  if (folderId !== undefined && folderId !== null) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      errors.push({ field: 'folderId', message: 'folderId must be a valid ID string or null' });
    }
  }

  if (name !== undefined && name !== null) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Request name cannot be empty' });
    } else if (name.trim().length > 150) {
      errors.push({ field: 'name', message: 'Request name must not exceed 150 characters' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.curl = curl.trim();
  req.body.collectionId = collectionId.trim();
  req.body.folderId = folderId && typeof folderId === 'string' ? folderId.trim() : null;
  if (name !== undefined && name !== null) {
    req.body.name = name.trim();
  }

  next();
}

const MAX_OPENAPI_SIZE = 5000000; // 5 MB

/**
 * Validate OpenAPI preview request payload
 */
export function validateImportOpenApiPreview(req, res, next) {
  const document = req.body?.document ?? req.body?.spec ?? req.body;
  const errors = [];

  if (!document) {
    errors.push({ field: 'document', message: 'OpenAPI specification document is required' });
  } else if (typeof document === 'string') {
    if (document.trim().length === 0) {
      errors.push({ field: 'document', message: 'OpenAPI specification document cannot be empty' });
    } else if (document.length > MAX_OPENAPI_SIZE) {
      errors.push({
        field: 'document',
        message: `OpenAPI document exceeds maximum allowed length of ${MAX_OPENAPI_SIZE} characters`,
      });
    }
  } else if (typeof document !== 'object') {
    errors.push({ field: 'document', message: 'OpenAPI document must be a YAML/JSON string or object' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  // Normalize document to req.body.document
  req.body.document = document;
  next();
}

/**
 * Validate OpenAPI save request payload
 */
export function validateImportOpenApiSave(req, res, next) {
  const { document, collectionId, collectionName, folderId } = req.body || {};
  const doc = document ?? req.body?.spec;
  const errors = [];

  if (!doc) {
    errors.push({ field: 'document', message: 'OpenAPI specification document is required' });
  } else if (typeof doc === 'string') {
    if (doc.trim().length === 0) {
      errors.push({ field: 'document', message: 'OpenAPI specification document cannot be empty' });
    } else if (doc.length > MAX_OPENAPI_SIZE) {
      errors.push({
        field: 'document',
        message: `OpenAPI document exceeds maximum allowed length of ${MAX_OPENAPI_SIZE} characters`,
      });
    }
  } else if (typeof doc !== 'object') {
    errors.push({ field: 'document', message: 'OpenAPI document must be a YAML/JSON string or object' });
  }

  if (collectionId !== undefined && collectionId !== null) {
    if (typeof collectionId !== 'string' || collectionId.trim().length === 0) {
      errors.push({ field: 'collectionId', message: 'collectionId must be a valid non-empty string' });
    }
  }

  if (collectionName !== undefined && collectionName !== null) {
    if (typeof collectionName !== 'string' || collectionName.trim().length === 0) {
      errors.push({ field: 'collectionName', message: 'collectionName must be a valid non-empty string' });
    } else if (collectionName.trim().length > 150) {
      errors.push({ field: 'collectionName', message: 'collectionName must not exceed 150 characters' });
    }
  }

  if (folderId !== undefined && folderId !== null) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      errors.push({ field: 'folderId', message: 'folderId must be a valid non-empty string' });
    }
  }

  const { selectedOperations } = req.body || {};
  if (selectedOperations !== undefined && selectedOperations !== null) {
    if (!Array.isArray(selectedOperations)) {
      errors.push({ field: 'selectedOperations', message: 'selectedOperations must be an array' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.document = doc;
  if (collectionId) req.body.collectionId = collectionId.trim();
  if (collectionName) req.body.collectionName = collectionName.trim();
  if (folderId) req.body.folderId = folderId.trim();
  if (Array.isArray(selectedOperations)) req.body.selectedOperations = selectedOperations;

  next();
}

export default {
  validateImportCurlPreview,
  validateImportCurlSave,
  validateImportOpenApiPreview,
  validateImportOpenApiSave,
};

