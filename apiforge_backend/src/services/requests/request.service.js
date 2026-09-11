import requestRepository from '../../repositories/request.repository.js';
import collectionRepository from '../../repositories/collection.repository.js';
import folderRepository from '../../repositories/folder.repository.js';
import { AppError } from '../../utils/appError.js';

/**
 * Format a request definition for API responses
 * @param {object} req 
 * @returns {object}
 */
export function formatRequestResponse(req) {
  if (!req) return null;
  return {
    id: req.id,
    collectionId: req.collectionId,
    folderId: req.folderId,
    name: req.name,
    method: req.method,
    url: req.url,
    queryParams: req.queryParams,
    headers: req.headers,
    auth: req.auth,
    body: req.body,
    settings: req.settings,
    position: req.position,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

/**
 * Create a new request definition
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {object} params.requestData
 * @returns {Promise<object>}
 */
export async function createRequest({ workspaceId, collectionId, requestData }) {
  // Ensure collection belongs to the authenticated workspace
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  // If folderId is provided, verify folder belongs to the SAME collection
  if (requestData.folderId) {
    const folder = await folderRepository.findByCollectionAndId(collectionId, requestData.folderId);
    if (!folder) {
      throw new AppError('Folder not found in this collection', 400);
    }
  }

  const created = await requestRepository.create({
    collectionId,
    ...requestData,
  });

  return formatRequestResponse(created);
}

/**
 * List requests for a collection, optionally filtered by folder
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string|null} [params.folderId]
 * @returns {Promise<Array<object>>}
 */
export async function listRequests({ workspaceId, collectionId, folderId = undefined }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  if (folderId) {
    const folder = await folderRepository.findByCollectionAndId(collectionId, folderId);
    if (!folder) {
      throw new AppError('Folder not found in this collection', 400);
    }
  }

  const requests = await requestRepository.listForCollection(collectionId, folderId);
  return requests.map(formatRequestResponse);
}

/**
 * Get a specific request definition scoped to workspace and collection
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.requestId
 * @returns {Promise<object>}
 */
export async function getRequest({ workspaceId, collectionId, requestId }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const request = await requestRepository.findByCollectionAndId(collectionId, requestId);
  if (!request) {
    throw new AppError('Request not found in this collection', 404);
  }

  return formatRequestResponse(request);
}

/**
 * Update request definition
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.requestId
 * @param {object} params.updateData
 * @returns {Promise<object>}
 */
export async function updateRequest({ workspaceId, collectionId, requestId, updateData }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const request = await requestRepository.findByCollectionAndId(collectionId, requestId);
  if (!request) {
    throw new AppError('Request not found in this collection', 404);
  }

  // If folderId is being modified, verify folder exists in the SAME collection
  if (updateData.folderId !== undefined && updateData.folderId !== null) {
    const folder = await folderRepository.findByCollectionAndId(collectionId, updateData.folderId);
    if (!folder) {
      throw new AppError('Folder not found in this collection', 400);
    }
  }

  const updated = await requestRepository.update(requestId, updateData);
  return formatRequestResponse(updated);
}

/**
 * Delete a request definition
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.requestId
 * @returns {Promise<boolean>}
 */
export async function deleteRequest({ workspaceId, collectionId, requestId }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const request = await requestRepository.findByCollectionAndId(collectionId, requestId);
  if (!request) {
    throw new AppError('Request not found in this collection', 404);
  }

  await requestRepository.deleteRequest(requestId);
  return true;
}

/**
 * Duplicate a saved request definition
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.requestId
 * @returns {Promise<object>}
 */
export async function duplicateRequest({ workspaceId, collectionId, requestId }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const original = await requestRepository.findByCollectionAndId(collectionId, requestId);
  if (!original) {
    throw new AppError('Request not found in this collection', 404);
  }

  const nextPosition = await requestRepository.getNextPosition(collectionId, original.folderId);

  const duplicated = await requestRepository.create({
    collectionId,
    folderId: original.folderId,
    name: `${original.name} Copy`,
    method: original.method,
    url: original.url,
    queryParams: original.queryParams,
    headers: original.headers,
    auth: original.auth,
    body: original.body,
    settings: original.settings,
    position: nextPosition,
  });

  return formatRequestResponse(duplicated);
}

export default {
  formatRequestResponse,
  createRequest,
  listRequests,
  getRequest,
  updateRequest,
  deleteRequest,
  duplicateRequest,
};

