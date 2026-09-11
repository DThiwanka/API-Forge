import { AppError } from '../utils/appError.js';

const MAX_REQUEST_IDS = 100;
const MAX_FOLDER_IDS = 50;

/**
 * Validate collection runner execution request payload
 * POST /api/workspaces/:workspaceId/collections/:collectionId/run
 */
export function validateCollectionRun(req, res, next) {
  const body = req.body || {};
  const errors = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return next(
      new AppError('Validation failed', 400, [
        { field: 'body', message: 'Request body must be a JSON object' },
      ])
    );
  }

  const { requestIds, folderIds, environmentId, runtimeVariables, variables, stopOnError } = body;

  // 1. Validate requestIds
  if (requestIds !== undefined && requestIds !== null) {
    if (!Array.isArray(requestIds)) {
      errors.push({ field: 'requestIds', message: 'requestIds must be an array of request IDs' });
    } else {
      if (requestIds.length > MAX_REQUEST_IDS) {
        errors.push({
          field: 'requestIds',
          message: `Cannot execute more than ${MAX_REQUEST_IDS} requests per run`,
        });
      }
      for (let i = 0; i < requestIds.length; i++) {
        if (typeof requestIds[i] !== 'string' || !requestIds[i].trim()) {
          errors.push({
            field: `requestIds[${i}]`,
            message: 'Each request ID must be a non-empty string',
          });
          break;
        }
      }
    }
  }

  // 2. Validate folderIds
  if (folderIds !== undefined && folderIds !== null) {
    if (!Array.isArray(folderIds)) {
      errors.push({ field: 'folderIds', message: 'folderIds must be an array of folder IDs' });
    } else {
      if (folderIds.length > MAX_FOLDER_IDS) {
        errors.push({
          field: 'folderIds',
          message: `Cannot specify more than ${MAX_FOLDER_IDS} folders per run`,
        });
      }
      for (let i = 0; i < folderIds.length; i++) {
        if (typeof folderIds[i] !== 'string' || !folderIds[i].trim()) {
          errors.push({
            field: `folderIds[${i}]`,
            message: 'Each folder ID must be a non-empty string',
          });
          break;
        }
      }
    }
  }

  // 3. Validate environmentId
  if (environmentId !== undefined && environmentId !== null && environmentId !== '') {
    if (typeof environmentId !== 'string' || !environmentId.trim()) {
      errors.push({ field: 'environmentId', message: 'environmentId must be a valid string ID' });
    }
  }

  // 4. Validate runtimeVariables / variables
  const vars = runtimeVariables !== undefined ? runtimeVariables : variables;
  if (vars !== undefined && vars !== null) {
    if (typeof vars !== 'object' || Array.isArray(vars)) {
      errors.push({
        field: 'runtimeVariables',
        message: 'runtimeVariables must be a key-value object',
      });
    }
  }

  // 5. Validate stopOnError
  if (stopOnError !== undefined && stopOnError !== null) {
    if (typeof stopOnError !== 'boolean') {
      errors.push({ field: 'stopOnError', message: 'stopOnError must be a boolean' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  // Normalize defaults on req.body
  req.body.stopOnError = Boolean(stopOnError);
  if (requestIds && Array.isArray(requestIds)) {
    req.body.requestIds = requestIds.map((id) => id.trim());
  }
  if (folderIds && Array.isArray(folderIds)) {
    req.body.folderIds = folderIds.map((id) => id.trim());
  }
  if (environmentId && typeof environmentId === 'string') {
    req.body.environmentId = environmentId.trim();
  }

  next();
}

export default {
  validateCollectionRun,
};

