const requestStore = {
  activeRequest: {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: '',
  },
  getActiveRequest() {
    return this.activeRequest;
  },
  setActiveRequest(req) {
    this.activeRequest = req;
  },
};

export default requestStore;
