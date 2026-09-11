const uiStore = {
  sidebarOpen: true,
  theme: 'dark',
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  },
  setTheme(theme) {
    this.theme = theme;
  },
};

export default uiStore;
