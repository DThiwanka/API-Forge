/**
 * APIForge Global Error Normalization Utility
 * 
 * Maps Axios errors, network failures, and server responses into
 * standardized, user-facing error categories with sanitized messages.
 */

import { redactErrorMessage } from './redaction.js';

export const ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Sanitizes technical messages to prevent leakage of paths, SQL, stack traces, and tokens
 * 
 * @param {string} rawMessage
 * @param {Array<string>} [secretValues=[]]
 * @returns {string} Safe, human-readable message
 */
export function sanitizeErrorMessage(rawMessage = '', secretValues = []) {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return '';
  }

  return redactErrorMessage(rawMessage, secretValues);
}

/**
 * Classifies an error into one of the standardized categories
 * 
 * @param {number} status - HTTP status code
 * @param {string} [message=''] - Error message text
 * @param {string} [code=''] - Error code (e.g., 'ERR_NETWORK', 'ECONNABORTED')
 * @returns {string} Error category
 */
export function classifyApiErrorCategory(status, message = '', code = '') {
  const lowerMsg = (message || '').toLowerCase();
  const upperCode = (code || '').toUpperCase();

  // 1. TIMEOUT
  if (
    status === 504 ||
    upperCode === 'ECONNABORTED' ||
    upperCode === 'ETIMEDOUT' ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timed out')
  ) {
    return ERROR_CATEGORIES.TIMEOUT;
  }

  // 2. NETWORK
  if (
    upperCode === 'ERR_NETWORK' ||
    upperCode === 'ECONNREFUSED' ||
    upperCode === 'ENOTFOUND' ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('cannot connect') ||
    (status === 0 && !status)
  ) {
    return ERROR_CATEGORIES.NETWORK;
  }

  // 3. Status Code Mappings
  if (status === 400) return ERROR_CATEGORIES.VALIDATION;
  if (status === 401) return ERROR_CATEGORIES.AUTHENTICATION;
  if (status === 403) return ERROR_CATEGORIES.AUTHORIZATION;
  if (status === 404) return ERROR_CATEGORIES.NOT_FOUND;
  if (status === 409) return ERROR_CATEGORIES.CONFLICT;
  if (status === 429) return ERROR_CATEGORIES.RATE_LIMITED;
  if (status >= 500 && status <= 599) return ERROR_CATEGORIES.SERVER;

  return ERROR_CATEGORIES.UNKNOWN;
}

/**
 * Normalizes an API or runtime error into a predictable structured object
 * 
 * @param {Error|object|string} error - The caught error
 * @returns {{
 *   category: string,
 *   message: string,
 *   status: number,
 *   fieldErrors: Record<string, string>,
 *   retryable: boolean,
 *   details: object | null
 * }}
 */
export function normalizeApiError(error) {
  if (!error) {
    return {
      category: ERROR_CATEGORIES.UNKNOWN,
      message: 'An unexpected error occurred. Please try again.',
      status: 0,
      fieldErrors: {},
      retryable: false,
      details: null,
    };
  }

  if (typeof error === 'string') {
    const clean = sanitizeErrorMessage(error);
    return {
      category: ERROR_CATEGORIES.UNKNOWN,
      message: clean || 'An unexpected error occurred.',
      status: 0,
      fieldErrors: {},
      retryable: false,
      details: null,
    };
  }

  const responseData = error.response?.data;
  const status = error.response?.status || error.status || 0;
  const code = error.code || '';

  // Extract raw backend message
  const rawBackendMsg =
    responseData?.message ||
    responseData?.error?.message ||
    error.message ||
    '';

  const sanitizedMsg = sanitizeErrorMessage(rawBackendMsg);

  // Classify category
  const category = classifyApiErrorCategory(status, sanitizedMsg, code);

  // Extract field-level errors if present (e.g. validator errors array)
  const fieldErrors = {};
  if (Array.isArray(responseData?.errors)) {
    for (const item of responseData.errors) {
      if (item?.field && item?.message) {
        fieldErrors[item.field] = sanitizeErrorMessage(item.message);
      }
    }
  }

  // Determine user-facing friendly message
  let message = sanitizedMsg;

  // If message is generic, technical, or missing, provide friendly fallback
  const lower = (message || '').toLowerCase();
  const isGeneric =
    !message ||
    message.startsWith('Request failed with status code') ||
    message === 'AxiosError' ||
    lower === 'network error' ||
    lower === 'failed to fetch';

  if (isGeneric) {
    switch (category) {
      case ERROR_CATEGORIES.VALIDATION:
        message = 'Please check your inputs and try again.';
        break;
      case ERROR_CATEGORIES.AUTHENTICATION:
        message = 'Your session has expired. Please sign in again.';
        break;
      case ERROR_CATEGORIES.AUTHORIZATION:
        message = "You don't have permission to perform this action.";
        break;
      case ERROR_CATEGORIES.NOT_FOUND:
        message = 'The requested resource was not found.';
        break;
      case ERROR_CATEGORIES.CONFLICT:
        message = 'A conflicting resource with this name already exists.';
        break;
      case ERROR_CATEGORIES.RATE_LIMITED:
        message = 'Too many requests. Please wait a moment before trying again.';
        break;
      case ERROR_CATEGORIES.NETWORK:
        message = "Couldn't reach APIForge. Check your connection and try again.";
        break;
      case ERROR_CATEGORIES.TIMEOUT:
        message = 'The request timed out. Please try again.';
        break;
      case ERROR_CATEGORIES.SERVER:
        message = "APIForge couldn't complete this operation. Try again.";
        break;
      default:
        message = 'An unexpected error occurred. Please try again.';
        break;
    }
  }

  // Determine if the error is safe to retry
  const retryable =
    category === ERROR_CATEGORIES.NETWORK ||
    category === ERROR_CATEGORIES.TIMEOUT ||
    category === ERROR_CATEGORIES.SERVER ||
    category === ERROR_CATEGORIES.RATE_LIMITED;

  return {
    category,
    message,
    status,
    fieldErrors,
    retryable,
    details: responseData && typeof responseData === 'object' ? { status, errors: responseData.errors } : null,
  };
}

/**
 * Backward-compatible helper for extracting a message string
 * 
 * @param {any} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  return normalizeApiError(error).message;
}

export default getErrorMessage;
