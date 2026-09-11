import folderRepository from '../../repositories/folder.repository.js';
import collectionRepository from '../../repositories/collection.repository.js';
import { AppError } from '../../utils/appError.js';

/**
 * Format single folder object for API responses
 * @param {object} folder 
 * @returns {object}
 */
export function formatFolderResponse(folder) {
  if (!folder) return null;
  return {
    id: folder.id,
    collectionId: folder.collectionId,
    parentId: folder.parentId,
    name: folder.name,
    position: folder.position,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

/**
 * Convert a flat array of folders into a nested hierarchy tree
 * @param {Array<object>} folders 
 * @returns {Array<object>} Top-level folders with nested children
 */
export function buildFolderTree(folders) {
  const folderMap = new Map();
  const rootFolders = [];

  for (const folder of folders) {
    folderMap.set(folder.id, {
      ...formatFolderResponse(folder),
      children: [],
    });
  }

  for (const folder of folders) {
    const mapped = folderMap.get(folder.id);
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId).children.push(mapped);
    } else {
      rootFolders.push(mapped);
    }
  }

  return rootFolders;
}

/**
 * Create a new folder within a collection
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string|null} [params.parentId]
 * @param {string} params.name
 * @returns {Promise<object>}
 */
export async function createFolder({ workspaceId, collectionId, parentId = null, name }) {
  // Ensure collection belongs to the authenticated workspace
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  // If parentId is specified, ensure parent folder exists in the SAME collection
  if (parentId) {
    const parentFolder = await folderRepository.findByCollectionAndId(collectionId, parentId);
    if (!parentFolder) {
      throw new AppError('Parent folder not found in this collection', 400);
    }
  }

  const folder = await folderRepository.create({
    collectionId,
    parentId: parentId || null,
    name,
  });

  return formatFolderResponse(folder);
}

/**
 * List all folders belonging to a collection
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {boolean} [params.asTree]
 * @returns {Promise<Array<object>>}
 */
export async function listFolders({ workspaceId, collectionId, asTree = false }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const folders = await folderRepository.listForCollection(collectionId);
  if (asTree) {
    return buildFolderTree(folders);
  }
  return folders.map(formatFolderResponse);
}

/**
 * Get a specific folder scoped to workspace and collection
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.folderId
 * @returns {Promise<object>}
 */
export async function getFolder({ workspaceId, collectionId, folderId }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const folder = await folderRepository.findByCollectionAndId(collectionId, folderId);
  if (!folder) {
    throw new AppError('Folder not found in this collection', 404);
  }

  return formatFolderResponse(folder);
}

/**
 * Update folder metadata and validate parent hierarchy (preventing cycles)
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.folderId
 * @param {object} params.updateData
 * @returns {Promise<object>}
 */
export async function updateFolder({ workspaceId, collectionId, folderId, updateData }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const folder = await folderRepository.findByCollectionAndId(collectionId, folderId);
  if (!folder) {
    throw new AppError('Folder not found in this collection', 404);
  }

  // Validate parent hierarchy if parentId is being updated
  if (updateData.parentId !== undefined) {
    if (updateData.parentId === folderId) {
      throw new AppError('A folder cannot be its own parent', 400);
    }

    if (updateData.parentId !== null) {
      const parent = await folderRepository.findByCollectionAndId(collectionId, updateData.parentId);
      if (!parent) {
        throw new AppError('Parent folder not found in this collection', 400);
      }

      // Cycle detection: walk up parent's ancestors to verify folderId is not an ancestor
      let currentParentId = updateData.parentId;
      let depth = 0;
      while (currentParentId && depth < 50) {
        if (currentParentId === folderId) {
          throw new AppError('Cannot move a folder into one of its descendants', 400);
        }
        const ancestor = await folderRepository.findById(currentParentId);
        if (!ancestor) break;
        currentParentId = ancestor.parentId;
        depth++;
      }
    }
  }

  const updated = await folderRepository.update(folderId, updateData);
  return formatFolderResponse(updated);
}

/**
 * Delete a folder (cascades to all descendants)
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.collectionId
 * @param {string} params.folderId
 * @returns {Promise<boolean>}
 */
export async function deleteFolder({ workspaceId, collectionId, folderId }) {
  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  const folder = await folderRepository.findByCollectionAndId(collectionId, folderId);
  if (!folder) {
    throw new AppError('Folder not found in this collection', 404);
  }

  await folderRepository.deleteFolder(folderId);
  return true;
}

export default {
  formatFolderResponse,
  buildFolderTree,
  createFolder,
  listFolders,
  getFolder,
  updateFolder,
  deleteFolder,
};

