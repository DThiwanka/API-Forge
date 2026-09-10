const authStore = {
  state: {
    user: null,
    token: null,
    isAuthenticated: false,
  },
  getState() {
    return this.state;
  },
  setUser(user, token) {
    this.state = { user, token, isAuthenticated: Boolean(token) };
  },
  logout() {
    this.state = { user: null, token: null, isAuthenticated: false };
  },
};

export default authStore;
