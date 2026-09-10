const responseStore = {
  response: null,
  getResponse() {
    return this.response;
  },
  setResponse(res) {
    this.response = res;
  },
};

export default responseStore;
