import environmentRepository from '../../repositories/environment.repository.js';
import { formatVariable } from './variable.service.js';
import { AppError } from '../../utils/appError.js';

/**
 * Format environment definition for API responses
 * @param {object|null} env 
 * @param {boolean} [includeVariables=false]
 * @returns {object|null}
 */
export function formatEnvironment(env, includeVariables = false) {
  if (!env) return null;
  const result = {
    id: env.id,
    workspaceId: env.workspaceId,
    name: env.name,
    description: env.description,
    isActive: Boolean(env.isActive),
    variableCount: env._count?.variables ?? (Array.isArray(env.variables) ? env.variables.length : 0),
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
  };

  if (includeVariables && Array.isArray(env.variables)) {
    result.variables = env.variables.map(formatVariable);
  }

  return result;
}

/**
 * Create a new environment
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.name
 * @param {string|null} [params.description]
 * @returns {Promise<object>}
 */
export async function createEnvironment({ workspaceId, name, description }) {
  const trimmedName = name.trim();

  // Enforce name uniqueness within workspace
  const existing = await environmentRepository.findByName(workspaceId, trimmedName);
  if (existing) {
    throw new AppError(`Environment '${trimmedName}' already exists in this workspace`, 409, [
      { field: 'name', message: 'Environment name must be unique within workspace' },
    ]);
  }

  const created = await environmentRepository.createEnvironment({
    workspaceId,
    name: trimmedName,
    description,
    isActive: false,
  });

  return formatEnvironment(created);
}

/**
 * List all environments for a workspace
 * @param {string} workspaceId 
 * @returns {Promise<Array<object>>}
 */
export async function listEnvironments(workspaceId) {
  const environments = await environmentRepository.listForWorkspace(workspaceId);
  return environments.map((e) => formatEnvironment(e));
}

/**
 * Get environment by ID with its variables
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @returns {Promise<object>}
 */
export async function getEnvironment({ workspaceId, environmentId }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId, true);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  return formatEnvironment(env, true);
}

/**
 * Update environment metadata
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @param {object} params.updateData
 * @returns {Promise<object>}
 */
export async function updateEnvironment({ workspaceId, environmentId, updateData }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const dataToUpdate = {};

  if (updateData.name !== undefined) {
    const trimmedName = updateData.name.trim();
    if (trimmedName !== env.name) {
      const duplicate = await environmentRepository.findByName(workspaceId, trimmedName);
      if (duplicate) {
        throw new AppError(`Environment '${trimmedName}' already exists in this workspace`, 409, [
          { field: 'name', message: 'Environment name must be unique within workspace' },
        ]);
      }
      dataToUpdate.name = trimmedName;
    }
  }

  if (updateData.description !== undefined) {
    dataToUpdate.description = updateData.description !== null ? updateData.description.trim() : null;
  }

  const updated = await environmentRepository.updateEnvironment(environmentId, dataToUpdate);
  return formatEnvironment(updated);
}

/**
 * Delete environment
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @returns {Promise<boolean>}
 */
export async function deleteEnvironment({ workspaceId, environmentId }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  await environmentRepository.deleteEnvironment(environmentId);
  return true;
}

/**
 * Activate an environment in a workspace (sets all others to inactive)
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @returns {Promise<object>}
 */
export async function activateEnvironment({ workspaceId, environmentId }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const activated = await environmentRepository.activateEnvironment(workspaceId, environmentId);
  return formatEnvironment(activated);
}

/**
 * Internal method: Retrieve unmasked active environment variables dictionary for request execution
 * @param {string} workspaceId 
 * @returns {Promise<Record<string, string>>} Key-value map of raw variable values
 */
export async function getActiveEnvironmentVariables(workspaceId) {
  if (!workspaceId) return {};

  const activeEnv = await environmentRepository.getActiveEnvironment(workspaceId);
  if (!activeEnv || !Array.isArray(activeEnv.variables)) {
    return {};
  }

  const variablesMap = {};
  for (const v of activeEnv.variables) {
    variablesMap[v.key] = v.value;
  }

  return variablesMap;
}

export default {
  formatEnvironment,
  createEnvironment,
  listEnvironments,
  getEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  getActiveEnvironmentVariables,
};

