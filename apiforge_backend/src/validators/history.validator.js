import { AppError } from '../utils/appError.js';

/**
 * Validate query parameters for listing execution history
 */
export function validateListHistory(req, res, next) {
  const { page, limit, status, success, startDate, endDate } = req.query;
  const errors = [];

  if (page !== undefined) {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    }
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push({ field: 'limit', message: 'Limit must be an integer between 1 and 100' });
    }
  }

  if (status !== undefined) {
    const statusNum = Number(status);
    if (isNaN(statusNum) || statusNum < 100 || statusNum > 599) {
      errors.push({ field: 'status', message: 'Status must be a valid HTTP status code (100-599)' });
    }
  }

  if (success !== undefined) {
    if (success !== 'true' && success !== 'false' && typeof success !== 'boolean') {
      errors.push({ field: 'success', message: "Success must be 'true' or 'false'" });
    }
  }

  if (startDate !== undefined) {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'startDate', message: 'startDate must be a valid ISO date string' });
    }
  }

  if (endDate !== undefined) {
    const d = new Date(endDate);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'endDate', message: 'endDate must be a valid ISO date string' });
    }
  }

  const { search, method, requestId, environmentId } = req.query;

  if (search !== undefined) {
    if (typeof search !== 'string') {
      errors.push({ field: 'search', message: 'search must be a string' });
    } else if (search.length > 255) {
      errors.push({ field: 'search', message: 'search query must not exceed 255 characters' });
    }
  }

  if (method !== undefined) {
    if (typeof method !== 'string' || method.trim().length === 0) {
      errors.push({ field: 'method', message: 'method must be a non-empty string' });
    }
  }

  if (requestId !== undefined) {
    if (typeof requestId !== 'string' || requestId.trim().length === 0) {
      errors.push({ field: 'requestId', message: 'requestId must be a non-empty string' });
    }
  }

  if (environmentId !== undefined && environmentId !== 'null') {
    if (typeof environmentId !== 'string' || environmentId.trim().length === 0) {
      errors.push({ field: 'environmentId', message: 'environmentId must be a non-empty string' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  next();
}

/**
 * Validate history ID route parameter
 */
export function validateHistoryIdParam(req, res, next) {
  const { historyId } = req.params;

  if (!historyId || typeof historyId !== 'string' || historyId.trim().length === 0) {
    return next(
      new AppError('Validation failed', 400, [
        { field: 'historyId', message: 'Valid historyId parameter is required' },
      ])
    );
  }

  next();
}

/**
 * Validate clear history query parameters
 */
export function validateClearHistory(req, res, next) {
  const { requestId } = req.query;

  if (requestId !== undefined && (typeof requestId !== 'string' || requestId.trim().length === 0)) {
    return next(
      new AppError('Validation failed', 400, [
        { field: 'requestId', message: 'requestId must be a non-empty string' },
      ])
    );
  }

  next();
}

export default {
  validateListHistory,
  validateHistoryIdParam,
  validateClearHistory,
};

