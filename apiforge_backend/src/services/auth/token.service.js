import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export const tokenService = {
  generateToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  },

  verifyToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
  },
};

export default tokenService;
