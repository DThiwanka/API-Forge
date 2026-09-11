import environmentService from '../services/environments/environment.service.js';
import variableService from '../services/environments/variable.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new environment
 * POST /api/workspaces/:workspaceId/environments
 */
export const create = asyncHandler(async (req, res) => {
  const environment = await environmentService.createEnvironment({
    workspaceId: req.workspace.id,
    name: req.body.name,
    description: req.body.description,
  });

  res.status(201).json({
    success: true,
    message: 'Environment created successfully',
    data: {
      environment,
    },
  });
});

/**
 * List all environments in a workspace
 * GET /api/workspaces/:workspaceId/environments
 */
export const list = asyncHandler(async (req, res) => {
  const environments = await environmentService.listEnvironments(req.workspace.id);

  res.status(200).json({
    success: true,
    data: {
      environments,
    },
  });
});

/**
 * Get environment by ID with its variables
 * GET /api/workspaces/:workspaceId/environments/:environmentId
 */
export const getById = asyncHandler(async (req, res) => {
  const environment = await environmentService.getEnvironment({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
  });

  res.status(200).json({
    success: true,
    data: {
      environment,
    },
  });
});

/**
 * Update environment metadata
 * PATCH /api/workspaces/:workspaceId/environments/:environmentId
 */
export const update = asyncHandler(async (req, res) => {
  const environment = await environmentService.updateEnvironment({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
    updateData: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Environment updated successfully',
    data: {
      environment,
    },
  });
});

/**
 * Delete environment
 * DELETE /api/workspaces/:workspaceId/environments/:environmentId
 */
export const deleteEnvironment = asyncHandler(async (req, res) => {
  await environmentService.deleteEnvironment({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
  });

  res.status(200).json({
    success: true,
    message: 'Environment deleted successfully',
  });
});

/**
 * Activate environment in workspace
 * POST /api/workspaces/:workspaceId/environments/:environmentId/activate
 */
export const activate = asyncHandler(async (req, res) => {
  const environment = await environmentService.activateEnvironment({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
  });

  res.status(200).json({
    success: true,
    message: 'Environment activated successfully',
    data: {
      environment,
    },
  });
});

// ==========================================
// VARIABLE HANDLERS
// ==========================================

/**
 * Create a variable in an environment
 * POST /api/workspaces/:workspaceId/environments/:environmentId/variables
 */
export const createVariable = asyncHandler(async (req, res) => {
  const variable = await variableService.createVariable({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
    key: req.body.key,
    value: req.body.value,
    isSecret: req.body.isSecret,
  });

  res.status(201).json({
    success: true,
    message: 'Variable created successfully',
    data: {
      variable,
    },
  });
});

/**
 * List all variables for an environment
 * GET /api/workspaces/:workspaceId/environments/:environmentId/variables
 */
export const listVariables = asyncHandler(async (req, res) => {
  const variables = await variableService.listVariables({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
  });

  res.status(200).json({
    success: true,
    data: {
      variables,
    },
  });
});

/**
 * Get single variable by ID
 * GET /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId
 */
export const getVariableById = asyncHandler(async (req, res) => {
  const variable = await variableService.getVariable({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
    variableId: req.params.variableId,
  });

  res.status(200).json({
    success: true,
    data: {
      variable,
    },
  });
});

/**
 * Update variable
 * PATCH /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId
 */
export const updateVariable = asyncHandler(async (req, res) => {
  const variable = await variableService.updateVariable({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
    variableId: req.params.variableId,
    updateData: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Variable updated successfully',
    data: {
      variable,
    },
  });
});

/**
 * Delete variable
 * DELETE /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId
 */
export const deleteVariable = asyncHandler(async (req, res) => {
  await variableService.deleteVariable({
    workspaceId: req.workspace.id,
    environmentId: req.params.environmentId,
    variableId: req.params.variableId,
  });

  res.status(200).json({
    success: true,
    message: 'Variable deleted successfully',
  });
});

export default {
  create,
  list,
  getById,
  update,
  deleteEnvironment,
  activate,
  createVariable,
  listVariables,
  getVariableById,
  updateVariable,
  deleteVariable,
};

