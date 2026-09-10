import { userRepository } from '../../repositories/user.repository.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { AppError } from '../../utils/appError.js';

export const authService = {
  async register({ email, password, name }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email already in use', 400);
    }
    const hashedPassword = await passwordService.hash(password);
    const user = await userRepository.create({ email, password: hashedPassword, name });
    const token = tokenService.generateToken({ id: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    const valid = await passwordService.compare(password, user.password);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }
    const token = tokenService.generateToken({ id: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  },

  async getCurrentUser(id) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError('User not found', 404);
    return { id: user.id, email: user.email, name: user.name };
  },
};

export default authService;
