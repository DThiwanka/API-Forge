export function securityMiddleware(req, res, next) {
  res.removeHeader('X-Powered-By');
  next();
}

export default securityMiddleware;
