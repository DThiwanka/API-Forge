import { exportToCurl } from '../services/import-export/curl-export.service.js';
import prisma from '../config/database.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Export a saved request definition as an executable cURL command
 * GET /api/workspaces/:workspaceId/requests/:requestId/export/curl
 */
export const exportRequestAsCurl = asyncHandler(async (req, res) => {
  const { workspaceId, requestId } = req.params;

  // Retrieve request definition scoped to workspace
  const request = await prisma.request.findFirst({
    where: {
      id: requestId,
      collection: {
        workspaceId,
      },
    },
  });

  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const exported = exportToCurl(request);

  res.status(200).json({
    success: true,
    data: {
      format: exported.format,
      command: exported.command,
      hasSecrets: exported.hasSecrets,
    },
  });
});

export default {
  exportRequestAsCurl,
};

