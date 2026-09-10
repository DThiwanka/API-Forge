export const collaborationValidator = {
  validateInvite(body) {
    if (!body.email) return 'Email is required';
    if (!body.workspaceId) return 'Workspace ID is required';
    return null;
  },
};

export default collaborationValidator;
