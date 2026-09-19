import { performance } from 'node:perf_hooks';
import prisma from '../../config/database.js';
import requestExecutionService from '../execution/request-execution.service.js';
import environmentRepository from '../../repositories/environment.repository.js';
import { classifyExecutionError } from '../history/history.service.js';
import { extractVariablesFromResponse } from './variable-extraction.service.js';
import assertionRunnerService from '../testing/assertion-runner.service.js';
import { AppError } from '../../utils/appError.js';
import {
  sanitizeAssertionResult,
  redactUrl,
  redactErrorMessage,
} from '../../utils/redaction.js';

/**
 * Determine deterministic execution order of requests across collection and folders
 * Hierarchy:
 * 1. Root folders in position ASC, createdAt ASC order
 *    - For each folder, direct child requests (position ASC, createdAt ASC)
 *    - Followed by child folders (position ASC, createdAt ASC) recursively
 * 2. Root collection requests in position ASC, createdAt ASC order
 *
 * @param {Array<object>} folders 
 * @param {Array<object>} requests 
 * @returns {Array<object>} Flat ordered list of request objects
 */
export function buildDeterministicRequestOrder(folders = [], requests = []) {
  // Group folders by parentId (null = root folders)
  const foldersByParent = new Map();
  for (const f of folders) {
    const pId = f.parentId || null;
    if (!foldersByParent.has(pId)) {
      foldersByParent.set(pId, []);
    }
    foldersByParent.get(pId).push(f);
  }

  // Sort folders at each level by position ASC, then createdAt ASC
  for (const list of foldersByParent.values()) {
    list.sort((a, b) => (a.position - b.position) || (new Date(a.createdAt) - new Date(b.createdAt)));
  }

  // Group requests by folderId (null = collection root requests)
  const requestsByFolder = new Map();
  for (const r of requests) {
    const fId = r.folderId || null;
    if (!requestsByFolder.has(fId)) {
      requestsByFolder.set(fId, []);
    }
    requestsByFolder.get(fId).push(r);
  }

  // Sort requests in each folder / root by position ASC, then createdAt ASC
  for (const list of requestsByFolder.values()) {
    list.sort((a, b) => (a.position - b.position) || (new Date(a.createdAt) - new Date(b.createdAt)));
  }

  const orderedRequests = [];
  const visitedFolders = new Set();

  function traverseFolder(folderId) {
    if (visitedFolders.has(folderId)) {
      return; // Cycle guard
    }
    visitedFolders.add(folderId);

    // 1. Direct requests within this folder
    const folderReqs = requestsByFolder.get(folderId) || [];
    for (const req of folderReqs) {
      orderedRequests.push(req);
    }

    // 2. Child folders recursively
    const childFolders = foldersByParent.get(folderId) || [];
    for (const child of childFolders) {
      traverseFolder(child.id);
    }
  }

  // Traverse all root folders
  const rootFolders = foldersByParent.get(null) || [];
  for (const rootFolder of rootFolders) {
    traverseFolder(rootFolder.id);
  }

  // Traverse collection root requests (no folder)
  const rootRequests = requestsByFolder.get(null) || [];
  for (const rootReq of rootRequests) {
    orderedRequests.push(rootReq);
  }

  return orderedRequests;
}

/**
 * Collect all folder IDs and their recursive descendants
 *
 * @param {Array<string>} targetFolderIds
 * @param {Array<object>} allFolders
 * @returns {Set<string>} Set of all matching folder IDs
 */
export function getAllFolderAndDescendantIds(targetFolderIds, allFolders) {
  const childrenMap = new Map();
  for (const f of allFolders) {
    const pId = f.parentId || null;
    if (!childrenMap.has(pId)) {
      childrenMap.set(pId, []);
    }
    childrenMap.get(pId).push(f.id);
  }

  const result = new Set();
  function collect(id, visited = new Set()) {
    if (visited.has(id)) return;
    visited.add(id);
    result.add(id);
    const children = childrenMap.get(id) || [];
    for (const childId of children) {
      collect(childId, visited);
    }
  }

  for (const fId of targetFolderIds) {
    collect(fId);
  }

  return result;
}

/**
 * Execute a collection run sequentially and deterministically
 *
 * @param {object} params
 * @param {string} params.workspaceId - Workspace ID
 * @param {string} params.collectionId - Collection ID
 * @param {Array<string>} [params.requestIds] - Optional subset of request IDs
 * @param {Array<string>} [params.folderIds] - Optional subset of folder IDs
 * @param {string|null} [params.environmentId] - Optional environment ID
 * @param {Record<string, any>} [params.runtimeVariables={}] - Temporary runtime variables
 * @param {boolean} [params.stopOnError=false] - Whether to halt execution on first failure
 * @param {boolean} [params.allowLocalTargets=false] - Test mode override for SSRF
 * @returns {Promise<object>} Run summary and per-request results
 */
export async function runCollection({
  workspaceId,
  collectionId,
  requestIds,
  folderIds,
  environmentId = null,
  runtimeVariables = {},
  variables = {},
  stopOnError = false,
  allowLocalTargets = false,
  executeTests = true,
}) {
  if (!workspaceId || !collectionId) {
    throw new AppError('workspaceId and collectionId are required', 400);
  }

  // 1. Fetch collection with its folders and requests in a single database query
  const collection = await prisma.collection.findFirst({
    where: {
      id: collectionId,
      workspaceId,
    },
    include: {
      folders: {
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
      },
      requests: {
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          apiTests: {
            where: { enabled: true },
            orderBy: { createdAt: 'asc' },
            include: {
              assertions: {
                orderBy: { position: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  // 2. Validate folderIds selection if provided
  const existingFolderMap = new Map(collection.folders.map((f) => [f.id, f]));
  if (Array.isArray(folderIds) && folderIds.length > 0) {
    for (const fId of folderIds) {
      if (!existingFolderMap.has(fId)) {
        throw new AppError(`Folder not found in this collection: ${fId}`, 404);
      }
    }
  }

  // 3. Validate requestIds selection if provided
  const existingRequestMap = new Map(collection.requests.map((r) => [r.id, r]));
  if (Array.isArray(requestIds) && requestIds.length > 0) {
    for (const rId of requestIds) {
      if (!existingRequestMap.has(rId)) {
        throw new AppError(`Request not found in this collection: ${rId}`, 404);
      }
    }
  }

  // 4. Resolve environment (explicit environment or active workspace environment)
  let targetEnv = null;
  if (environmentId) {
    targetEnv = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId, true);
    if (!targetEnv) {
      throw new AppError('Environment not found in this workspace', 404);
    }
  } else {
    targetEnv = await environmentRepository.getActiveEnvironment(workspaceId);
  }

  const secretValues = [];
  if (targetEnv && Array.isArray(targetEnv.variables)) {
    for (const v of targetEnv.variables) {
      if (v.isSecret && v.value) {
        secretValues.push(v.value);
      }
    }
  }

  // 5. Determine which requests to include
  const hasFolderFilter = Array.isArray(folderIds) && folderIds.length > 0;
  const hasRequestFilter = Array.isArray(requestIds) && requestIds.length > 0;

  const targetRequestIds = new Set();

  if (!hasFolderFilter && !hasRequestFilter) {
    // Entire collection
    for (const r of collection.requests) {
      targetRequestIds.add(r.id);
    }
  } else {
    // Selected folders (including recursive subfolders)
    if (hasFolderFilter) {
      const allSelectedFolderIds = getAllFolderAndDescendantIds(folderIds, collection.folders);
      for (const r of collection.requests) {
        if (r.folderId && allSelectedFolderIds.has(r.folderId)) {
          targetRequestIds.add(r.id);
        }
      }
    }

    // Selected individual requests
    if (hasRequestFilter) {
      for (const rId of requestIds) {
        targetRequestIds.add(rId);
      }
    }
  }

  // 6. Build full deterministic canonical request order and filter to selected requests
  const canonicalOrder = buildDeterministicRequestOrder(collection.folders, collection.requests);
  const plannedRequests = canonicalOrder.filter((req) => targetRequestIds.has(req.id));

  // 7. Execute requests sequentially
  const mergedRuntimeVars = {
    ...(variables || {}),
    ...(runtimeVariables || {}),
  };

  const extractedVariables = {};

  let totalAssertionsAllRequests = 0;
  let passedAssertionsAllRequests = 0;
  let failedAssertionsAllRequests = 0;

  const results = [];
  let stoppedEarly = false;
  let completedCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const runStartTime = performance.now();
  const startedAt = new Date().toISOString();

  for (let i = 0; i < plannedRequests.length; i++) {
    const reqDef = plannedRequests[i];

    if (stoppedEarly) {
      skippedCount++;
      results.push({
        id: reqDef.id,
        requestId: reqDef.id,
        name: reqDef.name,
        requestName: reqDef.name,
        method: reqDef.method,
        url: redactUrl(reqDef.url, secretValues),
        status: null,
        statusText: null,
        duration: 0,
        timeMs: 0,
        sizeBytes: null,
        contentType: null,
        success: false,
        execution: {
          success: false,
        },
        errorType: null,
        errorMessage: null,
        error: null,
        tests: null,
        extraction: null,
        skipped: true,
      });
      continue;
    }

    const reqStart = performance.now();
    try {
      // Merge variables with strict precedence:
      // explicit runtime variables > extracted variables > environment variables
      const currentRunVars = {
        ...extractedVariables,
        ...mergedRuntimeVars,
      };

      const execResult = await requestExecutionService.executeRequest({
        workspaceId,
        collectionId,
        requestId: reqDef.id,
        environmentId: targetEnv?.id || null,
        variables: currentRunVars,
        allowLocalTargets,
      });

      const duration = execResult.response.timeMs || Math.round(performance.now() - reqStart);
      const isHttpSuccess = execResult.response.status >= 200 && execResult.response.status < 400;

      // 1. Evaluate saved API tests if enabled and present
      const savedTests = reqDef.apiTests || reqDef.tests || [];
      const enabledTests = savedTests.filter((t) => t.enabled !== false);

      let testsResult = null;
      let testsFailed = false;
      let itemTotalAssertions = 0;
      let itemPassedAssertions = 0;
      let itemFailedAssertions = 0;

      if (executeTests && enabledTests.length > 0) {
        const testResultsList = [];

        for (const test of enabledTests) {
          const assertions = test.assertions || [];
          const assertionSummary = assertionRunnerService.runAssertions(
            execResult.response,
            assertions
          );

          itemTotalAssertions += assertionSummary.total;
          itemPassedAssertions += assertionSummary.passedCount;
          itemFailedAssertions += assertionSummary.failedCount;

          const sanitizedResults = (assertionSummary.results || []).map((r) =>
            sanitizeAssertionResult(r)
          );

          testResultsList.push({
            id: test.id,
            testId: test.id,
            name: test.name,
            testName: test.name,
            passed: assertionSummary.passed,
            total: assertionSummary.total,
            passedCount: assertionSummary.passedCount,
            failedCount: assertionSummary.failedCount,
            assertions: sanitizedResults,
          });
        }

        testsFailed = itemFailedAssertions > 0;

        testsResult = {
          total: itemTotalAssertions,
          passed: itemPassedAssertions,
          failed: itemFailedAssertions,
          executed: true,
          results: testResultsList,
        };
      } else {
        testsResult = {
          total: 0,
          passed: 0,
          failed: 0,
          executed: executeTests,
          results: [],
        };
      }

      totalAssertionsAllRequests += itemTotalAssertions;
      passedAssertionsAllRequests += itemPassedAssertions;
      failedAssertionsAllRequests += itemFailedAssertions;

      // 2. Evaluate declarative extraction rules if defined on the request
      const extractRules = reqDef.settings?.extract || reqDef.extract || [];
      let extractionResult = null;
      let extractionFailed = false;

      if (Array.isArray(extractRules) && extractRules.length > 0) {
        extractionResult = extractVariablesFromResponse(execResult.response, extractRules);
        if (extractionResult.success) {
          Object.assign(extractedVariables, extractionResult.extractedVariables);
        } else {
          extractionFailed = true;
        }
      }

      // Check if status is explicitly asserted by any test
      const allAssertions = (enabledTests || []).flatMap((t) => t.assertions || []);
      const hasStatusAssertion = allAssertions.some((a) => a.type === 'status');
      const httpAcceptable = hasStatusAssertion ? true : isHttpSuccess;

      const overallSuccess = httpAcceptable && !testsFailed && !extractionFailed;

      completedCount++;
      if (overallSuccess) {
        passedCount++;
      } else {
        failedCount++;
        if (stopOnError) {
          stoppedEarly = true;
        }
      }

      let errorType = null;
      let errorMessage = null;
      if (extractionFailed) {
        errorType = 'EXTRACTION_ERROR';
        errorMessage = extractionResult.error;
      } else if (testsFailed) {
        errorType = 'ASSERTION_ERROR';
        const firstFailed = testsResult.results
          .flatMap((t) => t.assertions)
          .find((a) => !a.passed);
        errorMessage = firstFailed?.message || `${itemFailedAssertions} assertion(s) failed`;
      } else if (!httpAcceptable) {
        errorType = 'HTTP_ERROR';
        errorMessage = `HTTP ${execResult.response.status} ${execResult.response.statusText}`;
      }

      results.push({
        id: reqDef.id,
        requestId: reqDef.id,
        name: reqDef.name,
        requestName: reqDef.name,
        method: execResult.request.method,
        url: redactUrl(execResult.request.url || reqDef.url, secretValues),
        status: execResult.response.status,
        statusText: execResult.response.statusText,
        duration,
        timeMs: duration,
        sizeBytes: execResult.response.sizeBytes,
        contentType: execResult.response.contentType,
        success: overallSuccess,
        execution: {
          success: true,
        },
        errorType,
        errorMessage,
        error: errorType
          ? {
              type: errorType,
              message: errorMessage,
            }
          : null,
        tests: testsResult,
        extraction: extractionResult
          ? {
              success: extractionResult.success,
              variables: extractionResult.variableNames,
              ...(extractionResult.error ? { error: extractionResult.error } : {}),
            }
          : null,
        skipped: false,
      });
    } catch (err) {
      const duration = Math.round(performance.now() - reqStart);
      const errorType = classifyExecutionError(err);
      const safeErrorMessage = redactErrorMessage(err.message, secretValues);
      failedCount++;
      if (stopOnError) {
        stoppedEarly = true;
      }

      results.push({
        id: reqDef.id,
        requestId: reqDef.id,
        name: reqDef.name,
        requestName: reqDef.name,
        method: reqDef.method,
        url: redactUrl(reqDef.url, secretValues),
        status: null,
        statusText: null,
        duration,
        timeMs: duration,
        sizeBytes: null,
        contentType: null,
        success: false,
        execution: {
          success: false,
          error: safeErrorMessage,
        },
        errorType,
        errorMessage: safeErrorMessage,
        error: {
          type: errorType,
          message: safeErrorMessage,
        },
        tests: {
          total: 0,
          passed: 0,
          failed: 0,
          executed: false,
          results: [],
        },
        extraction: null,
        skipped: false,
      });
    }
  }

  const totalDurationMs = Math.round(performance.now() - runStartTime);
  const finishedAt = new Date().toISOString();

  let runStatus = 'COMPLETED';
  if (stoppedEarly) {
    runStatus = 'STOPPED';
  } else if (failedCount > 0) {
    runStatus = 'FAILED';
  }

  const executedRequestsCount = results.filter((r) => !r.skipped).length;

  const summary = {
    total: plannedRequests.length,
    totalRequests: plannedRequests.length,
    completed: completedCount,
    executedRequests: executedRequestsCount,
    passed: passedCount,
    passedRequests: passedCount,
    failed: failedCount,
    failedRequests: failedCount,
    skipped: skippedCount,
    skippedRequests: skippedCount,
    stopped: stoppedEarly,
    durationMs: totalDurationMs,
    totalDurationMs,
    status: runStatus,
    tests: {
      total: totalAssertionsAllRequests,
      passed: passedAssertionsAllRequests,
      failed: failedAssertionsAllRequests,
    },
  };

  const metadata = {
    workspaceId,
    collectionId,
    collectionName: collection.name,
    environmentId: targetEnv?.id || null,
    environmentName: targetEnv?.name || null,
    startedAt,
    finishedAt,
    stopOnError: Boolean(stopOnError),
  };

  return {
    metadata,
    summary,
    results,
  };
}

export default {
  buildDeterministicRequestOrder,
  getAllFolderAndDescendantIds,
  runCollection,
};

