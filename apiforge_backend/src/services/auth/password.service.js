import argon2 from '@node-rs/argon2';

/**
 * Hash a plain text password using Argon2id.
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} - Hashed password string
 */
export async function hashPassword(password) {
  return argon2.hash(password, {
    algorithm: argon2.Algorithm?.Argon2id ?? 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify a plain text password against an Argon2id hash.
 * @param {string} hash - The stored Argon2id hash
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} - True if match, false otherwise
 */
export async function verifyPassword(hash, password) {
  if (!hash || !password) return false;
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export default {
  hashPassword,
  verifyPassword,
};

