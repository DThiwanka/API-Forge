export const browserSessionService = {
  sessions: new Map(),

  get(sessionId) {
    return this.sessions.get(sessionId);
  },

  set(sessionId, sessionData) {
    this.sessions.set(sessionId, sessionData);
  },

  remove(sessionId) {
    this.sessions.delete(sessionId);
  },
};

export default browserSessionService;
