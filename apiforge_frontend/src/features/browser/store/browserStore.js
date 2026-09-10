const browserStore = {
  requests: [],
  getRequests() {
    return this.requests;
  },
  addRequest(req) {
    this.requests.push(req);
  },
};

export default browserStore;
