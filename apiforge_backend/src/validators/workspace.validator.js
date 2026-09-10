export const workspaceValidator = {
  validate(body) {
    if (!body.name || !body.name.trim()) return 'Workspace name is required';
    return null;
  },
};

export default workspaceValidator;
