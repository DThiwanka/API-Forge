import prisma from '../config/database.js';

/**
 * Determine the next available sequential position for a collection in a workspace.
 * @param {string} workspaceId 
 * @returns {Promise<number>}
 */
export async function getNextPosition(workspaceId) {
  const result = await prisma.collection.aggregate({
    where: { workspaceId },
    _max: { position: true },
  });
  const maxPos = result._max?.position;
  return maxPos !== null && maxPos !== undefined ? maxPos + 1 : 0;
}

/**
 * Create a new collection
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.name
 * @param {string} [params.description]
 * @param {number} [params.position]
 * @returns {Promise<object>}
 */
export async function create({ workspaceId, name, description = null, position = null }) {
  const finalPosition =
    position !== null && position !== undefined
      ? position
      : await getNextPosition(workspaceId);

  return prisma.collection.create({
    data: {
      workspaceId,
      name,
      description: description || null,
      position: finalPosition,
    },
  });
}

/**
 * Find collection by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.collection.findUnique({
    where: { id },
  });
}

/**
 * Find collection scoped to a specific workspace
 * @param {string} workspaceId 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findByWorkspaceAndId(workspaceId, id) {
  if (!workspaceId || !id) return null;
  return prisma.collection.findFirst({
    where: {
      id,
      workspaceId,
    },
  });
}

/**
 * List all collections for a workspace, ordered by position
 * @param {string} workspaceId 
 * @returns {Promise<Array<object>>}
 */
export async function listForWorkspace(workspaceId) {
  if (!workspaceId) return [];
  return prisma.collection.findMany({
    where: { workspaceId },
    orderBy: [
      { position: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

/**
 * Update collection metadata
 * @param {string} id 
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function update(id, data) {
  return prisma.collection.update({
    where: { id },
    data,
  });
}

/**
 * Delete a collection (cascades to all contained folders)
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteCollection(id) {
  return prisma.collection.delete({
    where: { id },
  });
}

export default {
  getNextPosition,
  create,
  findById,
  findByWorkspaceAndId,
  listForWorkspace,
  update,
  deleteCollection,
};

