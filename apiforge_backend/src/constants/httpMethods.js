/**
 * Supported HTTP methods for APIForge request definitions
 */
export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

/**
 * Supported authentication configuration types
 */
export const AUTH_TYPES = [
  'none',
  'bearer',
  'basic',
  'api-key',
];

/**
 * Supported request body modes
 */
export const BODY_MODES = [
  'none',
  'json',
  'text',
  'form-data',
  'x-www-form-urlencoded',
  'raw',
];

/**
 * Validate whether a method is supported
 * @param {string} method 
 * @returns {boolean}
 */
export function isValidHttpMethod(method) {
  if (!method || typeof method !== 'string') return false;
  return HTTP_METHODS.includes(method.toUpperCase());
}

/**
 * Validate whether an authentication type is supported
 * @param {string} authType 
 * @returns {boolean}
 */
export function isValidAuthType(authType) {
  if (!authType || typeof authType !== 'string') return false;
  return AUTH_TYPES.includes(authType.toLowerCase());
}

/**
 * Validate whether a body mode is supported
 * @param {string} bodyMode 
 * @returns {boolean}
 */
export function isValidBodyMode(bodyMode) {
  if (!bodyMode || typeof bodyMode !== 'string') return false;
  return BODY_MODES.includes(bodyMode.toLowerCase());
}

export default {
  HTTP_METHODS,
  AUTH_TYPES,
  BODY_MODES,
  isValidHttpMethod,
  isValidAuthType,
  isValidBodyMode,
};

