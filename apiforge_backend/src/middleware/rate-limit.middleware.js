const requests = new Map();

export function rateLimitMiddleware(limit = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requests.get(ip) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }

    requests.set(ip, record);

    if (record.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    }

    next();
  };
}

export default rateLimitMiddleware;
