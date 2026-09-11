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

export default {
  validateImportCurlPreview,
  validateImportCurlSave,
};

