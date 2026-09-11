import { AppError } from '../utils/appError.js';

const ALLOWED_EXPORT_FORMATS = ['json', 'yaml'];

/**
 * Validate OpenAPI collection export query parameters
 * GET /api/workspaces/:workspaceId/collections/:collectionId/export/openapi?format=json|yaml
 */
export function validateExportOpenApi(req, res, next) {
  const { format } = req.query || {};

  if (format !== undefined && format !== null && format !== '') {
    if (typeof format !== 'string') {
      return next(
        new AppError('Invalid format parameter. Allowed values: "json", "yaml"', 400, [
          { field: 'format', message: 'format must be a string' },
        ])
      );
    }

    const lowerFormat = format.trim().toLowerCase();
    if (!ALLOWED_EXPORT_FORMATS.includes(lowerFormat)) {
      return next(
        new AppError('Invalid format parameter. Allowed values: "json", "yaml"', 400, [
          {
            field: 'format',
            message: `Unsupported export format "${format}". Supported formats: json, yaml`,
          },
        ])
      );
    }

    req.query.format = lowerFormat;
  } else {
    req.query.format = 'json';
  }

  next();
}

export default {
  validateExportOpenApi,
};

