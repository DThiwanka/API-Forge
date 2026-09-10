import userRepository from '../../repositories/user.repository.js';
import passwordService from './password.service.js';
import tokenService from './token.service.js';
import { AppError } from '../../utils/appError.js';

/**
 * Remove sensitive fields like password from user object
 * @param {object} user 
 * @returns {object} Safe user representation
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Register a new user
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.name]
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function register({ email, password, name }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const hashedPassword = await passwordService.hashPassword(password);
  const newUser = await userRepository.create({
    email,
    password: hashedPassword,
    name,
  });

  const accessToken = tokenService.generateAccessToken(newUser);
  const refreshToken = tokenService.generateRefreshToken(newUser);

  return {
    user: sanitizeUser(newUser),
    accessToken,
    refreshToken,
  };
}

/**
 * Authenticate a user with email and password
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Prevent user enumeration by returning generic error
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 403);
  }

  const isValidPassword = await passwordService.verifyPassword(user.password, password);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = tokenService.generateRefreshToken(user);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access and refresh tokens
 * @param {string} refreshToken 
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  const decoded = tokenService.verifyRefreshToken(refreshToken);
  const user = await userRepository.findActiveById(decoded.sub);

  if (!user) {
    throw new AppError('User not found or inactive', 401);
  }

  const newAccessToken = tokenService.generateAccessToken(user);
  const newRefreshToken = tokenService.generateRefreshToken(user);

  return {
    user: sanitizeUser(user),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Get profile of current user by ID
 * @param {string} userId 
 * @returns {Promise<object>} Safe user profile
 */
export async function getCurrentUser(userId) {
  const user = await userRepository.findActiveById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return sanitizeUser(user);
}

export default {
  sanitizeUser,
  register,
  login,
  refreshTokens,
  getCurrentUser,
};

