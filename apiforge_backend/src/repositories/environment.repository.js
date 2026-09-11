import prisma from '../config/database.js';

// ==========================================
// ENVIRONMENT OPERATIONS
// ==========================================

/**
 * Create a new environment
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.name
 * @param {string|null} [params.description]
 * @param {boolean} [params.isActive=false]
 * @returns {Promise<object>}
 */
export async function createEnvironment({
  workspaceId,
  name,
  description = null,
  isActive = false,
}) {
  return prisma.environment.create({
    data: {
      workspaceId,
      name,
      description: description || null,
      isActive,
    },
  });
}

/**
 * Find environment by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.environment.findUnique({
    where: { id },
  });
}

/**
 * Find environment scoped to a specific workspace
 * @param {string} workspaceId 
 * @param {string} id 
 * @param {boolean} [includeVariables=false]
 * @returns {Promise<object|null>}
 */
export async function findByWorkspaceAndId(workspaceId, id, includeVariables = false) {
  if (!workspaceId || !id) return null;
  return prisma.environment.findFirst({
    where: {
      id,
      workspaceId,
    },
    include: includeVariables
      ? {
          variables: {
            orderBy: { createdAt: 'asc' },
          },
        }
      : undefined,
  });
}

/**
 * Find environment by name in a workspace
 * @param {string} workspaceId 
 * @param {string} name 
 * @returns {Promise<object|null>}
 */
export async function findByName(workspaceId, name) {
  if (!workspaceId || !name) return null;
  return prisma.environment.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name,
      },
    },
  });
}

/**
 * List all environments for a workspace
 * @param {string} workspaceId 
 * @returns {Promise<Array<object>>}
 */
export async function listForWorkspace(workspaceId) {
  if (!workspaceId) return [];
  return prisma.environment.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { variables: true },
      },
    },
  });
}

/**
 * Update environment metadata
 * @param {string} id 
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateEnvironment(id, data) {
  return prisma.environment.update({
    where: { id },
    data,
  });
}

/**
 * Delete environment by ID
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteEnvironment(id) {
  return prisma.environment.delete({
    where: { id },
  });
}

/**
 * Atomically activate one environment in a workspace and deactivate all others
 * @param {string} workspaceId 
 * @param {string} environmentId 
 * @returns {Promise<object>} The newly activated environment
 */
export async function activateEnvironment(workspaceId, environmentId) {
  return prisma.$transaction(async (tx) => {
    // 1. Deactivate all environments in the workspace
    await tx.environment.updateMany({
      where: { workspaceId },
      data: { isActive: false },
    });

    // 2. Activate the target environment
    return tx.environment.update({
      where: { id: environmentId },
      data: { isActive: true },
    });
  });
}

/**
 * Get active environment for a workspace with all its variables
 * @param {string} workspaceId 
 * @returns {Promise<object|null>}
 */
export async function getActiveEnvironment(workspaceId) {
  if (!workspaceId) return null;
  return prisma.environment.findFirst({
    where: {
      workspaceId,
      isActive: true,
    },
    include: {
      variables: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// ==========================================
// VARIABLE OPERATIONS
// ==========================================

/**
 * Create a new environment variable
 * @param {object} params
 * @param {string} params.environmentId
 * @param {string} params.key
 * @param {string} params.value
 * @param {boolean} [params.isSecret=false]
 * @returns {Promise<object>}
 */
export async function createVariable({
  environmentId,
  key,
  value,
  isSecret = false,
}) {
  return prisma.environmentVariable.create({
    data: {
      environmentId,
      key,
      value,
      isSecret,
    },
  });
}

/**
 * Find variable by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findVariableById(id) {
  if (!id) return null;
  return prisma.environmentVariable.findUnique({
    where: { id },
  });
}

/**
 * Find variable scoped to an environment
 * @param {string} environmentId 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findVariableByEnvironmentAndId(environmentId, id) {
  if (!environmentId || !id) return null;
  return prisma.environmentVariable.findFirst({
    where: {
      id,
      environmentId,
    },
  });
}

/**
 * Find variable by environment and key
 * @param {string} environmentId 
 * @param {string} key 
 * @returns {Promise<object|null>}
 */
export async function findVariableByEnvironmentAndKey(environmentId, key) {
  if (!environmentId || !key) return null;
  return prisma.environmentVariable.findUnique({
    where: {
      environmentId_key: {
        environmentId,
        key,
      },
    },
  });
}

/**
 * List all variables for an environment
 * @param {string} environmentId 
 * @returns {Promise<Array<object>>}
 */
export async function listVariables(environmentId) {
  if (!environmentId) return [];
  return prisma.environmentVariable.findMany({
    where: { environmentId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Update environment variable
 * @param {string} id 
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateVariable(id, data) {
  return prisma.environmentVariable.update({
    where: { id },
    data,
  });
}

/**
 * Delete environment variable
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteVariable(id) {
  return prisma.environmentVariable.delete({
    where: { id },
  });
}

export default {
  createEnvironment,
  findById,
  findByWorkspaceAndId,
  findByName,
  listForWorkspace,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  getActiveEnvironment,
  createVariable,
  findVariableById,
  findVariableByEnvironmentAndId,
  findVariableByEnvironmentAndKey,
  listVariables,
  updateVariable,
  deleteVariable,
};

