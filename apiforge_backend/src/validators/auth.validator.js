export const authValidator = {
  validateRegister(body) {
    if (!body.email) return 'Email is required';
    if (!body.password || body.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  },

  validateLogin(body) {
    if (!body.email) return 'Email is required';
    if (!body.password) return 'Password is required';
    return null;
  },
};

export default authValidator;
