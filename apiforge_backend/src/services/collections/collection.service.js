import collectionRepository from '../../repositories/collection.repository.js';
import { AppError } from '../../utils/appError.js';

/**
 * Format collection for API responses
 * @param {object} collection 
 * @returns {object}
 */
export function formatCollectionResponse(collection) {
  if (!collection) return null;
  return {
    id: collection.id,
    workspaceId: collection.workspaceId,
    name: collection.name,
    description: collection.description,
    position: collection.position,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

/**
 * Create a new collection in a workspace
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.name
 * @param {string} [params.description]
 * @returns {Promise<object>}
 */
export async function createCollection({ workspaceId, name, description }) {
  const collection = await collectionRepository.create({
    workspaceId,
    name,
    description,
  });

  return formatCollectionResponse(collection);
}

/**
 * List all collections for a workspace
 * @param {string} workspaceId 
 * @returns {Promise<Array<object>>}
 */
export async function listCollections(workspaceId) {
  const collections = await collectionRepository.listForWorkspace(workspaceId);
  return collections.map(formatCollectionResponse);
}

/**
 * Get a specific collection scoped to a workspace
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @returns {Promise<object>}
 */
export async function getCollection({ workspaceId, collectionId }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  return formatCollectionResponse(collection);
}

/**
 * Update collection metadata
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {object} params.updateData
 * @returns {Promise<object>}
 */
export async function updateCollection({ workspaceId, collectionId, updateData }) {
  const existing = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!existing) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const updated = await collectionRepository.update(collectionId, updateData);
  return formatCollectionResponse(updated);
}

/**
 * Delete a collection
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @returns {Promise<boolean>}
 */
export async function deleteCollection({ workspaceId, collectionId }) {
  const existing = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!existing) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  await collectionRepository.deleteCollection(collectionId);
  return true;
}

export default {
  formatCollectionResponse,
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
};

