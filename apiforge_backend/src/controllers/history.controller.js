import historyService from '../services/history/history.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * List execution history records for a workspace
 * GET /api/workspaces/:workspaceId/history
 */
export const list = asyncHandler(async (req, res) => {
  const result = await historyService.listHistory(req.workspace.id, req.query);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get a specific execution history record
 * GET /api/workspaces/:workspaceId/history/:historyId
 */
export const getById = asyncHandler(async (req, res) => {
  const history = await historyService.getHistoryById(
    req.workspace.id,
    req.params.historyId
  );

  res.status(200).json({
    success: true,
    data: {
      history,
    },
  });
});

/**
 * Delete a specific execution history record
 * DELETE /api/workspaces/:workspaceId/history/:historyId
 */
export const deleteItem = asyncHandler(async (req, res) => {
  await historyService.deleteHistoryItem(
    req.workspace.id,
    req.params.historyId
  );

  res.status(200).json({
    success: true,
    message: 'Execution history record deleted successfully',
  });
});

/**
 * Clear execution history for a workspace
 * DELETE /api/workspaces/:workspaceId/history
 */
export const clear = asyncHandler(async (req, res) => {
  const result = await historyService.clearHistory(req.workspace.id, {
    requestId: req.query.requestId,
  });

  res.status(200).json({
    success: true,
    message: 'Execution history cleared successfully',
    data: {
      count: result.count,
    },
  });
});

export default {
  list,
  getById,
  deleteItem,
  clear,
};

