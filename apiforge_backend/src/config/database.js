import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

let prisma;

if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else if (env.NODE_ENV === 'test') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

/**
 * Verifies database connectivity safely.
 * Returns connection health status without exposing sensitive database credentials.
 *
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    // Sanitize any database URL / credential that might be in Prisma error message
    const rawMsg = err?.message || 'Database connection check failed';
    const sanitizedMsg = rawMsg.replace(/\/\/[^@]+@/, '//***:***@');
    return {
      ok: false,
      error: sanitizedMsg,
    };
  }
}

export const db = prisma;
export const prismaClient = prisma;
export { prisma };
export default prisma;
