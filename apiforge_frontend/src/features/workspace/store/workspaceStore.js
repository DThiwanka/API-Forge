const workspaceStore = {
  currentWorkspace: { id: 'default', name: 'Default Workspace' },
  getCurrentWorkspace() {
    return this.currentWorkspace;
  },
  setCurrentWorkspace(ws) {
    this.currentWorkspace = ws;
  },
};

export default workspaceStore;
