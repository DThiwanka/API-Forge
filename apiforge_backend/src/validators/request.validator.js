import { isValidHttpMethod, isValidAuthType, isValidBodyMode } from '../constants/httpMethods.js';
import { AppError } from '../utils/appError.js';

/**
 * Validate request creation payload
 */
export function validateCreateRequest(req, res, next) {
  const { name, method, url, folderId, queryParams, headers, auth, body, settings } = req.body || {};
  const errors = [];

  // Validate Name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Request name is required' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Request name must not exceed 150 characters' });
  }

  // Validate Method
  if (!method || typeof method !== 'string') {
    errors.push({ field: 'method', message: 'HTTP method is required' });
  } else if (!isValidHttpMethod(method)) {
    errors.push({ field: 'method', message: `Invalid HTTP method. Allowed: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS` });
  }

  // Validate URL
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    errors.push({ field: 'url', message: 'Request URL is required' });
  }

  // Validate Folder ID
  if (folderId !== undefined && folderId !== null) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      errors.push({ field: 'folderId', message: 'folderId must be a valid ID string or null' });
    }
  }

  // Validate Query Parameters
  if (queryParams !== undefined && queryParams !== null && !Array.isArray(queryParams)) {
    errors.push({ field: 'queryParams', message: 'queryParams must be an array of parameter objects' });
  }

  // Validate Headers
  if (headers !== undefined && headers !== null && !Array.isArray(headers)) {
    errors.push({ field: 'headers', message: 'headers must be an array of header objects' });
  }

  // Validate Auth
  if (auth !== undefined && auth !== null) {
    if (typeof auth !== 'object' || Array.isArray(auth)) {
      errors.push({ field: 'auth', message: 'auth must be an object' });
    } else if (auth.type && !isValidAuthType(auth.type)) {
      errors.push({ field: 'auth.type', message: `Invalid auth type. Allowed: none, bearer, basic, api-key` });
    }
  }

  // Validate Body
  if (body !== undefined && body !== null) {
    if (typeof body !== 'object' || Array.isArray(body)) {
      errors.push({ field: 'body', message: 'body must be an object' });
    } else if (body.mode && !isValidBodyMode(body.mode)) {
      errors.push({ field: 'body.mode', message: `Invalid body mode. Allowed: none, json, text, form-data, x-www-form-urlencoded, raw` });
    }
  }

  // Validate Settings
  if (settings !== undefined && settings !== null) {
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      errors.push({ field: 'settings', message: 'settings must be an object' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.name = name.trim();
  req.body.method = method.trim().toUpperCase();
  req.body.url = url.trim();
  req.body.folderId = folderId && typeof folderId === 'string' ? folderId.trim() : null;

  next();
}

/**
 * Validate request update payload
 */
export function validateUpdateRequest(req, res, next) {
  const { name, method, url, folderId, queryParams, headers, auth, body, settings } = req.body || {};
  const errors = [];

  const fieldsProvided = [name, method, url, folderId, queryParams, headers, auth, body, settings].some(
    (f) => f !== undefined
  );

  if (!fieldsProvided) {
    errors.push({ field: 'body', message: 'At least one field must be provided for update' });
  }

  // Validate Name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Request name cannot be empty' });
    } else if (name.trim().length > 150) {
      errors.push({ field: 'name', message: 'Request name must not exceed 150 characters' });
    }
  }

  // Validate Method if provided
  if (method !== undefined) {
    if (typeof method !== 'string' || !isValidHttpMethod(method)) {
      errors.push({ field: 'method', message: 'Invalid HTTP method' });
    }
  }

  // Validate URL if provided
  if (url !== undefined) {
    if (typeof url !== 'string' || url.trim().length === 0) {
      errors.push({ field: 'url', message: 'Request URL cannot be empty' });
    }
  }

  // Validate Folder ID if provided
  if (folderId !== undefined && folderId !== null) {
    if (typeof folderId !== 'string' || folderId.trim().length === 0) {
      errors.push({ field: 'folderId', message: 'folderId must be a valid ID string or null' });
    }
  }

  // Validate Query Parameters if provided
  if (queryParams !== undefined && queryParams !== null && !Array.isArray(queryParams)) {
    errors.push({ field: 'queryParams', message: 'queryParams must be an array of parameter objects' });
  }

  // Validate Headers if provided
  if (headers !== undefined && headers !== null && !Array.isArray(headers)) {
    errors.push({ field: 'headers', message: 'headers must be an array of header objects' });
  }

  // Validate Auth if provided
  if (auth !== undefined && auth !== null) {
    if (typeof auth !== 'object' || Array.isArray(auth)) {
      errors.push({ field: 'auth', message: 'auth must be an object' });
    } else if (auth.type && !isValidAuthType(auth.type)) {
      errors.push({ field: 'auth.type', message: 'Invalid auth type' });
    }
  }

  // Validate Body if provided
  if (body !== undefined && body !== null) {
    if (typeof body !== 'object' || Array.isArray(body)) {
      errors.push({ field: 'body', message: 'body must be an object' });
    } else if (body.mode && !isValidBodyMode(body.mode)) {
      errors.push({ field: 'body.mode', message: 'Invalid body mode' });
    }
  }

  // Validate Settings if provided
  if (settings !== undefined && settings !== null) {
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      errors.push({ field: 'settings', message: 'settings must be an object' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  if (name !== undefined) req.body.name = name.trim();
  if (method !== undefined) req.body.method = method.trim().toUpperCase();
  if (url !== undefined) req.body.url = url.trim();
  if (folderId !== undefined) {
    req.body.folderId = folderId && typeof folderId === 'string' ? folderId.trim() : null;
  }

  next();
}

export default {
  validateCreateRequest,
  validateUpdateRequest,
};

