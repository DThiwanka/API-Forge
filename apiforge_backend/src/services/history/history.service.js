import historyRepository from '../../repositories/history.repository.js';
import { AppError } from '../../utils/appError.js';
import { redactUrl, redactErrorMessage, MASKED_TEXT } from '../../utils/redaction.js';

const MASKED_PLACEHOLDER = MASKED_TEXT;

/**
 * Sanitize a target URL by masking passwords, sensitive query params, and secret environment variable values
 * 
 * @param {string} url - Raw or interpolated URL
 * @param {Array<string>} [secretValues=[]] - Raw secret values to mask
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url, secretValues = []) {
  return redactUrl(url, secretValues, MASKED_PLACEHOLDER);
}

/**
 * Classify an execution error into a high-level errorType
 * 
 * @param {Error|any} error 
 * @returns {string} 'TIMEOUT' | 'SECURITY' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN'
 */
export function classifyExecutionError(error) {
  if (!error) return 'UNKNOWN';

  const msg = (error.message || '').toLowerCase();
  const status = error.statusCode || error.status;

  if (
    status === 504 ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    error.name === 'AbortError' ||
    error.code === 'ETIMEDOUT'
  ) {
    return 'TIMEOUT';
  }

  if (
    status === 403 ||
    msg.includes('ssrf') ||
    msg.includes('private ip') ||
    msg.includes('restricted') ||
    msg.includes('blocked') ||
    msg.includes('forbidden target')
  ) {
    return 'SECURITY';
  }

  if (
    status === 502 ||
    msg.includes('failed to connect') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('cannot resolve hostname') ||
    msg.includes('dns resolution failed') ||
    msg.includes('network')
  ) {
    return 'NETWORK';
  }

  if (
    status === 400 ||
    msg.includes('missing required variable') ||
    msg.includes('credentials in url') ||
    msg.includes('invalid url') ||
    msg.includes('unsupported protocol')
  ) {
    return 'VALIDATION';
  }

  return 'UNKNOWN';
}

/**
 * Format execution record for API responses
 * @param {object|null} record 
 * @returns {object|null}
 */
export function formatExecutionRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    collectionId: record.collectionId,
    requestId: record.requestId,
    environmentId: record.environmentId,
    method: record.method,
    url: record.url,
    status: record.status,
    statusText: record.statusText,
    duration: record.duration,
    responseSize: record.responseSize,
    contentType: record.contentType,
    success: Boolean(record.success),
    errorType: record.errorType,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    request: record.request
      ? {
          id: record.request.id,
          name: record.request.name,
        }
      : undefined,
    environment: record.environment
      ? {
          id: record.environment.id,
          name: record.environment.name,
        }
      : undefined,
  };
}

/**
 * Persist an execution record
 * 
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.requestId
 * @param {string|null} [params.environmentId]
 * @param {string} params.method
 * @param {string} params.url
 * @param {number|null} [params.status]
 * @param {string|null} [params.statusText]
 * @param {number|null} [params.duration]
 * @param {number|null} [params.responseSize]
 * @param {string|null} [params.contentType]
 * @param {boolean} [params.success=false]
 * @param {string|null} [params.errorType]
 * @param {string|null} [params.errorMessage]
 * @param {Array<string>} [params.secretValues=[]]
 * @returns {Promise<object|null>} Formatted execution record
 */
export async function recordExecution({
  workspaceId,
  collectionId,
  requestId,
  environmentId = null,
  method,
  url,
  status = null,
  statusText = null,
  duration = null,
  responseSize = null,
  contentType = null,
  success = false,
  errorType = null,
  errorMessage = null,
  secretValues = [],
}) {
  try {
    const sanitizedUrl = sanitizeUrl(url, secretValues);
    const sanitizedErrorMessage = errorMessage
      ? redactErrorMessage(errorMessage, secretValues, MASKED_PLACEHOLDER)
      : null;

    const record = await historyRepository.createExecution({
      workspaceId,
      collectionId,
      requestId,
      environmentId: environmentId || null,
      method: (method || 'GET').toUpperCase(),
      url: sanitizedUrl,
      status: status !== undefined ? status : null,
      statusText: statusText !== undefined ? statusText : null,
      duration: duration !== undefined ? duration : null,
      responseSize: responseSize !== undefined ? responseSize : null,
      contentType: contentType !== undefined ? contentType : null,
      success: Boolean(success),
      errorType: errorType || null,
      errorMessage: sanitizedErrorMessage,
    });

    return formatExecutionRecord(record);
  } catch (err) {
    // Non-blocking: Logging history recording failures must not crash the primary flow
    console.error('Failed to record execution history:', err);
    return null;
  }
}

/**
 * List history records for a workspace
 * 
 * @param {string} workspaceId 
 * @param {object} [query={}]
 * @returns {Promise<{ history: Array<object>, pagination: object }>}
 */
export async function listHistory(workspaceId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  let successFilter;
  if (query.success !== undefined && query.success !== null) {
    if (typeof query.success === 'boolean') {
      successFilter = query.success;
    } else if (query.success === 'true') {
      successFilter = true;
    } else if (query.success === 'false') {
      successFilter = false;
    }
  }

  const result = await historyRepository.listExecutions({
    workspaceId,
    requestId: query.requestId,
    environmentId: query.environmentId,
    status: query.status !== undefined ? Number(query.status) : undefined,
    success: successFilter,
    method: query.method,
    errorType: query.errorType,
    search: query.search ? String(query.search).trim() : undefined,
    startDate: query.startDate,
    endDate: query.endDate,
    page,
    limit,
  });

  return {
    history: result.items.map(formatExecutionRecord),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  };
}

/**
 * Get single history record by ID scoped to workspace
 * 
 * @param {string} workspaceId 
 * @param {string} historyId 
 * @returns {Promise<object>}
 */
export async function getHistoryById(workspaceId, historyId) {
  const record = await historyRepository.findById(workspaceId, historyId);
  if (!record) {
    throw new AppError('Execution history record not found in this workspace', 404);
  }
  return formatExecutionRecord(record);
}

/**
 * Delete single history record by ID scoped to workspace
 * 
 * @param {string} workspaceId 
 * @param {string} historyId 
 * @returns {Promise<boolean>}
 */
export async function deleteHistoryItem(workspaceId, historyId) {
  const record = await historyRepository.findById(workspaceId, historyId);
  if (!record) {
    throw new AppError('Execution history record not found in this workspace', 404);
  }

  await historyRepository.deleteById(workspaceId, historyId);
  return true;
}

/**
 * Clear history for a workspace
 * 
 * @param {string} workspaceId 
 * @param {object} [filters={}]
 * @returns {Promise<{ count: number }>}
 */
export async function clearHistory(workspaceId, filters = {}) {
  return historyRepository.clearWorkspaceHistory(workspaceId, filters);
}

export default {
  sanitizeUrl,
  classifyExecutionError,
  formatExecutionRecord,
  recordExecution,
  listHistory,
  getHistoryById,
  deleteHistoryItem,
  clearHistory,
};

