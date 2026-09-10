export function workspaceMiddleware(req, res, next) {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (workspaceId) {
    req.workspaceId = workspaceId;
  }
  next();
}

export default workspaceMiddleware;
