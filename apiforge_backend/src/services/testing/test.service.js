import { performance } from 'node:perf_hooks';
import testRepository from '../../repositories/test.repository.js';
import requestExecutionService from '../execution/request-execution.service.js';
import assertionRunnerService, {
  ALLOWED_OPERATORS_BY_TYPE,
  ASSERTION_TYPES,
  ASSERTION_OPERATORS,
} from './assertion-runner.service.js';
import { classifyExecutionError } from '../history/history.service.js';
import { AppError } from '../../utils/appError.js';

/**
 * Validate assertion type and operator compatibility
 * @param {string} type 
 * @param {string} operator 
 */
export function validateAssertionTypeAndOperator(type, operator) {
  const allowedOps = ALLOWED_OPERATORS_BY_TYPE[type];
  if (!allowedOps) {
    throw new AppError(`Invalid assertion type '${type}'`, 400);
  }
  if (!allowedOps.has(operator)) {
    throw new AppError(
      `Operator '${operator}' is not valid for assertion type '${type}'. Allowed operators: ${Array.from(allowedOps).join(', ')}`,
      400
    );
  }
}

/**
 * Validate full assertion fields (type, operator, path, expectedValue)
 * @param {string} type 
 * @param {string} operator 
 * @param {string} [path] 
 * @param {any} [expectedValue] 
 */
export function validateAssertionFields(type, operator, path, expectedValue) {
  validateAssertionTypeAndOperator(type, operator);

  if (
    (type === ASSERTION_TYPES.JSON_PATH || type === ASSERTION_TYPES.HEADER) &&
    (!path || typeof path !== 'string' || path.trim().length === 0)
  ) {
    throw new AppError(`Path is required for assertion type '${type}'`, 400);
  }

  const requiresExpectedValue =
    operator !== ASSERTION_OPERATORS.EXISTS && operator !== ASSERTION_OPERATORS.NOT_EXISTS;

  if (requiresExpectedValue && (expectedValue === undefined || expectedValue === null)) {
    throw new AppError(`Expected value is required for operator '${operator}'`, 400);
  }

  const numericOps = [
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
  ];
  if (numericOps.includes(operator)) {
    if (expectedValue === null || expectedValue === undefined || isNaN(Number(expectedValue))) {
      throw new AppError(`Expected value must be a valid number for operator '${operator}'`, 400);
    }
  }
}

/**
 * Create a new API test definition
 */
export async function createTest({
  workspaceId,
  requestId,
  name,
  description = null,
  enabled = true,
}) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  return testRepository.createTest({
    workspaceId,
    requestId,
    name: name.trim(),
    description: description ? description.trim() : null,
    enabled: enabled !== undefined ? Boolean(enabled) : true,
  });
}

/**
 * List all tests for a request
 */
export async function listTests({ workspaceId, requestId }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  return testRepository.listTestsByRequest(workspaceId, requestId);
}

/**
 * Get test by ID
 */
export async function getTest({ workspaceId, requestId, testId }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  return test;
}

/**
 * Update test definition
 */
export async function updateTest({ workspaceId, requestId, testId, data }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  const updateData = {};
  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }
  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }
  if (data.enabled !== undefined) {
    updateData.enabled = Boolean(data.enabled);
  }

  return testRepository.updateTest(testId, updateData);
}

/**
 * Delete test definition
 */
export async function deleteTest({ workspaceId, requestId, testId }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  return testRepository.deleteTest(testId);
}

/**
 * Create a new assertion within a test
 */
export async function createAssertion({ workspaceId, requestId, testId, data }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  const { type, path, operator, expectedValue, position } = data;
  validateAssertionFields(type, operator, path, expectedValue);

  return testRepository.createAssertion({
    testId,
    type,
    path: path ? path.trim() : null,
    operator,
    expectedValue,
    position,
  });
}

/**
 * Update an assertion definition
 */
export async function updateAssertion({ workspaceId, requestId, testId, assertionId, data }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  const assertion = await testRepository.findAssertionById(testId, assertionId);
  if (!assertion) {
    throw new AppError('Assertion not found', 404);
  }

  const targetType = data.type !== undefined ? data.type : assertion.type;
  const targetOperator = data.operator !== undefined ? data.operator : assertion.operator;
  const targetPath = data.path !== undefined ? data.path : assertion.path;
  const targetExpectedValue =
    data.expectedValue !== undefined ? data.expectedValue : assertion.expectedValue;

  validateAssertionFields(targetType, targetOperator, targetPath, targetExpectedValue);

  const updateData = {};
  if (data.type !== undefined) updateData.type = data.type;
  if (data.path !== undefined) updateData.path = data.path ? data.path.trim() : null;
  if (data.operator !== undefined) updateData.operator = data.operator;
  if (data.expectedValue !== undefined) {
    updateData.expectedValue =
      data.expectedValue !== null && data.expectedValue !== undefined
        ? String(data.expectedValue)
        : null;
  }
  if (data.position !== undefined) updateData.position = Number(data.position);

  return testRepository.updateAssertion(assertionId, updateData);
}

/**
 * Delete an assertion definition
 */
export async function deleteAssertion({ workspaceId, requestId, testId, assertionId }) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  const assertion = await testRepository.findAssertionById(testId, assertionId);
  if (!assertion) {
    throw new AppError('Assertion not found', 404);
  }

  return testRepository.deleteAssertion(assertionId);
}

/**
 * Execute an API test and evaluate its assertions against the HTTP response
 */
export async function runTest({
  workspaceId,
  requestId,
  testId,
  variables = {},
  allowLocalTargets = false,
}) {
  const request = await testRepository.findRequestInWorkspace(workspaceId, requestId);
  if (!request) {
    throw new AppError('Request not found in this workspace', 404);
  }

  const test = await testRepository.findTestById(workspaceId, requestId, testId);
  if (!test) {
    throw new AppError('Test not found', 404);
  }

  if (!test.enabled) {
    throw new AppError('Cannot run a disabled test', 400);
  }

  const startTime = performance.now();

  try {
    const executionResult = await requestExecutionService.executeRequest({
      workspaceId,
      collectionId: request.collectionId,
      requestId,
      variables: variables || {},
      allowLocalTargets: Boolean(allowLocalTargets),
    });

    const elapsed = Math.round(performance.now() - startTime);
    const assertionSummary = assertionRunnerService.runAssertions(
      executionResult.response,
      test.assertions || []
    );

    return {
      testId: test.id,
      testName: test.name,
      requestId: test.requestId,
      passed: assertionSummary.passed,
      total: assertionSummary.total,
      passedCount: assertionSummary.passedCount,
      failedCount: assertionSummary.failedCount,
      duration: elapsed,
      response: {
        status: executionResult.response.status,
        statusText: executionResult.response.statusText,
        timeMs: executionResult.response.timeMs,
        sizeBytes: executionResult.response.sizeBytes,
      },
      assertions: assertionSummary.results,
    };
  } catch (err) {
    // If request or collection was missing, preserve 404 AppError
    if (err instanceof AppError && err.statusCode === 404) {
      throw err;
    }

    const elapsed = Math.round(performance.now() - startTime);
    const errorType = classifyExecutionError(err);
    const assertionsList = test.assertions || [];

    return {
      testId: test.id,
      testName: test.name,
      requestId: test.requestId,
      passed: false,
      total: assertionsList.length,
      passedCount: 0,
      failedCount: assertionsList.length,
      duration: elapsed,
      errorType,
      errorMessage: err.message,
      assertions: assertionsList.map((a) => ({
        assertionId: a.id,
        type: a.type,
        path: a.path,
        operator: a.operator,
        passed: false,
        actualValue: null,
        expectedValue: a.expectedValue,
        message: `Request execution failed: ${err.message}`,
      })),
    };
  }
}

export default {
  validateAssertionTypeAndOperator,
  validateAssertionFields,
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

