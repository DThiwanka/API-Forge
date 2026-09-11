import prisma from '../config/database.js';

/**
 * Determine the next sequential position for a request within its collection/folder scope.
 * @param {string} collectionId 
 * @param {string|null} [folderId] 
 * @returns {Promise<number>}
 */
export async function getNextPosition(collectionId, folderId = null) {
  const result = await prisma.request.aggregate({
    where: {
      collectionId,
      folderId: folderId || null,
    },
    _max: { position: true },
  });
  const maxPos = result._max?.position;
  return maxPos !== null && maxPos !== undefined ? maxPos + 1 : 0;
}

/**
 * Create a new request definition
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function create({
  collectionId,
  folderId = null,
  name,
  method = 'GET',
  url,
  queryParams = null,
  headers = null,
  auth = null,
  body = null,
  settings = null,
  position = null,
}) {
  const finalPosition =
    position !== null && position !== undefined
      ? position
      : await getNextPosition(collectionId, folderId);

  return prisma.request.create({
    data: {
      collectionId,
      folderId: folderId || null,
      name,
      method: method.toUpperCase(),
      url,
      queryParams: queryParams || null,
      headers: headers || null,
      auth: auth || null,
      body: body || null,
      settings: settings || null,
      position: finalPosition,
    },
  });
}

/**
 * Find request by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.request.findUnique({
    where: { id },
  });
}

/**
 * Find request scoped to a specific collection
 * @param {string} collectionId 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findByCollectionAndId(collectionId, id) {
  if (!collectionId || !id) return null;
  return prisma.request.findFirst({
    where: {
      id,
      collectionId,
    },
  });
}

/**
 * List requests for a collection, optionally filtered by folder
 * @param {string} collectionId 
 * @param {string|null} [folderId] 
 * @returns {Promise<Array<object>>}
 */
export async function listForCollection(collectionId, folderId = undefined) {
  if (!collectionId) return [];
  const where = { collectionId };

  if (folderId !== undefined) {
    where.folderId = folderId || null;
  }

  return prisma.request.findMany({
    where,
    orderBy: [
      { position: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

/**
 * Update request definition
 * @param {string} id 
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function update(id, data) {
  return prisma.request.update({
    where: { id },
    data,
  });
}

/**
 * Delete a request definition
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteRequest(id) {
  return prisma.request.delete({
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
  deleteRequest,
};

