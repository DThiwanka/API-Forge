import requestRepository from '../../repositories/request.repository.js';
import collectionRepository from '../../repositories/collection.repository.js';
import environmentService from '../environments/environment.service.js';
import { prepareExecutableRequest } from '../requests/request-transform.service.js';
import { resolveTimeout } from './timeout.service.js';
import httpClientService from './http-client.service.js';
import { AppError } from '../../utils/appError.js';

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

  // 3. Resolve active environment variables and merge with runtime variables
  // Precedence: runtime variables > active environment variables
  const activeEnvVariables = await environmentService.getActiveEnvironmentVariables(workspaceId);
  const mergedVariables = {
    ...activeEnvVariables,
    ...(variables || {}),
  };

  const prepared = prepareExecutableRequest(request, mergedVariables);

  // 4. Resolve execution timeout
  const timeoutMs = resolveTimeout(prepared.settings?.timeout);
  const followRedirects = prepared.settings?.followRedirects !== false;

  // 5. Outbound HTTP execution
  const response = await httpClientService.sendRequest({
    method: prepared.method,
    url: prepared.url,
    headers: prepared.headers,
    body: prepared.body,
    timeoutMs,
    followRedirects,
    allowLocalTargets,
  });

  return {
    request: {
      id: request.id,
      name: request.name,
      method: prepared.method,
      url: prepared.url,
    },
    response,
  };
}

export default {
  executeRequest,
};

