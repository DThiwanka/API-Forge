import environmentRepository from '../../repositories/environment.repository.js';
import { AppError } from '../../utils/appError.js';

export const VARIABLE_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const MASKED_SECRET_VALUE = '••••••••';

/**
 * Format a variable object for API responses, masking secrets
 * @param {object|null} variable 
 * @returns {object|null}
 */
export function formatVariable(variable) {
  if (!variable) return null;
  return {
    id: variable.id,
    environmentId: variable.environmentId,
    key: variable.key,
    value: variable.isSecret ? MASKED_SECRET_VALUE : variable.value,
    isSecret: Boolean(variable.isSecret),
    createdAt: variable.createdAt,
    updatedAt: variable.updatedAt,
  };
}

/**
 * Validate variable key naming rules
 * @param {string} key 
 */
export function validateKeyFormat(key) {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw new AppError('Variable key is required', 400, [
      { field: 'key', message: 'Variable key is required' },
    ]);
  }

  const trimmed = key.trim();
  if (trimmed.length > 100) {
    throw new AppError('Variable key must not exceed 100 characters', 400, [
      { field: 'key', message: 'Variable key must not exceed 100 characters' },
    ]);
  }

  if (!VARIABLE_KEY_REGEX.test(trimmed)) {
    throw new AppError(
      `Invalid variable key '${trimmed}'. Keys must start with a letter or underscore and contain only alphanumeric characters and underscores.`,
      400,
      [{ field: 'key', message: 'Invalid variable key format' }]
    );
  }

  return trimmed;
}

/**
 * Create a new variable in an environment
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @param {string} params.key
 * @param {string} params.value
 * @param {boolean} [params.isSecret=false]
 * @returns {Promise<object>}
 */
export async function createVariable({
  workspaceId,
  environmentId,
  key,
  value,
  isSecret = false,
}) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const validKey = validateKeyFormat(key);

  const existing = await environmentRepository.findVariableByEnvironmentAndKey(environmentId, validKey);
  if (existing) {
    throw new AppError(`Variable key '${validKey}' already exists in this environment`, 409, [
      { field: 'key', message: 'Variable key already exists' },
    ]);
  }

  const created = await environmentRepository.createVariable({
    environmentId,
    key: validKey,
    value: value !== undefined && value !== null ? String(value) : '',
    isSecret: Boolean(isSecret),
  });

  return formatVariable(created);
}

/**
 * List all variables in an environment with secret masking
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @returns {Promise<Array<object>>}
 */
export async function listVariables({ workspaceId, environmentId }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const variables = await environmentRepository.listVariables(environmentId);
  return variables.map(formatVariable);
}

/**
 * Retrieve single variable by ID with secret masking
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @param {string} params.variableId
 * @returns {Promise<object>}
 */
export async function getVariable({ workspaceId, environmentId, variableId }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const variable = await environmentRepository.findVariableByEnvironmentAndId(environmentId, variableId);
  if (!variable) {
    throw new AppError('Variable not found in this environment', 404);
  }

  return formatVariable(variable);
}

/**
 * Update variable definition
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @param {string} params.variableId
 * @param {object} params.updateData
 * @returns {Promise<object>}
 */
export async function updateVariable({
  workspaceId,
  environmentId,
  variableId,
  updateData,
}) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const existingVar = await environmentRepository.findVariableByEnvironmentAndId(environmentId, variableId);
  if (!existingVar) {
    throw new AppError('Variable not found in this environment', 404);
  }

  const dataToUpdate = {};

  if (updateData.key !== undefined) {
    const validKey = validateKeyFormat(updateData.key);
    if (validKey !== existingVar.key) {
      const duplicateKey = await environmentRepository.findVariableByEnvironmentAndKey(environmentId, validKey);
      if (duplicateKey) {
        throw new AppError(`Variable key '${validKey}' already exists in this environment`, 409, [
          { field: 'key', message: 'Variable key already exists' },
        ]);
      }
      dataToUpdate.key = validKey;
    }
  }

  if (updateData.value !== undefined) {
    const stringVal = String(updateData.value);
    const isMaskedValue =
      stringVal === MASKED_SECRET_VALUE ||
      stringVal === '••••••••••••' ||
      stringVal === '[REDACTED]';

    if (existingVar.isSecret && (isMaskedValue || stringVal === '')) {
      // Preserve existing secret value if user left masked dots or blank to indicate unchanged
    } else {
      dataToUpdate.value = stringVal;
    }
  }

  if (updateData.isSecret !== undefined) {
    dataToUpdate.isSecret = Boolean(updateData.isSecret);
  }

  const updated = await environmentRepository.updateVariable(variableId, dataToUpdate);
  return formatVariable(updated);
}

/**
 * Delete variable from an environment
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.environmentId
 * @param {string} params.variableId
 * @returns {Promise<boolean>}
 */
export async function deleteVariable({ workspaceId, environmentId, variableId }) {
  const env = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!env) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  const variable = await environmentRepository.findVariableByEnvironmentAndId(environmentId, variableId);
  if (!variable) {
    throw new AppError('Variable not found in this environment', 404);
  }

  await environmentRepository.deleteVariable(variableId);
  return true;
}

export default {
  formatVariable,
  validateKeyFormat,
  createVariable,
  listVariables,
  getVariable,
  updateVariable,
  deleteVariable,
};

