import prisma from '../config/database.js';

// ==========================================
// REQUEST VERIFICATION
// ==========================================

/**
 * Verify that a request exists and belongs to the specified workspace
 * @param {string} workspaceId 
 * @param {string} requestId 
 * @returns {Promise<object|null>}
 */
export async function findRequestInWorkspace(workspaceId, requestId) {
  if (!workspaceId || !requestId) return null;
  return prisma.request.findFirst({
    where: {
      id: requestId,
      collection: {
        workspaceId,
      },
    },
    include: {
      collection: true,
    },
  });
}

// ==========================================
// API TEST OPERATIONS
// ==========================================

/**
 * Create a new API test
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function createTest({
  workspaceId,
  requestId,
  name,
  description = null,
  enabled = true,
}) {
  return prisma.apiTest.create({
    data: {
      workspaceId,
      requestId,
      name,
      description: description || null,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    },
    include: {
      assertions: {
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * List tests for a request in a workspace
 * @param {string} workspaceId 
 * @param {string} requestId 
 * @returns {Promise<Array<object>>}
 */
export async function listTestsByRequest(workspaceId, requestId) {
  if (!workspaceId || !requestId) return [];
  return prisma.apiTest.findMany({
    where: {
      workspaceId,
      requestId,
    },
    include: {
      assertions: {
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Find test by ID scoped to workspace and request
 * @param {string} workspaceId 
 * @param {string} requestId 
 * @param {string} testId 
 * @returns {Promise<object|null>}
 */
export async function findTestById(workspaceId, requestId, testId) {
  if (!workspaceId || !requestId || !testId) return null;
  return prisma.apiTest.findFirst({
    where: {
      id: testId,
      workspaceId,
      requestId,
    },
    include: {
      assertions: {
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * Update test definition
 * @param {string} id 
 * @param {object} data 
 * @returns {Promise<object>}
 */
export async function updateTest(id, data) {
  return prisma.apiTest.update({
    where: { id },
    data,
    include: {
      assertions: {
        orderBy: { position: 'asc' },
      },
    },
  });
}

/**
 * Delete a test definition (cascades to assertions)
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteTest(id) {
  return prisma.apiTest.delete({
    where: { id },
  });
}

// ==========================================
// ASSERTION OPERATIONS
// ==========================================

/**
 * Determine the next sequential position for an assertion in a test
 * @param {string} testId 
 * @returns {Promise<number>}
 */
export async function getNextAssertionPosition(testId) {
  const result = await prisma.apiAssertion.aggregate({
    where: { testId },
    _max: { position: true },
  });
  const maxPos = result._max?.position;
  return maxPos !== null && maxPos !== undefined ? maxPos + 1 : 0;
}

/**
 * Create a new assertion within a test
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function createAssertion({
  testId,
  type,
  path = null,
  operator,
  expectedValue = null,
  position = null,
}) {
  const finalPosition =
    position !== null && position !== undefined
      ? Number(position)
      : await getNextAssertionPosition(testId);

  return prisma.apiAssertion.create({
    data: {
      testId,
      type,
      path: path ? path.trim() : null,
      operator,
      expectedValue: expectedValue !== null && expectedValue !== undefined ? String(expectedValue) : null,
      position: finalPosition,
    },
  });
}

/**
 * Find assertion by ID scoped to test
 * @param {string} testId 
 * @param {string} assertionId 
 * @returns {Promise<object|null>}
 */
export async function findAssertionById(testId, assertionId) {
  if (!testId || !assertionId) return null;
  return prisma.apiAssertion.findFirst({
    where: {
      id: assertionId,
      testId,
    },
  });
}

/**
 * Update an assertion definition
 * @param {string} id 
 * @param {object} data 
 * @returns {Promise<object>}
 */
export async function updateAssertion(id, data) {
  return prisma.apiAssertion.update({
    where: { id },
    data,
  });
}

/**
 * Delete an assertion definition
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteAssertion(id) {
  return prisma.apiAssertion.delete({
    where: { id },
  });
}

export default {
  findRequestInWorkspace,
  createTest,
  listTestsByRequest,
  findTestById,
  updateTest,
  deleteTest,
  getNextAssertionPosition,
  createAssertion,
  findAssertionById,
  updateAssertion,
  deleteAssertion,
};

