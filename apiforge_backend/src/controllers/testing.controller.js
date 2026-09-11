import testService from '../services/testing/test.service.js';
import env from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new test definition
 * POST /api/v1/workspaces/:workspaceId/requests/:requestId/tests
 */
export const createTest = asyncHandler(async (req, res) => {
  const { workspaceId, requestId } = req.params;
  const test = await testService.createTest({
    workspaceId,
    requestId,
    name: req.body.name,
    description: req.body.description,
    enabled: req.body.enabled,
  });

  res.status(201).json({
    success: true,
    message: 'Test created successfully',
    data: {
      test,
    },
  });
});

/**
 * List all tests for a request
 * GET /api/v1/workspaces/:workspaceId/requests/:requestId/tests
 */
export const listTests = asyncHandler(async (req, res) => {
  const { workspaceId, requestId } = req.params;
  const tests = await testService.listTests({
    workspaceId,
    requestId,
  });

  res.status(200).json({
    success: true,
    data: {
      tests,
    },
  });
});

/**
 * Get test by ID
 * GET /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId
 */
export const getTest = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId } = req.params;
  const test = await testService.getTest({
    workspaceId,
    requestId,
    testId,
  });

  res.status(200).json({
    success: true,
    data: {
      test,
    },
  });
});

/**
 * Update a test definition
 * PATCH /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId
 */
export const updateTest = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId } = req.params;
  const test = await testService.updateTest({
    workspaceId,
    requestId,
    testId,
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Test updated successfully',
    data: {
      test,
    },
  });
});

/**
 * Delete a test definition
 * DELETE /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId
 */
export const deleteTest = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId } = req.params;
  await testService.deleteTest({
    workspaceId,
    requestId,
    testId,
  });

  res.status(200).json({
    success: true,
    message: 'Test deleted successfully',
  });
});

/**
 * Create a new assertion within a test
 * POST /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions
 */
export const createAssertion = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId } = req.params;
  const assertion = await testService.createAssertion({
    workspaceId,
    requestId,
    testId,
    data: req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Assertion created successfully',
    data: {
      assertion,
    },
  });
});

/**
 * Update an assertion definition
 * PATCH /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions/:assertionId
 */
export const updateAssertion = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId, assertionId } = req.params;
  const assertion = await testService.updateAssertion({
    workspaceId,
    requestId,
    testId,
    assertionId,
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Assertion updated successfully',
    data: {
      assertion,
    },
  });
});

/**
 * Delete an assertion definition
 * DELETE /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions/:assertionId
 */
export const deleteAssertion = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId, assertionId } = req.params;
  await testService.deleteAssertion({
    workspaceId,
    requestId,
    testId,
    assertionId,
  });

  res.status(200).json({
    success: true,
    message: 'Assertion deleted successfully',
  });
});

/**
 * Execute a test and evaluate its assertions
 * POST /api/v1/workspaces/:workspaceId/requests/:requestId/tests/:testId/run
 */
export const runTest = asyncHandler(async (req, res) => {
  const { workspaceId, requestId, testId } = req.params;
  const allowLocalTargets =
    (process.env.NODE_ENV === 'test' && req.body?._allowLocalTargets === true) ||
    env.ALLOW_LOCAL_TARGETS;

  const result = await testService.runTest({
    workspaceId,
    requestId,
    testId,
    variables: req.body?.variables || {},
    allowLocalTargets,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export default {
  createTest,
  listTests,
  getTest,
  updateTest,
  deleteTest,
  createAssertion,
  updateAssertion,
  deleteAssertion,
  runTest,
};

