export const browserService = {
  async getNetworkLogs() {
    return [];
  },

  async createSession(config) {
    return { sessionId: 'session_' + Date.now(), config };
  },
};

export default browserService;
