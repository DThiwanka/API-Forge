import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { authService } from '../services/auth/auth.service.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, result, 'User registered successfully');
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    return ApiResponse.success(res, result, 'Login successful');
  }),

  getCurrentUser: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    return ApiResponse.success(res, user);
  }),

  logout: asyncHandler(async (req, res) => {
    return ApiResponse.success(res, null, 'Logged out successfully');
  }),
};

export default authController;
