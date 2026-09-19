import { performance } from 'node:perf_hooks';
import requestRepository from '../../repositories/request.repository.js';
import collectionRepository from '../../repositories/collection.repository.js';
import environmentRepository from '../../repositories/environment.repository.js';
import historyService, { classifyExecutionError } from '../history/history.service.js';
import { prepareExecutableRequest } from '../requests/request-transform.service.js';
import { resolveTimeout } from './timeout.service.js';
import httpClientService from './http-client.service.js';
import { AppError } from '../../utils/appError.js';
import { redactUrl, redactErrorMessage } from '../../utils/redaction.js';

/**
 * Execute a stored API request definition with optional runtime variables
 * 
 * @param {object} params
 * @param {string} params.workspaceId - Workspace context
 * @param {string} params.collectionId - Collection context
 * @param {string} params.requestId - Request definition ID
 * @param {Record<string, any>} [params.variables={}] - Runtime variables map
 * @param {boolean} [params.allowLocalTargets=false] - Testing override
 * @returns {Promise<{ request: object, response: object }>}
 */
export async function executeRequest({
  workspaceId,
  collectionId,
  requestId,
  environmentId = null,
  variables = {},
  allowLocalTargets = false,
}) {
  // 1. Verify collection ownership within workspace
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  // 2. Retrieve request definition scoped to collection
  const request = await requestRepository.findByCollectionAndId(collectionId, requestId);
  if (!request) {
    throw new AppError('Request not found in this collection', 404);
  }

  // 3. Resolve active or explicitly specified environment variables and merge with runtime variables
  // Precedence: runtime variables > environment variables
  let targetEnv = null;
  if (environmentId) {
    targetEnv = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId, true);
    if (!targetEnv) {
      throw new AppError('Selected environment not found in this workspace', 404);
    }
  } else {
    targetEnv = await environmentRepository.getActiveEnvironment(workspaceId);
  }

  const envVariables = {};
  const secretValues = [];
  if (targetEnv && Array.isArray(targetEnv.variables)) {
    for (const v of targetEnv.variables) {
      envVariables[v.key] = v.value;
      if (v.isSecret && v.value) {
        secretValues.push(v.value);
      }
    }
  }

  const mergedVariables = {
    ...envVariables,
    ...(variables || {}),
  };

  const startTime = performance.now();
  let prepared;
  let preparedMethod = (request.method || 'GET').toUpperCase();
  let preparedUrl = request.url;

  try {
    prepared = prepareExecutableRequest(request, mergedVariables);
    preparedMethod = prepared.method;
    preparedUrl = prepared.url;
  } catch (prepErr) {
    const elapsed = Math.round(performance.now() - startTime);
    await historyService.recordExecution({
      workspaceId,
      collectionId,
      requestId,
      environmentId: targetEnv?.id || null,
      method: preparedMethod,
      url: preparedUrl,
      status: null,
      statusText: null,
      duration: elapsed,
      responseSize: null,
      contentType: null,
      success: false,
      errorType: 'VALIDATION',
      errorMessage: prepErr.message,
      secretValues,
    });
    throw prepErr;
  }

  // 4. Resolve execution timeout
  const timeoutMs = resolveTimeout(prepared.settings?.timeout);
  const followRedirects = prepared.settings?.followRedirects !== false;

  // 5. Outbound HTTP execution
  try {
    const response = await httpClientService.sendRequest({
      method: prepared.method,
      url: prepared.url,
      headers: prepared.headers,
      body: prepared.body,
      timeoutMs,
      followRedirects,
      allowLocalTargets,
    });

    const isSuccess = response.status >= 200 && response.status < 400;

    await historyService.recordExecution({
      workspaceId,
      collectionId,
      requestId,
      environmentId: targetEnv?.id || null,
      method: prepared.method,
      url: response.url || prepared.url,
      status: response.status,
      statusText: response.statusText,
      duration: response.timeMs,
      responseSize: response.sizeBytes,
      contentType: response.contentType,
      success: isSuccess,
      errorType: null,
      errorMessage: null,
      secretValues,
    });

    return {
      request: {
        id: request.id,
        name: request.name,
        method: prepared.method,
        url: redactUrl(prepared.url, secretValues),
      },
      response,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    const errorType = classifyExecutionError(err);
    const safeErrorMessage = redactErrorMessage(err.message, secretValues);

    await historyService.recordExecution({
      workspaceId,
      collectionId,
      requestId,
      environmentId: targetEnv?.id || null,
      method: preparedMethod,
      url: preparedUrl,
      status: null,
      statusText: null,
      duration: elapsed,
      responseSize: null,
      contentType: null,
      success: false,
      errorType,
      errorMessage: safeErrorMessage,
      secretValues,
    });

    err.message = safeErrorMessage;
    throw err;
  }
}

export default {
  executeRequest,
};

