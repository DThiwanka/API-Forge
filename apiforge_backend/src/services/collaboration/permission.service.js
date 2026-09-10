const ROLE_HIERARCHY = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export const permissionService = {
  canPerform(userRole, requiredRole) {
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  },
};

export default permissionService;
