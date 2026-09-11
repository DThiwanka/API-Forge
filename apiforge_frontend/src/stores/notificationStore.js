const notificationStore = {
  notifications: [],
  addNotification(notification) {
    this.notifications.push({ id: Date.now(), ...notification });
  },
  removeNotification(id) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  },
};

export default notificationStore;
