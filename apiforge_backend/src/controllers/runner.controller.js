import { asyncHandler } from '../utils/asyncHandler.js';
import collectionRunnerService from '../services/runner/collection-runner.service.js';
import { env } from '../config/env.js';

/**
 * Execute collection runner
 * POST /api/workspaces/:workspaceId/collections/:collectionId/run
 */
export const runCollection = asyncHandler(async (req, res) => {
  const allowLocalTargets =
    (process.env.NODE_ENV === 'test' && req.body?._allowLocalTargets === true) ||
    env.ALLOW_LOCAL_TARGETS;

  const result = await collectionRunnerService.runCollection({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    requestIds: req.body?.requestIds,
    folderIds: req.body?.folderIds,
    environmentId: req.body?.environmentId,
    runtimeVariables: req.body?.runtimeVariables,
    variables: req.body?.variables,
    stopOnError: req.body?.stopOnError,
    allowLocalTargets,
  });

  res.status(200).json({
    success: true,
    message: 'Collection run completed',
    data: {
      run: result,
      summary: result.summary,
      results: result.results,
      metadata: result.metadata,
    },
  });
});

export default {
  runCollection,
};
