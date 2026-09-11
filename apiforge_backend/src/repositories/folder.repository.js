import prisma from '../config/database.js';

/**
 * Determine the next available sequential position for a folder within its parent scope.
 * @param {string} collectionId 
 * @param {string|null} parentId 
 * @returns {Promise<number>}
 */
export async function getNextPosition(collectionId, parentId = null) {
  const result = await prisma.folder.aggregate({
    where: {
      collectionId,
      parentId: parentId || null,
    },
    _max: { position: true },
  });
  const maxPos = result._max?.position;
  return maxPos !== null && maxPos !== undefined ? maxPos + 1 : 0;
}

/**
 * Create a new folder
 * @param {object} params
 * @param {string} params.collectionId
 * @param {string|null} [params.parentId]
 * @param {string} params.name
 * @param {number} [params.position]
 * @returns {Promise<object>}
 */
export async function create({ collectionId, parentId = null, name, position = null }) {
  const finalPosition =
    position !== null && position !== undefined
      ? position
      : await getNextPosition(collectionId, parentId);

  return prisma.folder.create({
    data: {
      collectionId,
      parentId: parentId || null,
      name,
      position: finalPosition,
    },
  });
}

/**
 * Find folder by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.folder.findUnique({
    where: { id },
  });
}

/**
 * Find folder scoped to a specific collection
 * @param {string} collectionId 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findByCollectionAndId(collectionId, id) {
  if (!collectionId || !id) return null;
  return prisma.folder.findFirst({
    where: {
      id,
      collectionId,
    },
  });
}

/**
 * List all folders for a collection, ordered by position
 * @param {string} collectionId 
 * @returns {Promise<Array<object>>}
 */
export async function listForCollection(collectionId) {
  if (!collectionId) return [];
  return prisma.folder.findMany({
    where: { collectionId },
    orderBy: [
      { position: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

/**
 * Update folder metadata
 * @param {string} id 
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function update(id, data) {
  return prisma.folder.update({
    where: { id },
    data,
  });
}

/**
 * Delete a folder (cascades to all contained subfolders)
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteFolder(id) {
  return prisma.folder.delete({
    where: { id },
  });
}

export default {
  getNextPosition,
  create,
  findById,
  findByCollectionAndId,
  listForCollection,
  update,
  deleteFolder,
};

