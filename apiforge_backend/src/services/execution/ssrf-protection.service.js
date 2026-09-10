import { AppError } from '../../utils/appError.js';

const DISALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];

export const ssrfProtectionService = {
  validateUrl(urlString) {
    if (!urlString) throw new AppError('URL is required', 400);

    try {
      const parsed = new URL(urlString);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new AppError('Only HTTP and HTTPS protocols are allowed', 400);
      }

      if (process.env.NODE_ENV === 'production' && DISALLOWED_HOSTS.includes(parsed.hostname)) {
        throw new AppError('Access to local network resources is forbidden', 403);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Invalid URL format', 400);
    }
  },
};

export default ssrfProtectionService;
