/**
 * Workspace Roles enum
 */
export const WORKSPACE_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
};

/**
 * Role hierarchy weighting
 * Higher values have higher authority: OWNER > ADMIN > MEMBER > VIEWER
 */
export const ROLE_HIERARCHY = {
  [WORKSPACE_ROLES.OWNER]: 40,
  [WORKSPACE_ROLES.ADMIN]: 30,
  [WORKSPACE_ROLES.MEMBER]: 20,
  [WORKSPACE_ROLES.VIEWER]: 10,
};

/**
 * Check if a given user role meets or exceeds the required minimum role.
 * @param {string} userRole 
 * @param {string} requiredRole 
 * @returns {boolean}
 */
export function hasMinimumRole(userRole, requiredRole) {
  if (!userRole || !requiredRole) return false;
  const userWeight = ROLE_HIERARCHY[userRole] || 0;
  const requiredWeight = ROLE_HIERARCHY[requiredRole] || 0;
  return userWeight >= requiredWeight;
}

export default {
  WORKSPACE_ROLES,
  ROLE_HIERARCHY,
  hasMinimumRole,
};

