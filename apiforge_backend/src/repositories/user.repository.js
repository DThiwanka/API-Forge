import prisma from '../config/database.js';

/**
 * Find user by email address
 * @param {string} email 
 * @returns {Promise<object|null>}
 */
export async function findByEmail(email) {
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

/**
 * Find user by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Find active user by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findActiveById(id) {
  if (!id) return null;
  return prisma.user.findFirst({
    where: {
      id,
      isActive: true,
    },
  });
}

/**
 * Create a new user
 * @param {object} userData
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} [userData.name]
 * @returns {Promise<object>}
 */
export async function create({ email, password, name = null }) {
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password,
      name: name || null,
    },
  });
}

export default {
  findByEmail,
  findById,
  findActiveById,
  create,
};

