import prisma from '../config/database.js';

/**
 * Create a new request execution record
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createExecution(data) {
  return prisma.requestExecution.create({
    data,
    include: {
      request: {
        select: {
          id: true,
          name: true,
        },
      },
      environment: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * List request executions for a workspace with pagination and filters
 * 
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} [params.requestId]
 * @param {string} [params.environmentId]
 * @param {number} [params.status]
 * @param {boolean} [params.success]
 * @param {string} [params.method]
 * @param {string} [params.errorType]
 * @param {string|Date} [params.startDate]
 * @param {string|Date} [params.endDate]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ items: Array<object>, total: number, page: number, limit: number, totalPages: number }>}
 */
export async function listExecutions({
  workspaceId,
  requestId,
  environmentId,
  status,
  success,
  method,
  errorType,
  startDate,
  endDate,
  page = 1,
  limit = 20,
}) {
  const where = { workspaceId };

  if (requestId) {
    where.requestId = requestId;
  }

  if (environmentId !== undefined) {
    where.environmentId = environmentId === null ? null : environmentId;
  }

  if (status !== undefined && status !== null) {
    where.status = Number(status);
  }

  if (success !== undefined && success !== null) {
    where.success = Boolean(success);
  }

  if (method) {
    where.method = method.toUpperCase();
  }

  if (errorType) {
    where.errorType = errorType.toUpperCase();
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const offset = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.requestExecution.count({ where }),
    prisma.requestExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        request: {
          select: {
            id: true,
            name: true,
          },
        },
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Find a specific execution record by ID scoped to workspace
 * @param {string} workspaceId 
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(workspaceId, id) {
  if (!workspaceId || !id) return null;
  return prisma.requestExecution.findFirst({
    where: {
      id,
      workspaceId,
    },
    include: {
      request: {
        select: {
          id: true,
          name: true,
        },
      },
      environment: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Delete a specific execution record scoped to workspace
 * @param {string} workspaceId 
 * @param {string} id 
 * @returns {Promise<{ count: number }>}
 */
export async function deleteById(workspaceId, id) {
  if (!workspaceId || !id) return { count: 0 };
  return prisma.requestExecution.deleteMany({
    where: {
      id,
      workspaceId,
    },
  });
}

/**
 * Clear history executions for a workspace, optionally filtered by request ID
 * @param {string} workspaceId 
 * @param {object} [options={}]
 * @param {string} [options.requestId]
 * @returns {Promise<{ count: number }>}
 */
export async function clearWorkspaceHistory(workspaceId, { requestId } = {}) {
  if (!workspaceId) return { count: 0 };
  const where = { workspaceId };
  if (requestId) {
    where.requestId = requestId;
  }
  return prisma.requestExecution.deleteMany({ where });
}

export default {
  createExecution,
  listExecutions,
  findById,
  deleteById,
  clearWorkspaceHistory,
};

