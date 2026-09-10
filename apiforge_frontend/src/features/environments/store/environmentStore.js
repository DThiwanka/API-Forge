const environmentStore = {
  activeEnvironment: null,
  getActiveEnvironment() {
    return this.activeEnvironment;
  },
  setActiveEnvironment(env) {
    this.activeEnvironment = env;
  },
};

export default environmentStore;
